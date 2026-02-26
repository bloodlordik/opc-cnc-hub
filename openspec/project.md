# Project Context

## Purpose
Production-grade бэкенд-сервис для реального времени (real-time) агрегации телеметрии от промышленных станков и устройств с экспозицией через OPC UA сервер.

## Tech Stack
- Node.js
- TypeScript
- NestJS
- node-opcua
- MQTT
- zod
- TypeOrm
- PostgreSQL

## Project Conventions

### Code Style
2 пробела, одинарные кавычки,trailing commas, максимальная длина строки 100–120

### Architecture Patterns

```
AppModule
├── ConfigModule (global)
├── DatabaseModule
│   └── TypeOrmModule
├── IngestionModule
│   ├── ConfigModule
│   └── EventBufferModule
├── EventBufferModule
│   └── ConfigModule
├── ProcessingModule
│   ├── ConfigModule
│   ├── DatabaseModule
│   ├── DeviceModule
│   └── RuntimeStateModule
├── RuntimeStateModule
├── OpcProjectionModule
│   ├── ConfigModule
│   ├── OpcServerModule
│   └── RuntimeStateModule
├── OpcServerModule
│   └── ConfigModule
├── DeviceTypeModule
│   └── DatabaseModule
├── MessageAdapterModule
│   └── DatabaseModule
├── DeviceModule
│   └── DatabaseModule
├── RuntimeStateAPIModule
│   └── RuntimeStateModule
├── MonitoringModule
├── SecurityModule
│   └── DatabaseModule
├── LoggingModule (global)
├── HealthModule
│   └── MonitoringModule
└── AuditModule
    └── SecurityModule
```

## Поток данных через модули

```
1. IngestionModule
   ↓ CanonicalEvent
2. EventBufferModule
   ↓ CanonicalEvent
3. ProcessingModule
   - ValidationEngineService
   - MessageAdapterService
   - MappingService
   - QualityCalculationService
   ↓ ProcessedMeasurement[]
4. OpcProjectionModule
   - BatcherService
   - ChangeDetectionService
   ↓ ProcessedMeasurement[]
5. OpcServerModule
   ↓ OPC UA AddressSpace
6. OPC Clients
```

## Порядок инициализации модулей

1. `ConfigModule` — Загрузка конфигурации
2. `LoggingModule` — Инициализация логирования
3. `DatabaseModule` — Подключение к PostgreSQL
4. `MessageAdapterModule` — Загрузка адаптеров с диска
5. `DeviceTypeModule` — Загрузка схем типов с диска
6. `RuntimeStateModule` — Инициализация runtime state (in-memory)
7. `OpcServerModule` — Инициализация OPC UA сервера
8. `OpcProjectionModule` — Инициализация OPC projection
9. `ProcessingModule` — Инициализация processing core
10. `EventBufferModule` — Инициализация event buffer
11. `IngestionModule` — Подключение к MQTT брокеру
12. `MonitoringModule` — Запуск сбора метрик
13. `SecurityModule` — Инициализация безопасности

## Порядок shutdown модулей

1. `IngestionModule` — Отключение от MQTT брокера
2. `EventBufferModule` — Дrain event buffer (обработка оставшихся событий)
3. `OpcProjectionModule` — Flush батч, остановка батчинга
4. `ProcessingModule` — Остановка processing core
5. `OpcServerModule` — Остановка OPC UA сервера
6. `RuntimeStateModule` — Очистка runtime state (in-memory)
7. `MonitoringModule` — Остановка сбора метрик
8. `DatabaseModule` — Закрытие соединения с PostgreSQL
9. `LoggingModule` — Закрытие лог файлов
10. `ConfigModule` — Очистка ресурсов

### Testing Strategy
Основное тестрование выполнятся чрез cli команды и написание unit тестов в *.spec.ts файлах для каждого сервиса или контоллера. 
    ```
        pnpm build - проверка типов
        pnpm test - запуск Unit testoв
        pnpm lint - запуск линтинга
    ```
    после написание любого сервиса или контроллера необходимо создать *.spec.ts файл, в котором будут написаны unit тесты.
    - Unit tests: `*.spec.ts` files alongside source files
    - E2E tests: `*.e2e-spec.ts` in `test/` directory
    - Use Jest with `describe()`, `it()`, `beforeEach()`
    - Mock services with NestJS `TestingModule`
    - Expect standard: `expect(result).toBe(expected)` or `.toEqual()`


