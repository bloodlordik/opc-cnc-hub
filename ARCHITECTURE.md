# OPC CNC Hub v2 - Детальная архитектура

Этот документ содержит детальное описание архитектуры OPC CNC Hub, включая все NestJS модули, сервисы и контроллеры.

## Обзор модулей

```
AppModule
├── ConfigModule
├── DatabaseModule
├── IngestionModule
│   ├── MqttIngestor
│   └── ApiIngestor
├── EventBufferModule
├── ProcessingModule
│   ├── ValidationEngine
│   ├── MappingService
│   ├── QualityCalculationEngine
│   └── MessageAdapterService
├── RuntimeStateModule
├── OpcProjectionModule
│   ├── OpcProjectionService
│   ├── BatcherService
│   └── ChangeDetectionService
├── OpcServerModule
├── DeviceTypeModule
├── MessageAdapterModule
├── DeviceModule
├── MonitoringModule
├── SecurityModule
├── LoggingModule
├── HealthModule
└── AuditModule
```

---

## 1. AppModule

**Описание:** Корневой модуль приложения, который импортирует все остальные модули и обеспечивает инициализацию приложения.

**Сервисы:**

- `AppService` — Основной сервис приложения, содержит бизнес-логику верхнего уровня

**Контроллеры:**

- `AppController` — Контроллер для API верхнего уровня (health check, version info)

**Основная логика:**

- Bootstrap приложения
- Инициализация всех модулей
- Загрузка конфигурации
- Graceful shutdown