### Git Workflow
Преред началом внесения каких либо измениний в код необходимо создать отдельную ветку с названием пропозла и переключиться на нее, по завершению работы сделать коммит с названием пропозла и отправить на ветку 

## Domain Context
OPC CNC Hub — это event-driven сервис, агрегирующий данные из различных источников (MQTT, API) и предоставляющий их через стандартный OPC UA сервер в реальном времени. Архитектура базируется на разделении ответственности между ingestion, processing и projection слоями с фокусом на свежие данные.

### Архитектурный стиль

- **Event-Driven Internal Architecture** — асинхронная коммуникация между слоями
- **In-Memory Processing** — работа только со свежими данными, устаревшие не хранятся
- **Single Purpose** — runtime broadcasting, историческими данными занимаются другие сервисы
- **Modular Monolith** — все компоненты в одном сервисе, но с четким разделением

### Ключевые принципы

- 🎯 **Real-Time Focus** — только актуальные данные, устаревшие отбрасываются
- 🔄 **Event-Driven** — асинхронная коммуникация между слоями
- 💾 **In-Memory Only** — все данные обрабатываются в памяти
- 🛡️ **Circuit Breaker** — защита от каскадных сбоев
- 📊 **Observability** — метрики на всех уровнях

### Ограничения

- ❌ **Нет historizing** — историческими данными занимаются внешние сервисы
- ❌ **Нет Kafka** — только in-memory event buffer
- ❌ **Нет персистентности данных** — только runtime state в памяти
- ✅ **Только свежие данные** — важна актуальность, не история
- ✅ **PostgreSQL для конфигурации** — схемы типов и адаптеры загружаются с диска, хранятся в БД
- ✅ **Форматы сообщений** — у каждого станка свой формат, хранится в репозитории адаптеров

### Целевая архитектура (In-Memory Real-Time)

```
┌─────────────────────────────────────────────────────────────────────┐
│                         OPC CNC Hub v2                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                     External Ingest Layer                     │  │
│  │  ┌────────────┐  ┌────────────┐  ┌──────────────────────┐   │  │
│  │  │ MQTT Client│  │ REST API   │  │ Future Ingestors     │   │  │
│  │  └─────┬──────┘  └─────┬──────┘  │ (Modbus, Serial...)  │   │  │
│  └────────┼───────────────┼──────────┴──────────────────────┘   │  │
│           │                   │                                    │
│           └─────────┬─────────┘                                    │
│                     ▼                                             │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                  In-Memory Event Buffer                      │  │
│  │   • Bounded queue (in-memory)                                 │  │
│  │   • Backpressure control                                       │  │
│  │   • Overflow policy (drop oldest/reject)                      │  │
│  │   • No persistence                                             │  │
│  └──────────────────────────┬───────────────────────────────────┘  │
│                             │                                        │
│                             ▼                                        │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                 Processing Core Layer                        │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐│  │
│  │  │ Message  │  │Validation│  │ Mapping  │  │   Quality    ││  │
│  │  │Adapter   │  │  Engine  │  │ Service  │  │ Calculation  ││  │
│  │  │Lookup    │  └──────────┘  └──────────┘  └──────────────┘│  │
│  │  └──────────┘                                             │  │
│  └──────────────────────────┬───────────────────────────────────┘  │
│                             │                                        │
│                             ▼                                        │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │               OPC Projection Layer                          │  │
│  │  ┌────────────┐  ┌────────────┐  ┌──────────────────────┐   │  │
│  │  │    Batcher │  │ Change Det │  │   OPC UA Update      │   │  │
│  │  │            │  │            │  │     Service          │   │  │
│  │  └────────────┘  └────────────┘  └──────────────────────┘   │  │
│  └──────────────────────────┬───────────────────────────────────┘  │
│                             │                                        │
│                             ▼                                        │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                  OPC UA Server                               │  │
│  │            (node-opcua, single instance)                     │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                 Supporting Services                          │  │
│  │  ┌────────────┐  ┌────────────┐  ┌──────────────────────┐   │  │
│  │  │ Runtime    │  │  Config DB │  │      Monitoring      │   │  │
│  │  │ State      │  │(PostgreSQL) │  │   (In-Memory)        │   │  │
│  │  │ (In-Mem)   │  │            │  │                      │   │  │
│  │  └────────────┘  └────────────┘  └──────────────────────┘   │  │
│  │  ┌──────────────────┐  ┌────────────┐  ┌────────────┐      │  │
│  │  │  Device Types   │  │Message    │  │  Security  │      │  │
│  │  │  Repository     │  │Adapters   │  │            │      │  │
│  │  │  (Disk + DB)    │  │Repository │  │            │      │  │
│  │  └──────────────────┘  └────────────┘  └────────────┘      │  │
│  │  ┌────────────┐                                             │  │
│  │  │  Logging   │                                             │  │
│  │  └────────────┘                                             │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### Взаимодействие с внешними системами

```
                    OPC Clients
                 (SCADA, MES, Real-time dashboards)
                          │
                          ▼