```typescript
@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    IngestionModule,
    EventBufferModule,
    ProcessingModule,
    RuntimeStateModule,
    OpcProjectionModule,
    OpcServerModule,
    DeviceTypeModule,
    MessageAdapterModule,
    DeviceModule,
    MonitoringModule,
    SecurityModule,
    LoggingModule,
    HealthModule,
    AuditModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

---

## 2. ConfigModule

**Описание:** Модуль конфигурации для загрузки и управления настройками приложения из YAML файлов и переменных окружения.

**Сервисы:**

- `ConfigService` — Сервис для доступа к конфигурации, загрузка из YAML, валидация схемы

**Методы ConfigService:**

- `get<T>(key: string): T` — Получить значение по ключу
- `getOrThrow<T>(key: string): T` — Получить значение или выбросить ошибку
- `getMqttConfig(): MqttConfig` — Получить конфигурацию MQTT
- `getOpcConfig(): OpcConfig` — Получить конфигурацию OPC UA
- `getDatabaseConfig(): DatabaseConfig` — Получить конфигурацию базы данных
- `reload(): Promise<void>` — Перезагрузить конфигурацию

**Основная логика:**

- Загрузка YAML конфигурации при старте
- Валидация схемы конфигурации
- Подстановка переменных окружения
- Hot reload конфигурации (опционально)

```typescript
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema: Joi.object({
        NODE_ENV: Joi.string().valid('development', 'production', 'test'),
        CONFIG_PATH: Joi.string().default('./config/local.yml'),
      }),
    }),
  ],
  providers: [ConfigService],
  exports: [ConfigService],
})
export class ConfigModule {}
```

---

## 3. DatabaseModule

**Описание:** Модуль для работы с PostgreSQL базой данных. Использует TypeORM для доступа к данным.

**Сервисы:**

- `DatabaseService` — Сервис для управления соединением с базой данных

**Entities:**

- `Device` — Сущность устройства
- `DeviceVersion` — Сущность версии конфигурации устройства
- `Variable` — Сущность переменной устройства
- `DeviceType` — Сущность типа устройства
- `DeviceTypeVersion` — Сущность версии типа устройства
- `MessageAdapter` — Сущность адаптера сообщений
- `MessageAdapterVersion` — Сущность версии адаптера сообщений
- `ConfigAuditLog` — Сущность лога изменений конфигурации

**Repositories:**

- `DeviceRepository` — Репозиторий для работы с устройствами
- `DeviceVersionRepository` — Репозиторий для версий устройств
- `VariableRepository` — Репозиторий для переменных
- `DeviceTypeRepository` — Репозиторий для типов устройств
- `DeviceTypeVersionRepository` — Репозиторий для версий типов
- `MessageAdapterRepository` — Репозиторий для адаптеров сообщений
- `MessageAdapterVersionRepository` — Репозиторий для версий адаптеров
- `ConfigAuditLogRepository` — Репозиторий для лога изменений

**Основная логика:**

- Управление соединением с PostgreSQL
- Миграции схемы базы данных
- Подключение к базе при старте приложения
- Закрытие соединения при shutdown

```typescript
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('database.host'),
        port: configService.get('database.port'),
        username: configService.get('database.username'),
        password: configService.get('database.password'),
        database: configService.get('database.database'),
        entities: [
          Device,
          DeviceVersion,
          Variable,
          DeviceType,
          DeviceTypeVersion,
          MessageAdapter,
          MessageAdapterVersion,
          ConfigAuditLog,
        ],
        synchronize: process.env.NODE_ENV === 'development',
        logging: process.env.NODE_ENV === 'development',
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([
      Device,
      DeviceVersion,
      Variable,
      DeviceType,
      DeviceTypeVersion,
      MessageAdapter,
      MessageAdapterVersion,
      ConfigAuditLog,
    ]),
  ],
  providers: [DatabaseService],
  exports: [DatabaseService, TypeOrmModule],
})
export class DatabaseModule {}
```

---

## 4. IngestionModule

**Описание:** Модуль для приема данных из внешних источников (MQTT, REST API) и преобразования их в канонический формат событий.

**Сервисы:**

- `MqttIngestorService` — Сервис для приема данных через MQTT брокер
- `ApiIngestorService` — Сервис для приема данных через REST API
- `CanonicalEventFactory` — Фабрика для создания канонических событий

**Контроллеры:**

- `ApiIngestorController` — Контроллер для REST API приема данных

### 4.1 MqttIngestorService

**Описание:** Сервис для подключения к MQTT брокеру, подписки на топики и приема сообщений.

**Методы:**

- `connect(): Promise<void>` — Подключиться к MQTT брокеру
- `subscribe(topics: string[]): Promise<void>` — Подписаться на список топиков
- `unsubscribe(topics: string[]): Promise<void>` — Отписаться от топиков
- `disconnect(): Promise<void>` — Отключиться от брокера
- `onMessage(handler: (topic: string, payload: Buffer) => void): void` — Установить обработчик сообщений
- `getConnectionStatus(): ConnectionStatus` — Получить статус соединения

**Основная логика:**

- Автоматический реконнект с экспоненциальным backoff
- Bounded queue для входящих сообщений (in-memory)
- Message deduplication по messageId + timestamp
- Overflow policy: drop oldest / reject

### 4.2 ApiIngestorService

**Описание:** Сервис для приема данных через REST API.

**Методы:**

- `ingest(request: IngestRequest): Promise<IngestResponse>` — Принять данные через API
- `ingestBatch(requests: BatchIngestRequest): Promise<BatchIngestResponse>` — Принять пачку данных
- `validateRequest(request: IngestRequest): ValidationResult` — Валидировать запрос

**Основная логика:**

- Rate limiting по clientId и IP
- Payload size limit (max 1MB)
- Асинхронная обработка (сразу возвращает eventId)
- Validation по ContentType (application/json)

### 4.3 CanonicalEventFactory

**Описание:** Фабрика для создания канонических событий из входящих данных.

**Методы:**

- `createFromMqtt(topic: string, payload: Buffer, metadata?: EventMetadata): CanonicalEvent` — Создать событие из MQTT сообщения
- `createFromApi(request: IngestRequest): CanonicalEvent` — Создать событие из API запроса
- `generateEventId(): string` — Сгенерировать уникальный ID события

### 4.4 ApiIngestorController

**Описание:** Контроллер для REST API приема данных.

**Endpoints:**

- `POST /api/v2/ingest` — Принять данные (single)
- `POST /api/v2/ingest/batch` — Принять данные (batch)

**Guards:**

- `ApiKeyGuard` — Проверка API ключа
- `RateLimitGuard` — Ограничение скорости запросов

```typescript
@Module({
  imports: [ConfigModule, EventBufferModule],
  controllers: [ApiIngestorController],
  providers: [MqttIngestorService, ApiIngestorService, CanonicalEventFactory],
  exports: [MqttIngestorService, ApiIngestorService, CanonicalEventFactory],
})
export class IngestionModule {}
```

---

## 5. EventBufferModule

**Описание:** Модуль для асинхронной передачи событий из Ingestion в Processing с backpressure control.

**Сервисы:**

- `EventBufferService` — Сервис для управления очередью событий
- `BackpressureController` — Контроллер для управления backpressure

**Методы EventBufferService:**

- `push(event: CanonicalEvent): Promise<boolean>` — Добавить событие в очередь
- `pop(): Promise<CanonicalEvent | null>` — Извлечь событие из очереди
- `size(): number` — Получить размер очереди
- `clear(): void` — Очистить очередь
- `getMetrics(): BufferMetrics` — Получить метрики очереди

**Методы BackpressureController:**

- `shouldThrottle(): boolean` — Проверить нужно ли замедлить прием
- `shouldReject(): boolean` — Проверить нужно ли отклонить новые события
- `getStatus(): BufferStatus` — Получить статус очереди

**Основная логика:**

- Только in-memory queue
- Нет персистентности
- Устаревшие события (> maxAge) автоматически отбрасываются
- При оффлайне данные теряются (by design)
- Bounded queue с configurable размером

```typescript
@Module({
  imports: [ConfigModule],
  providers: [EventBufferService, BackpressureController],
  exports: [EventBufferService, BackpressureController],
})
export class EventBufferModule {}
```

---

## 6. ProcessingModule

**Описание:** Модуль для обработки событий: валидация, трансформация, расчет качества данных, поиск адаптеров сообщений.

**Сервисы:**

- `ValidationEngineService` — Сервис валидации событий
- `MappingService` — Сервис маппинга данных
- `QualityCalculationService` — Сервис расчета качества данных
- `MessageAdapterService` — Сервис поиска и применения адаптеров сообщений

### 6.1 ValidationEngineService

**Описание:** Сервис для валидации событий по схеме устройства.

**Методы:**

- `validate(event: CanonicalEvent, deviceSchema: DeviceSchema): ValidationResult` — Валидировать событие
- `validatePayload(payload: Record<string, unknown>, schema: VariableSchema[]): ValidationResult` — Валидировать payload
- `validateVariable(value: unknown, schema: VariableSchema): ValidationError[]` — Валидировать отдельную переменную

**Основная логика:**

- Проверка обязательных полей
- Проверка типов данных
- Проверка ограничений (min, max, pattern, enum)
- Collect all errors или reject на первой ошибке (configurable)

### 6.2 MappingService

**Описание:** Сервис для маппинга данных из входящего формата в канонический.

**Методы:**

- `map(event: CanonicalEvent, deviceConfig: DeviceConfig): ProcessedMeasurement[]` — Маппинг события
- `mapVariable(sourceValue: unknown, rule: MappingRule): unknown` — Маппинг отдельной переменной
- `applyTransform(value: unknown, transform: TransformOperation): unknown` — Применить трансформацию

**Основная логика:**

- Применение mapping rules
- Поддержка трансформаций: direct, map, scale, offset, formula, enum
- Подстановка значений по умолчанию для отсутствующих полей

### 6.3 QualityCalculationService

**Описание:** Сервис для расчета качества данных и присвоения OPC UA StatusCode.

**Методы:**

- `calculateQuality(
  measurement: unknown,
  variableSchema: VariableSchema,
  validation: ValidationResult,
  runtimeState: VariableRuntimeState
): QualityResult` — Рассчитать качество
- `getStatusCode(quality: 'GOOD' | 'BAD' | 'UNCERTAIN', reason: string): number` — Получить OPC UA StatusCode
- `isDataStale(lastUpdate: Date, staleThresholdMs: number): boolean` — Проверить данные на устаревание

**Основная логика:**

- Расчет качества на основе валидации, runtime state и ограничений
- Присвоение OPC UA StatusCode (Good, Bad, Uncertain с подстатусами)
- Detection stale данных

### 6.4 MessageAdapterService

**Описание:** Сервис для поиска и применения адаптеров сообщений для трансформации форматов.

**Методы:**

- `loadAdapters(): Promise<void>` — Загрузить адаптеры из PostgreSQL
- `findAdapter(deviceId: string, source: string): MessageAdapter | null` — Найти адаптер
- `transform(payload: Record<string, unknown>, adapter: MessageAdapter): Record<string, unknown>` — Применить адаптер
- `applyTransform(value: unknown, operation: TransformOperation): unknown` — Применить трансформацию

**Основная логика:**

- Поиск адаптера по deviceId (приоритет) или deviceType
- Кэширование адаптеров в памяти
- Применение трансформаций к входящему сообщению

```typescript
@Module({
  imports: [ConfigModule, DatabaseModule, DeviceModule, RuntimeStateModule],
  providers: [
    ValidationEngineService,
    MappingService,
    QualityCalculationService,
    MessageAdapterService,
  ],
  exports: [
    ValidationEngineService,
    MappingService,
    QualityCalculationService,
    MessageAdapterService,
  ],
})
export class ProcessingModule {}
```

---

## 7. RuntimeStateModule

**Описание:** Модуль для управления runtime state устройств и переменных (хранится только в памяти).

**Сервисы:**

- `RuntimeStateService` — Сервис для управления runtime state
- `DeviceStateDetector` — Детектор статуса устройств

**Методы RuntimeStateService:**

- `getDeviceState(deviceId: string): DeviceRuntimeState | undefined` — Получить state устройства
- `updateDeviceState(deviceId: string, update: Partial<DeviceRuntimeState>): void` — Обновить state устройства
- `getVariableState(deviceId: string, variableName: string): VariableRuntimeState | undefined` — Получить state переменной
- `updateVariableState(deviceId: string, variableName: string, update: Partial<VariableRuntimeState>): void` — Обновить state переменной
- `removeDevice(deviceId: string): void` — Удалить state устройства
- `getAllDevicesState(): Map<string, DeviceRuntimeState>` — Получить state всех устройств

**Методы DeviceStateDetector:**

- `checkDeviceStatus(state: DeviceRuntimeState): 'ONLINE' | 'OFFLINE' | 'STALE'` — Проверить статус устройства
- `isStale(lastSeen: Date, heartbeatTimeoutMs: number): boolean` — Проверить на устаревание

**Основная логика:**

- Хранение только в памяти (теряется при перезапуске)
- Detection online/offline/stale статусов
- Отслеживание lastSeen для устройств и переменных
- Counter consecutive failures

```typescript
@Module({
  providers: [RuntimeStateService, DeviceStateDetector],
  exports: [RuntimeStateService, DeviceStateDetector],
})
export class RuntimeStateModule {}
```

---

## 8. OpcProjectionModule

**Описание:** Модуль для проекции обработанных данных в OPC UA AddressSpace с batching и change detection.

**Сервисы:**

- `OpcProjectionService` — Сервис для проекции данных в OPC
- `BatcherService` — Сервис для батчинга обновлений
- `ChangeDetectionService` — Сервис для detection изменений

**Методы OpcProjectionService:**

- `initialize(): Promise<void>` — Инициализация OPC projection
- `createDevice(deviceConfig: DeviceConfig): Promise<void>` — Создать устройство в OPC
- `updateVariable(deviceId: string, variableName: string, measurement: ProcessedMeasurement): Promise<void>` — Обновить переменную
- `updateBatch(measurements: ProcessedMeasurement[]): Promise<void>` — Обновить батч измерений
- `removeDevice(deviceId: string): Promise<void>` — Удалить устройство из OPC
- `getDeviceStatus(deviceId: string): Promise<DeviceStatus>` — Получить статус устройства

**Методы BatcherService:**

- `addMeasurement(measurement: ProcessedMeasurement): Promise<void>` — Добавить измерение в батч
- `flush(): Promise<void>` — Сбросить батч в OPC
- `startBatching(): void` — Запустить батчинг (автоматический flush)
- `stopBatching(): void` — Остановить батчинг

**Методы ChangeDetectionService:**

- `hasChanged(deviceId: string, variableName: string, value: unknown): boolean` — Проверить изменилось ли значение
- `updateLastValue(deviceId: string, variableName: string, value: unknown): void` — Обновить последнее значение

**Основная логика:**

- Non-blocking обновление AddressSpace
- Batching (update каждые N ms или при достижении размера)
- Change detection (не писать если значение не изменилось)
- Только runtime broadcasting, без historizing

```typescript
@Module({
  imports: [ConfigModule, OpcServerModule, RuntimeStateModule],
  providers: [OpcProjectionService, BatcherService, ChangeDetectionService],
  exports: [OpcProjectionService, BatcherService, ChangeDetectionService],
})
export class OpcProjectionModule {}
```

---

## 9. OpcServerModule

**Описание:** Модуль для управления OPC UA сервером на базе node-opcua.

**Сервисы:**

- `OpcServerService` — Сервис управления OPC UA сервером
- `AddressSpaceService` — Сервис для управления AddressSpace
- `OpcSecurityService` — Сервис для управления безопасностью OPC

**Методы OpcServerService:**

- `initialize(): Promise<void>` — Инициализация OPC сервера
- `start(): Promise<void>` — Запуск OPC сервера
- `stop(): Promise<void>` — Остановка OPC сервера
- `getEndpointUrl(): string` — Получить URL endpoint'а
- `getServerStatus(): OpcServerStatus` — Получить статус сервера

**Методы AddressSpaceService:**

- `createDeviceNode(deviceConfig: DeviceConfig): Promise<UAObject>` — Создать узел устройства
- `createVariableNode(deviceId: string, variable: VariableConfig): Promise<UAVariable>` — Создать узел переменной
- `updateVariableValue(nodeId: string, value: unknown, statusCode: number, sourceTimestamp: Date): Promise<void>` — Обновить значение переменной
- `removeDeviceNode(deviceId: string): Promise<void>` — Удалить узел устройства
- `getNamespace(): Namespace` — Получить namespace

**Методы OpcSecurityService:**

- `loadCertificates(): Promise<void>` — Загрузить сертификаты
- `configureSecurity(config: OpcSecurityConfig): Promise<void>` — Настроить безопасность

**Основная логика:**

- Управление жизненным циклом OPC сервера
- Создание и управление AddressSpace
- Настройка безопасности (анонимный, username/password, сертификаты)

```typescript
@Module({
  imports: [ConfigModule],
  providers: [OpcServerService, AddressSpaceService, OpcSecurityService],
  exports: [OpcServerService, AddressSpaceService, OpcSecurityService],
})
export class OpcServerModule {}
```

---

## 10. DeviceTypeModule

**Описание:** Модуль для управления типами устройств (схемами типов) с загрузкой с диска и хранением в PostgreSQL.

**Сервисы:**

- `DeviceTypeService` — Сервис для управления типами устройств
- `DeviceTypeSchemaLoader` — Загрузчик схем типов с диска

**Контроллеры:**

- `DeviceTypeController` — Контроллер для API управления типами устройств

**Репозитории:**

- `DeviceTypeRepository` — Репозиторий для типов устройств
- `DeviceTypeVersionRepository` — Репозиторий для версий типов устройств

**Методы DeviceTypeService:**

- `findAll(): Promise<DeviceType[]>` — Получить все типы устройств
- `findById(id: string): Promise<DeviceType>` — Получить тип по ID
- `findByTypeId(typeId: string): Promise<DeviceType>` — Найти по typeId
- `create(dto: CreateDeviceTypeDto): Promise<DeviceType>` — Создать тип устройства
- `update(id: string, dto: UpdateDeviceTypeDto): Promise<DeviceType>` — Обновить тип устройства
- `delete(id: string): Promise<void>` — Удалить тип устройства
- `getVersions(deviceTypeId: string): Promise<DeviceTypeVersion[]>` — Получить версии
- `rollback(deviceTypeId: string, version: number): Promise<DeviceType>` — Откатить версию

**Методы DeviceTypeSchemaLoader:**

- `loadFromDisk(): Promise<DeviceTypeSchema[]>` — Загрузить схемы с диска
- `syncToDatabase(schemas: DeviceTypeSchema[]): Promise<void>` — Синхронизировать с БД
- `validateSchema(schema: DeviceTypeSchema): ValidationResult` — Валидировать схему

**Endpoints DeviceTypeController:**

- `GET /api/v2/config/device-types` — Получить все типы
- `GET /api/v2/config/device-types/:id` — Получить тип по ID
- `GET /api/v2/config/device-types/:id/versions` — Получить версии
- `GET /api/v2/config/device-types/:id/versions/:version` — Получить конкретную версию
- `POST /api/v2/config/device-types` — Создать тип
- `PUT /api/v2/config/device-types/:id` — Обновить тип
- `DELETE /api/v2/config/device-types/:id` — Удалить тип
- `POST /api/v2/config/device-types/:id/rollback/:version` — Откатить версию

**Основная логика:**

- Загрузка схем с диска при старте приложения
- Хранение схем в PostgreSQL
- Versioning схем с audit trail
- Rollback на предыдущие версии

```typescript
@Module({
  imports: [DatabaseModule],
  controllers: [DeviceTypeController],
  providers: [DeviceTypeService, DeviceTypeSchemaLoader],
  exports: [DeviceTypeService],
})
export class DeviceTypeModule {}
```

---

## 11. MessageAdapterModule

**Описание:** Модуль для управления адаптерами сообщений для трансформации форматов с загрузкой с диска и хранением в PostgreSQL.

**Сервисы:**

- `MessageAdapterService` — Сервис для управления адаптерами сообщений
- `MessageAdapterLoader` — Загрузчик адаптеров с диска

**Контроллеры:**

- `MessageAdapterController` — Контроллер для API управления адаптерами сообщений

**Репозитории:**

- `MessageAdapterRepository` — Репозиторий для адаптеров сообщений
- `MessageAdapterVersionRepository` — Репозиторий для версий адаптеров

**Методы MessageAdapterService:**

- `findAll(): Promise<MessageAdapter[]>` — Получить все адаптеры
- `findById(id: string): Promise<MessageAdapter>` — Получить адаптер по ID
- `findByDevice(deviceId: string, source: string): Promise<MessageAdapter[]>` — Найти по устройству
- `findByDeviceType(deviceType: string, source: string): Promise<MessageAdapter[]>` — Найти по типу устройства
- `findAdapter(deviceId: string, source: string): MessageAdapter | null` — Найти адаптер (с приоритетом deviceId)
- `create(dto: CreateMessageAdapterDto): Promise<MessageAdapter>` — Создать адаптер
- `update(id: string, dto: UpdateMessageAdapterDto): Promise<MessageAdapter>` — Обновить адаптер
- `delete(id: string): Promise<void>` — Удалить адаптер
- `transform(payload: Record<string, unknown>, adapter: MessageAdapter): Record<string, unknown>` — Применить адаптер
- `getVersions(messageAdapterId: string): Promise<MessageAdapterVersion[]>` — Получить версии
- `rollback(messageAdapterId: string, version: number): Promise<MessageAdapter>` — Откатить версию

**Методы MessageAdapterLoader:**

- `loadFromDisk(): Promise<MessageAdapter[]>` — Загрузить адаптеры с диска
- `syncToDatabase(adapters: MessageAdapter[]): Promise<void>` — Синхронизировать с БД
- `validateAdapter(adapter: MessageAdapter): ValidationResult` — Валидировать адаптер

**Endpoints MessageAdapterController:**

- `GET /api/v2/config/message-adapters` — Получить все адаптеры
- `GET /api/v2/config/message-adapters/:id` — Получить адаптер по ID
- `GET /api/v2/config/message-adapters/:id/versions` — Получить версии
- `GET /api/v2/config/message-adapters/:id/versions/:version` — Получить конкретную версию
- `POST /api/v2/config/message-adapters` — Создать адаптер
- `PUT /api/v2/config/message-adapters/:id` — Обновить адаптер
- `DELETE /api/v2/config/message-adapters/:id` — Удалить адаптер
- `POST /api/v2/config/message-adapters/:id/rollback/:version` — Откатить версию

**Основная логика:**

- Загрузка адаптеров с диска при старте приложения
- Хранение адаптеров в PostgreSQL
- Versioning адаптеров с audit trail
- Rollback на предыдущие версии
- Поддержка трансформаций: direct, map, scale, offset, formula, enum

```typescript
@Module({
  imports: [DatabaseModule],
  controllers: [MessageAdapterController],
  providers: [MessageAdapterService, MessageAdapterLoader],
  exports: [MessageAdapterService],
})
export class MessageAdapterModule {}
```

---

## 12. DeviceModule

**Описание:** Модуль для управления конфигурациями устройств в PostgreSQL.

**Сервисы:**

- `DeviceService` — Сервис для управления устройствами

**Контроллеры:**

- `DeviceController` — Контроллер для API управления устройствами

**Репозитории:**

- `DeviceRepository` — Репозиторий для устройств
- `DeviceVersionRepository` — Репозиторий для версий устройств
- `VariableRepository` — Репозиторий для переменных устройств

**Методы DeviceService:**

- `findAll(filters?: DeviceFilters): Promise<Device[]>` — Получить все устройства
- `findById(id: string): Promise<Device>` — Получить устройство по ID
- `findByType(type: string): Promise<Device[]>` — Найти по типу
- `findBySection(section: string): Promise<Device[]>` — Найти по участку
- `create(dto: CreateDeviceDto): Promise<Device>` — Создать устройство
- `update(id: string, dto: UpdateDeviceDto): Promise<Device>` — Обновить устройство
- `delete(id: string): Promise<void>` — Удалить устройство (soft delete)
- `getVersions(deviceId: string): Promise<DeviceVersion[]>` — Получить версии
- `rollback(deviceId: string, version: number): Promise<Device>` — Откатить версию

**Endpoints DeviceController:**

- `GET /api/v2/config/devices` — Получить все устройства
- `GET /api/v2/config/devices/:id` — Получить устройство по ID
- `GET /api/v2/config/devices/:id/versions` — Получить версии
- `GET /api/v2/config/devices/:id/versions/:version` — Получить конкретную версию
- `POST /api/v2/config/devices` — Создать устройство
- `PUT /api/v2/config/devices/:id` — Обновить устройство
- `DELETE /api/v2/config/devices/:id` — Удалить устройство
- `POST /api/v2/config/devices/:id/rollback/:version` — Откатить версию

**Основная логика:**

- Versioning конфигураций устройств с audit trail
- Rollback на предыдущие версии
- Управление переменными устройств
- Фильтрация по типу, участку, статусу

```typescript
@Module({
  imports: [DatabaseModule],
  controllers: [DeviceController],
  providers: [DeviceService],
  exports: [DeviceService],
})
export class DeviceModule {}
```

---

## 13. RuntimeStateAPIModule

**Описание:** Модуль для API доступа к runtime state устройств.

**Сервисы:**

- (Использует RuntimeStateService из RuntimeStateModule)

**Контроллеры:**

- `RuntimeStateController` — Контроллер для API runtime state

**Endpoints RuntimeStateController:**

- `GET /api/v2/runtime/devices/:id/state` — Получить state устройства
- `GET /api/v2/runtime/devices/status` — Получить статусы всех устройств
- `GET /api/v2/runtime/summary` — Получить сводку (online/offline/stale)

**Основная логика:**

- Доступ к runtime state устройств
- Сводная информация по всем устройствам
- Статусы устройств и переменных

```typescript
@Module({
  imports: [RuntimeStateModule],
  controllers: [RuntimeStateController],
})
export class RuntimeStateAPIModule {}
```

---

## 14. MonitoringModule

**Описание:** Модуль для мониторинга и сбора метрик приложения.

**Сервисы:**

- `MetricsService` — Сервис для сбора метрик (Prometheus)
- `HealthCheckService` — Сервис для health checks

**Контроллеры:**

- `MetricsController` — Контроллер для метрик
- `HealthController` — Контроллер для health checks

**Методы MetricsService:**

- `incrementCounter(name: string, labels?: Record<string, string>): void` — Увеличить счетчик
- `setGauge(name: string, value: number, labels?: Record<string, string>): void` — Установить gauge
- `observeHistogram(name: string, value: number, labels?: Record<string, string>): void` — Записать в histogram
- `getMetrics(): string` — Получить все метрики в Prometheus формате

**Методы HealthCheckService:**

- `checkLiveness(): Promise<HealthCheck>` — Проверить liveness
- `checkReadiness(): Promise<HealthCheck>` — Проверить readiness
- `checkComponent(component: string): Promise<ComponentStatus>` — Проверить компонент

**Endpoints MetricsController:**

- `GET /metrics` — Получить метрики в Prometheus формате

**Endpoints HealthController:**

- `GET /health/live` — Liveness probe
- `GET /health/ready` — Readiness probe
- `GET /health` — Детальный health check

**Основная логика:**

- Сбор метрик по всем компонентам приложения
- Prometheus export
- Health checks для Kubernetes
- Component status checks

```typescript
@Module({
  controllers: [MetricsController, HealthController],
  providers: [MetricsService, HealthCheckService],
})
export class MonitoringModule {}
```

---

## 15. SecurityModule

**Описание:** Модуль для безопасности: аутентификация, авторизация, rate limiting, audit trail.

**Сервисы:**

- `AuthService` — Сервис аутентификации (JWT)
- `ApiKeysService` — Сервис управления API ключами
- `RateLimitService` — Сервис rate limiting
- `AuditService` — Сервис audit trail

**Контроллеры:**

- `AuthController` — Контроллер для аутентификации

**Guards:**

- `JwtAuthGuard` — Guard для JWT аутентификации
- `ApiKeyGuard` — Guard для API ключей
- `RolesGuard` — Guard для RBAC
- `RateLimitGuard` — Guard для rate limiting

**Методы AuthService:**

- `login(username: string, password: string): Promise<LoginResponse>` — Авторизация
- `refreshToken(refreshToken: string): Promise<TokenResponse>` — Обновить токен
- `logout(token: string): Promise<void>` — Выход
- `validateToken(token: string): Promise<JwtPayload>` — Валидировать токен

**Методы ApiKeysService:**

- `generateKey(): string` — Сгенерировать новый ключ
- `create(dto: CreateApiKeyDto): Promise<ApiKey>` — Создать API ключ
- `findById(id: string): Promise<ApiKey>` — Найти ключ по ID
- `findByKey(key: string): Promise<ApiKey>` — Найти ключ по значению
- `revoke(id: string): Promise<void>` — Отозвать ключ

**Методы RateLimitService:**

- `checkLimit(identifier: string, limit: number, windowMs: number): Promise<boolean>` — Проверить лимит
- `resetLimit(identifier: string): Promise<void>` — Сбросить лимит

**Методы AuditService:**

- `log(event: AuditEvent): Promise<void>` — Записать событие в лог
- `query(filters: AuditFilters): Promise<AuditEvent[]>` — Запросить лог

**Endpoints AuthController:**

- `POST /api/v2/auth/login` — Авторизация
- `POST /api/v2/auth/refresh` — Обновить токен
- `POST /api/v2/auth/logout` — Выход

**Основная логика:**

- JWT аутентификация с refresh токенами
- API ключи для сервисных аккаунтов
- RBAC (Role-Based Access Control)
- Rate limiting по clientId и IP
- Audit trail всех действий

```typescript
@Module({
  imports: [DatabaseModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    ApiKeysService,
    RateLimitService,
    AuditService,
    JwtAuthGuard,
    ApiKeyGuard,
    RolesGuard,
    RateLimitGuard,
  ],
  exports: [AuthService, ApiKeysService, RateLimitService, AuditService],
})
export class SecurityModule {}
```

---

## 16. LoggingModule

**Описание:** Модуль для логирования приложения.

**Сервисы:**

- `LoggingService` — Сервис логирования

**Методы LoggingService:**

- `log(message: string, context?: string, meta?: Record<string, unknown>): void` — INFO уровень
- `error(message: string, error?: Error, context?: string, meta?: Record<string, unknown>): void` — ERROR уровень
- `warn(message: string, context?: string, meta?: Record<string, unknown>): void` — WARN уровень
- `debug(message: string, context?: string, meta?: Record<string, unknown>): void` — DEBUG уровень
- `verbose(message: string, context?: string, meta?: Record<string, unknown>): void` — VERBOSE уровень

**Основная логика:**

- Структурированное логирование (JSON)
- Множественные транспорты (console, file)
- Rotation лог файлов
- Контексты по модулям и компонентам

```typescript
@Module({
  providers: [LoggingService],
  exports: [LoggingService],
})
export class LoggingModule {}
```

---

## 17. AuditModule

**Описание:** Модуль для API доступа к audit log.

**Сервисы:**

- (Использует AuditService из SecurityModule)

**Контроллеры:**

- `AuditController` — Контроллер для API audit log

**Endpoints AuditController:**

- `GET /api/v2/audit-log` — Получить audit log
- `GET /api/v2/audit-log/:deviceId` — Получить audit log устройства
- `GET /api/v2/audit-log/actions/:action` — Получить audit log по действию
- `GET /api/v2/audit-log/users/:userId` — Получить audit log пользователя

**Основная логика:**

- Доступ к audit log
- Фильтрация по различным критериям
- Пагинация результатов

```typescript
@Module({
  imports: [SecurityModule],
  controllers: [AuditController],
})
export class AuditModule {}
```

---

## Обзор зависимостей между модулями

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