┌──────────────────────────────────────────────────────────┐
│              OPC UA Server (4840)                         │
│         • Single instance for consistency                 │
│         • Real-time broadcasting only                     │
└──────────────────────────────────────────────────────────┘
                          ▲
                          │
┌──────────────────────────────────────────────────────────┐
│              OPC CNC Hub Service                          │
├──────────────────────────────────────────────────────────┤
│  ┌──────────┐    ┌──────────┐    ┌──────────────────┐    │
│  │   MQTT   │    │    API   │    │   Future Sources │    │
│  │  Client  │    │  Ingest  │    │ (Modbus, Serial) │    │
│  └──────────┘    └──────────┘    └──────────────────┘    │
│         │               │                  │               │
│         └───────────────┼──────────────────┘               │
│                         ▼                                  │
│              Event Buffer (In-Memory)                    │
│                         │                                  │
│                         ▼                                  │
│               Processing Core (In-Memory)                 │
│              ┌────────┴────────┐                          │
│              │   Message     │                          │
│              │   Adapter     │                          │
│              │   Lookup      │                          │
│              └───────┬───────┘                          │
│                      │                                  │
│         ┌────────────┴────────────┐                      │
│         ▼                         ▼                       │
│   ┌─────────────┐          ┌─────────────┐              │
│   │ Device Type │          │   Message   │              │
│   │  Schemas    │          │   Adapter   │              │
│   │ (Disk + DB) │          │ Repository  │              │
│   └─────────────┘          └─────────────┘              │
│                      │                                  │
│                      ▼                                  │
│               OPC Projection (Non-blocking)               │
└──────────────────────────────────────────────────────────┘
         ▲               ▲                  ▲
         │               │                  │
    ┌────────┐      ┌──────────┐      ┌──────────┐
    │  MQTT  │      │  Device  │      │   PLC    │
    │ Broker │      │  APIs    │      │   APIs   │
    └────────┘      └──────────┘      └──────────┘
         ▲
         │
    ┌─────────────┐
    │ File System │
    │ (Schemas +  │
    │  Adapters)  │
    └─────────────┘
```

### Поток данных (Real-Time)

```
Source → Ingestion → Event Buffer → Processing → OPC Projection → OPC UA → Clients
          (Async)      (In-Memory)      (In-Memory)     (In-Memory)        (Real-time)
                                              │
                                          Message
                                          Adapter
                                          Lookup
                                           (DB)
```

## Important Constraints
Перед тем как сделать коммит обязательно проводить проверку типов линтинг и запуск тестов устранять все ошибки и только если все тесты проходят делать коммит

## External Dependencies
Документация по Nest - [Nest.js Documentation](https://docs.nestjs.com)
Документация по Mqtt - [Mqtt.js Documentation](https://github.com/mqttjs/MQTT.js?tab=readme-ov-file#client)
Документация по OPC [OPC node](https://github.com/node-opcua/node-opcua/tree/v2.1.3/documentation)