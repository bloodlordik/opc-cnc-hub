# OPC CNC Hub v2

Production-grade бэкенд-сервис для реального времени (real-time) агрегации телеметрии от промышленных станков и устройств с экспозицией через OPC UA сервер.

## Обзор

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

## Архитектура

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

## Логические подсистемы

### 1. Ingestion Layer

**Ответственность:**

- Прием данных из внешних источников (MQTT, REST API)
- Преобразование в канонический формат событий
- Первичная валидация формата
- Отправка в In-Memory Event Buffer

**Никакой бизнес-логики здесь нет.**

#### 1.1 MQTT Ingestor

```typescript
interface MqttConfig {
  broker: string;
  clientId: string;
  username?: string;
  password?: string;
  reconnectPeriod: number;
  connectTimeout: number;
  qos: 0 | 1 | 2;
  clean: boolean;
}

interface MqttIngestor {
  connect(): Promise<void>;
  subscribe(topics: string[]): Promise<void>;
  unsubscribe(topics: string[]): Promise<void>;
  onMessage(handler: (topic: string, payload: Buffer) => void): void;
  disconnect(): Promise<void>;
  getConnectionStatus(): ConnectionStatus;
}
```

**Особенности:**

- Автоматический реконнект с экспоненциальным backoff
- Bounded queue для входящих сообщений (in-memory)
- Message deduplication по messageId + timestamp
- Overflow policy: drop oldest / reject

#### 1.2 REST API Ingestor

```typescript
// POST /api/v1/ingest
interface IngestRequest {
  deviceId: string;
  source: 'api' | 'mqtt' | 'modbus';
  payload: Record<string, unknown>;
  sourceTimestamp?: number;
  messageId?: string;
}

interface IngestResponse {
  eventId: string;
  status: 'ACCEPTED' | 'REJECTED';
  timestamp: Date;
  message?: string;
}
```

**Особенности:**

- Rate limiting по clientId и IP
- Payload size limit (max 1MB)
- Асинхронная обработка (сразу возвращает eventId)
- Validation по ContentType (application/json)

#### 1.3 Canonical Event Format

```typescript
interface CanonicalEvent {
  eventId: string; // UUID v4
  deviceId: string;
  source: 'mqtt' | 'api' | 'modbus' | 'serial';
  sourceTopic?: string; // Для MQTT
  sourceTimestamp: number; // Unix timestamp (ms)
  receivedTimestamp: number; // Unix timestamp (ms)
  messageId?: string; // Для deduplication
  sequenceNumber?: number; // Для ordered processing
  payload: Record<string, unknown>;
  metadata: {
    sourceHost?: string;
    clientId?: string;
    qos?: number;
  };
}
```

### 2. In-Memory Event Buffer Layer

**Ответственность:**

- Асинхронная передача событий из Ingestion в Processing
- Backpressure control
- Retry logic для failed events
- Устаревшие события отбрасываются (no persistence)

#### 2.1 Реализация (Только In-Memory)

```typescript
interface EventBufferConfig {
  maxSize: number; // Макс. размер очереди (default: 10000)
  overflowPolicy: 'DROP_OLDEST' | 'REJECT'; // Убрали DISK_SPILL
  retryAttempts: number; // Max retry attempts (default: 3)
  retryDelay: number; // Delay between retries (default: 1000)
  maxAge: number; // Max event age (default: 30000) - уменьшили до 30с
}

interface EventBuffer {
  push(event: CanonicalEvent): Promise<boolean>;
  size(): number;
  clear(): void;
  getMetrics(): BufferMetrics;
}

interface BufferMetrics {
  size: number;
  maxSize: number;
  droppedCount: number;
  retriedCount: number;
  avgProcessingTime: number;
  overflowCount: number;
}
```

**Важно:**

- Только in-memory queue
- Нет персистентности
- Устаревшие события (> maxAge) автоматически отбрасываются
- При оффлайне данные теряются (by design)

#### 2.2 Backpressure Strategy

```typescript
class BackpressureController {
  private threshold: number = 8000; // 80% of queue size
  private critical: number = 9500; // 95% of queue size

  shouldThrottle(): boolean {
    return this.size() >= this.threshold;
  }

  shouldReject(): boolean {
    return this.size() >= this.critical;
  }

  getStatus(): 'OK' | 'WARNING' | 'CRITICAL' {
    if (this.shouldReject()) return 'CRITICAL';
    if (this.shouldThrottle()) return 'WARNING';
    return 'OK';
  }
}
```

### 3. Processing Core Layer

**Ответственность:**

- Валидация событий по схеме устройства
- Type coercion (преобразование типов данных)
- Quality calculation (расчет качества данных)
- StatusCode assignment (OPC UA статус)
- Публикация ProcessedMeasurement в OPC Projection

#### 3.1 Workflow

```
CanonicalEvent → Message Adapter Lookup → Validation → Mapping → Quality → ProcessedMeasurement → OPC Projection
```

#### 3.2 Validation Engine

```typescript
interface DeviceSchema {
  deviceId: string;
  type: string;
  variables: VariableSchema[];
}

interface VariableSchema {
  name: string;
  browseName: string;
  dataType: UADataType;
  required: boolean;
  constraints?: {
    min?: number;
    max?: number;
    pattern?: RegExp;
    enum?: unknown[];
  };
}

interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

interface ValidationError {
  path: string;
  message: string;
  code: string;
}
```

**Стратегии валидации:**

- **Strict mode**: reject на первой ошибке
- **Lenient mode**: collect all errors, process что можно
- **Best effort**: process что можно, логировать ошибки

#### 3.3 Mapping Service

```typescript
interface MappingRule {
  sourceField: string;
  targetField: string;
  transform?: (value: unknown) => unknown;
  defaultValue?: unknown;
}

interface ProcessedMeasurement {
  deviceId: string;
  variableName: string;
  browseName: string;
  value: unknown;
  quality: 'GOOD' | 'BAD' | 'UNCERTAIN';
  statusCode: number; // OPC UA StatusCode
  sourceTimestamp: Date;
  serverTimestamp: Date;
  eventId: string;
  metadata: {
    source: string;
    transformations: string[];
  };
}
```

#### 3.4 Quality Calculation

```typescript
interface QualityCalculationEngine {
  calculateQuality(
    measurement: unknown,
    variableSchema: VariableSchema,
    validation: ValidationResult,
  ): QualityResult;
}

interface QualityResult {
  quality: 'GOOD' | 'BAD' | 'UNCERTAIN';
  statusCode: number; // OPC UA StatusCode
  reason: string;
  subStatus?: string;
}

// Примеры кодов качества
enum StatusCode {
  Good = 0x00000000,
  Bad = 0x80000000,
  Uncertain = 0x40000000,
  BadDeviceFailure = 0x80040000,
  BadSensorFailure = 0x80040001,
  BadDataUnavailable = 0x80090000,
  UncertainLastUsableValue = 0x405c0001,
  UncertainSensorNotAccurate = 0x40560001,
}
```

#### 3.5 Runtime State Management (In-Memory)

```typescript
interface DeviceRuntimeState {
  deviceId: string;
  status: 'ONLINE' | 'OFFLINE' | 'STALE';
  lastSeen: Date;
  heartbeatTimeoutMs: number;
  consecutiveFailures: number;
  variables: Map<string, VariableRuntimeState>;
}

interface VariableRuntimeState {
  name: string;
  value: unknown;
  quality: 'GOOD' | 'BAD' | 'UNCERTAIN';
  lastUpdate: Date;
  staleThresholdMs: number;
}

// Detection logic
class RuntimeStateDetector {
  checkDeviceStatus(state: DeviceRuntimeState): 'ONLINE' | 'OFFLINE' | 'STALE' {
    const now = new Date();
    const timeSinceLastSeen = now.getTime() - state.lastSeen.getTime();

    if (timeSinceLastSeen > state.heartbeatTimeoutMs) {
      if (timeSinceLastSeen > state.heartbeatTimeoutMs * 3) {
        return 'OFFLINE';
      }
      return 'STALE';
    }
    return 'ONLINE';
  }
}
```

**Важно:**

- Вся runtime state хранится в памяти
- При перезапуске сервиса state теряется (by design)
- Восстановление происходит по первым поступившим данным

#### 3.6 Message Adapter Lookup

**Ответственность:**

- Поиск адаптера сообщений по deviceId и source
- Трансформация входящего формата в канонический
- Поддержка множества форматов сообщений для разных типов станков

##### 3.6.1 Message Adapter Repository

```typescript
// Загрузка с диска и хранение в PostgreSQL
interface MessageAdapter {
  id: string;
  deviceId?: string; // Для конкретного устройства
  deviceType?: string; // Для типа устройств (приоритет ниже deviceId)
  source: 'mqtt' | 'api' | 'modbus' | 'serial';
  version: number;
  name: string;
  description: string;
  transformations: TransformationRule[];
  createdAt: Date;
  updatedAt: Date;
}

interface TransformationRule {
  sourceField: string; // Поле во входящем сообщении
  targetField: string; // Поле в каноническом формате
  transform: TransformOperation;
  required: boolean;
  defaultValue?: unknown;
}

interface TransformOperation {
  type: 'direct' | 'map' | 'scale' | 'offset' | 'formula' | 'enum';
  params?: {
    // Для map
    mapping?: Record<string, unknown>;
    // Для scale
    factor?: number;
    // Для offset
    offset?: number;
    // Для formula
    formula?: string;
    // Для enum
    enumValues?: Record<string, unknown>;
  };
}
```

##### 3.6.2 Пример адаптера для Fanuc станка

```json
{
  "id": "adapter-fanuc-cnc-001",
  "deviceId": "cnc-001",
  "source": "mqtt",
  "version": 1,
  "name": "Fanuc CNC Milling Machine Adapter",
  "description": "Transforms Fanuc CNC MQTT messages to canonical format",
  "transformations": [
    {
      "sourceField": "rpm",
      "targetField": "spindle_speed",
      "transform": {
        "type": "direct"
      },
      "required": true
    },
    {
      "sourceField": "tool",
      "targetField": "tool_number",
      "transform": {
        "type": "direct"
      },
      "required": true
    },
    {
      "sourceField": "X",
      "targetField": "axis_x",
      "transform": {
        "type": "scale",
        "params": {
          "factor": 0.001
        }
      },
      "required": true
    },
    {
      "sourceField": "Y",
      "targetField": "axis_y",
      "transform": {
        "type": "scale",
        "params": {
          "factor": 0.001
        }
      },
      "required": true
    },
    {
      "sourceField": "Z",
      "targetField": "axis_z",
      "transform": {
        "type": "scale",
        "params": {
          "factor": 0.001
        }
      },
      "required": true
    },
    {
      "sourceField": "mode",
      "targetField": "status",
      "transform": {
        "type": "enum",
        "params": {
          "enumValues": {
            "JOG": "idle",
            "AUTO": "running",
            "MDI": "running",
            "EDIT": "paused",
            "REF": "initializing"
          }
        }
      },
      "required": true
    }
  ]
}
```

##### 3.6.3 Пример адаптера для Siemens S7

```json
{
  "id": "adapter-siemens-s7",
  "deviceType": "SIEMENS_S7",
  "source": "mqtt",
  "version": 1,
  "name": "Siemens S7 PLC Adapter",
  "description": "Transforms Siemens S7 MQTT messages to canonical format",
  "transformations": [
    {
      "sourceField": "DB100.DBD0",
      "targetField": "temperature",
      "transform": {
        "type": "scale",
        "params": {
          "factor": 0.1
        }
      },
      "required": true
    },
    {
      "sourceField": "DB100.DBD4",
      "targetField": "pressure",
      "transform": {
        "type": "offset",
        "params": {
          "offset": -1013.25
        }
      },
      "required": true
    },
    {
      "sourceField": "DB100.DBW8",
      "targetField": "motor_speed",
      "transform": {
        "type": "direct"
      },
      "required": true
    }
  ]
}
```

##### 3.6.4 Message Adapter Service

```typescript
class MessageAdapterService {
  // Загрузка адаптеров из PostgreSQL
  async loadAdapters(): Promise<void> {
    const adapters = await this.adapterRepository.findAll();
    this.cacheAdapters(adapters);
  }

  // Поиск адаптера по deviceId и source (приоритет)
  findAdapter(deviceId: string, source: string): MessageAdapter | null {
    // Сначала ищем по deviceId
    let adapter = this.adapters.find(
      (a) => a.deviceId === deviceId && a.source === source,
    );

    if (!adapter) {
      // Если не нашли, ищем по deviceType
      const device = this.deviceService.getDevice(deviceId);
      if (device) {
        adapter = this.adapters.find(
          (a) => a.deviceType === device.type && a.source === source,
        );
      }
    }

    return adapter || null;
  }

  // Применение трансформаций к входящему сообщению
  transform(
    payload: Record<string, unknown>,
    adapter: MessageAdapter,
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const rule of adapter.transformations) {
      const sourceValue = payload[rule.sourceField];

      // Проверка обязательного поля
      if (rule.required && sourceValue === undefined) {
        if (rule.defaultValue !== undefined) {
          result[rule.targetField] = rule.defaultValue;
        }
        continue;
      }

      // Применение трансформации
      const transformedValue = this.applyTransform(sourceValue, rule.transform);
      result[rule.targetField] = transformedValue;
    }

    return result;
  }

  private applyTransform(
    value: unknown,
    operation: TransformOperation,
  ): unknown {
    switch (operation.type) {
      case 'direct':
        return value;

      case 'map':
        return operation.params?.mapping?.[String(value)] ?? value;

      case 'scale':
        const factor = operation.params?.factor ?? 1;
        return Number(value) * factor;

      case 'offset':
        const offset = operation.params?.offset ?? 0;
        return Number(value) + offset;

      case 'enum':
        return operation.params?.enumValues?.[String(value)] ?? value;

      case 'formula':
        return this.evaluateFormula(operation.params?.formula, value);

      default:
        return value;
    }
  }

  private evaluateFormula(formula: string, value: unknown): unknown {
    try {
      const x = Number(value);
      return eval(formula.replace(/x/g, x.toString()));
    } catch (error) {
      this.logger.error(`Failed to evaluate formula: ${formula}`, error);
      return value;
    }
  }
}
```

##### 3.6.5 Файловая структура для адаптеров

```
config/
  adapters/
    mqtt/
      fanuc-cnc-001.json
      siemens-s7.json
      heidenhain.json
    api/
      default-api-adapter.json
    modbus/
      modbus-rtu-adapter.json
    serial/
      serial-rs232-adapter.json
```

**Загрузка с диска:**

```typescript
class AdapterLoader {
  async loadFromDisk(): Promise<MessageAdapter[]> {
    const adapters: MessageAdapter[] = [];
    const adapterDirs = [
      'config/adapters/mqtt',
      'config/adapters/api',
      'config/adapters/modbus',
      'config/adapters/serial',
    ];

    for (const dir of adapterDirs) {
      const files = await fs.readdir(dir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          const content = await fs.readFile(path.join(dir, file), 'utf-8');
          const adapter = JSON.parse(content);
          adapters.push(adapter);
        }
      }
    }

    return adapters;
  }

  async saveToDatabase(adapters: MessageAdapter[]): Promise<void> {
    for (const adapter of adapters) {
      await this.adapterRepository.upsert(adapter);
    }
  }
}
```

### 4. OPC Projection Layer

**Ответственность:**

- Единственный слой, взаимодействующий с node-opcua
- Non-blocking обновление AddressSpace
- Batching (update каждые N ms)
- Change detection (не писать если значение не изменилось)
- **Только runtime broadcasting, без historizing**

#### 4.1 OPC Projection Service

```typescript
interface OpcProjectionConfig {
  batchSize: number; // Батч обновлений (default: 100)
  batchInterval: number; // Интервал батча (default: 50ms)
  changeDetection: boolean; // Включить change detection (default: true)
}

interface OpcProjectionService {
  initialize(): Promise<void>;
  createDevice(deviceConfig: DeviceConfig): Promise<void>;
  updateVariable(
    deviceId: string,
    variableName: string,
    measurement: ProcessedMeasurement,
  ): Promise<void>;
  updateBatch(measurements: ProcessedMeasurement[]): Promise<void>;
  removeDevice(deviceId: string): Promise<void>;
  getDeviceStatus(deviceId: string): Promise<DeviceStatus>;
}

interface DeviceStatus {
  deviceId: string;
  status: 'ONLINE' | 'OFFLINE' | 'STALE';
  lastSeen: Date;
  variables: VariableStatus[];
}

interface VariableStatus {
  name: string;
  value: unknown;
  quality: 'GOOD' | 'BAD' | 'UNCERTAIN';
  statusCode: number;
  lastUpdate: Date;
}
```

#### 4.2 Batching Strategy

```typescript
class OpcProjectionBatcher {
  private buffer: Map<string, ProcessedMeasurement[]> = new Map();
  private timer: NodeJS.Timeout;

  async addMeasurement(measurement: ProcessedMeasurement): Promise<void> {
    const deviceId = measurement.deviceId;
    if (!this.buffer.has(deviceId)) {
      this.buffer.set(deviceId, []);
    }
    this.buffer.get(deviceId)!.push(measurement);

    if (this.shouldFlush()) {
      await this.flush();
    }
  }

  private shouldFlush(): boolean {
    return (
      this.totalBufferSize() >= this.config.batchSize ||
      this.timeSinceLastFlush() >= this.config.batchInterval
    );
  }

  private async flush(): Promise<void> {
    const batches = Array.from(this.buffer.entries());
    await Promise.all(
      batches.map(([deviceId, measurements]) =>
        this.opcService.updateDeviceVariables(deviceId, measurements),
      ),
    );
    this.buffer.clear();
  }

  private totalBufferSize(): number {
    let total = 0;
    for (const measurements of this.buffer.values()) {
      total += measurements.length;
    }
    return total;
  }
}
```

#### 4.3 Change Detection

```typescript
class ChangeDetectionService {
  private lastKnownValues: Map<string, unknown> = new Map();

  hasChanged(deviceId: string, variableName: string, value: unknown): boolean {
    const key = `${deviceId}:${variableName}`;
    const lastValue = this.lastKnownValues.get(key);
    const changed = !this.isEqual(lastValue, value);

    if (changed) {
      this.lastKnownValues.set(key, value);
    }

    return changed;
  }

  private isEqual(a: unknown, b: unknown): boolean {
    // Простое сравнение, можно улучшить с deepEqual
    return JSON.stringify(a) === JSON.stringify(b);
  }
}
```

**Важно:**

- Нет historizing
- Только текущие значения в OPC AddressSpace
- Старые данные перезаписываются без сохранения

### 5. Configuration Management

**Ответственность:**

- Versioned configuration в PostgreSQL
- Audit trail
- Immutable snapshots
- Rollback через version id

#### 5.1 Configuration Model

```typescript
interface DeviceConfig {
  id: string;
  name: string;
  type: string;
  section: string;
  description: string;
  status: 'ACTIVE' | 'INACTIVE' | 'DELETED';
  createdAt: Date;
  updatedAt: Date;
  version: number;
  dataSources: DataSource[];
  variables: VariableConfig[];
}

interface DataSource {
  id: string;
  type: 'mqtt' | 'api' | 'modbus' | 'serial';
  config: Record<string, unknown>;
}

interface VariableConfig {
  id: string;
  name: string;
  browseName: string;
  dataType: UADataType;
  description: string;
  accessLevel: AccessLevel;
  minimumSamplingInterval?: number;
  unit?: string;
  constraints?: {
    min?: number;
    max?: number;
  };
}

interface ConfigVersion {
  version: number;
  deviceId: string;
  config: DeviceConfig;
  createdBy: string;
  createdAt: Date;
  comment: string;
}
```

#### 5.1.1 Device Type Schemas

**Ответственность:**
- Хранение схем типов устройств
- Загрузка схем с диска при старте
- Синхронизация с PostgreSQL
- Versioning схем

**Файловая структура:**
```
config/
  schemas/
    device-types/
      cnc_mill.json
      temp_sensor.json
      siemens_s7.json
      fanuc_cnc.json
```

**Пример схемы типа устройства:**
```json
{
  "id": "cnc-mill-type",
  "name": "CNC Mill Type",
  "type_id": "CNC_MILL",
  "description": "5-axis CNC milling machine type",
  "version": 1,
  "variables": [
    {
      "id": "var-spindle-speed",
      "name": "spindle_speed",
      "browseName": "SpindleSpeed",
      "dataType": "Double",
      "description": "Spindle speed in RPM",
      "accessLevel": "CurrentRead",
      "unit": "RPM",
      "constraints": {
        "min": 0,
        "max": 24000
      },
      "required": true
    },
    {
      "id": "var-tool-number",
      "name": "tool_number",
      "browseName": "ToolNumber",
      "dataType": "Int32",
      "description": "Current tool number",
      "accessLevel": "CurrentRead",
      "required": true
    },
    {
      "id": "var-axis-x",
      "name": "axis_x",
      "browseName": "AxisX",
      "dataType": "Double",
      "description": "X-axis position in mm",
      "accessLevel": "CurrentRead",
      "unit": "mm",
      "required": true
    },
    {
      "id": "var-axis-y",
      "name": "axis_y",
      "browseName": "AxisY",
      "dataType": "Double",
      "description": "Y-axis position in mm",
      "accessLevel": "CurrentRead",
      "unit": "mm",
      "required": true
    },
    {
      "id": "var-axis-z",
      "name": "axis_z",
      "browseName": "AxisZ",
      "dataType": "Double",
      "description": "Z-axis position in mm",
      "accessLevel": "CurrentRead",
      "unit": "mm",
      "required": true
    },
    {
      "id": "var-status",
      "name": "status",
      "browseName": "Status",
      "dataType": "String",
      "description": "Machine status",
      "accessLevel": "CurrentRead",
      "constraints": {
        "enum": ["idle", "running", "paused", "error", "initializing"]
      },
      "required": true
    }
  ]
}
```

**Загрузка с диска:**
```typescript
class DeviceTypeSchemaLoader {
  async loadFromDisk(): Promise<DeviceTypeSchema[]> {
    const schemas: DeviceTypeSchema[] = [];
    const schemaDir = 'config/schemas/device-types';

    const files = await fs.readdir(schemaDir);
    for (const file of files) {
      if (file.endsWith('.json')) {
        const content = await fs.readFile(path.join(schemaDir, file), 'utf-8');
        const schema = JSON.parse(content);
        schemas.push(schema);
      }
    }

    return schemas;
  }

  async syncToDatabase(schemas: DeviceTypeSchema[]): Promise<void> {
    for (const schema of schemas) {
      await this.deviceTypeRepository.upsert(schema);
    }
  }
}
```

#### 5.1.2 Message Adapters Repository

**Ответственность:**
- Хранение адаптеров сообщений для разных форматов
- Загрузка адаптеров с диска при старте
- Синхронизация с PostgreSQL
- Versioning адаптеров

**Файловая структура:**
```
config/
  adapters/
    mqtt/
      fanuc-cnc-001.json
      siemens-s7.json
      heidenhain.json
    api/
      default-api-adapter.json
    modbus/
      modbus-rtu-adapter.json
    serial/
      serial-rs232-adapter.json
```

**Подробное описание адаптеров уже приведено в разделе 3.6 Message Adapter Lookup.**

**Загрузка с диска:**
```typescript
class MessageAdapterLoader {
  async loadFromDisk(): Promise<MessageAdapter[]> {
    const adapters: MessageAdapter[] = [];
    const adapterDirs = [
      'config/adapters/mqtt',
      'config/adapters/api',
      'config/adapters/modbus',
      'config/adapters/serial'
    ];

    for (const dir of adapterDirs) {
      const files = await fs.readdir(dir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          const content = await fs.readFile(path.join(dir, file), 'utf-8');
          const adapter = JSON.parse(content);
          adapters.push(adapter);
        }
      }
    }

    return adapters;
  }

  async syncToDatabase(adapters: MessageAdapter[]): Promise<void> {
    for (const adapter of adapters) {
      await this.messageAdapterRepository.upsert(adapter);
    }
  }
}
```
#### 5.2 Database Schema (PostgreSQL)

```sql
-- Devices table
CREATE TABLE devices (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(100) NOT NULL,
  section VARCHAR(100) NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  version INTEGER DEFAULT 1
);

-- Device versions (for versioning)
CREATE TABLE device_versions (
  id SERIAL PRIMARY KEY,
  device_id VARCHAR(255) REFERENCES devices(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  config JSONB NOT NULL,
  created_by VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  comment TEXT,
  UNIQUE(device_id, version)
);

-- Variables
CREATE TABLE variables (
  id VARCHAR(255) PRIMARY KEY,
  device_id VARCHAR(255) REFERENCES devices(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  browse_name VARCHAR(255) NOT NULL,
  data_type VARCHAR(50) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Device Types Schemas (loaded from disk, stored in DB)
CREATE TABLE device_types (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  type_id VARCHAR(100) NOT NULL,
  description TEXT,
  schema JSONB NOT NULL,
  variables JSONB NOT NULL,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Device Type Versions (for versioning)
CREATE TABLE device_type_versions (
  id SERIAL PRIMARY KEY,
  device_type_id VARCHAR(255) REFERENCES device_types(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  schema JSONB NOT NULL,
  variables JSONB NOT NULL,
  created_by VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  comment TEXT,
  UNIQUE(device_type_id, version)
);

-- Message Adapters (loaded from disk, stored in DB)
CREATE TABLE message_adapters (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  device_id VARCHAR(255) REFERENCES devices(id) ON DELETE SET NULL,
  device_type VARCHAR(100),
  source VARCHAR(50) NOT NULL,
  transformations JSONB NOT NULL,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(device_id, source),
  UNIQUE(device_type, source)
);

-- Message Adapter Versions (for versioning)
CREATE TABLE message_adapter_versions (
  id SERIAL PRIMARY KEY,
  message_adapter_id VARCHAR(255) REFERENCES message_adapters(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  transformations JSONB NOT NULL,
  created_by VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  comment TEXT,
  UNIQUE(message_adapter_id, version)
);

-- Audit log
CREATE TABLE config_audit_log (
  id SERIAL PRIMARY KEY,
  device_id VARCHAR(255) REFERENCES devices(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL,
  old_version INTEGER,
  new_version INTEGER,
  changed_by VARCHAR(100),
  changed_at TIMESTAMP DEFAULT NOW(),
  changes JSONB
);

-- Indexes
CREATE INDEX idx_devices_type ON devices(type);
CREATE INDEX idx_devices_section ON devices(section);
CREATE INDEX idx_device_versions_device_id ON device_versions(device_id);
CREATE INDEX idx_variables_device_id ON variables(device_id);
CREATE INDEX idx_device_types_type_id ON device_types(type_id);
CREATE INDEX idx_device_type_versions_device_type_id ON device_type_versions(device_type_id);
CREATE INDEX idx_message_adapters_device_id ON message_adapters(device_id);
CREATE INDEX idx_message_adapters_device_type ON message_adapters(device_type);
CREATE INDEX idx_message_adapters_source ON message_adapters(source);
CREATE INDEX idx_message_adapter_versions_message_adapter_id ON message_adapter_versions(message_adapter_id);
CREATE INDEX idx_config_audit_log_device_id ON config_audit_log(device_id);
CREATE INDEX idx_config_audit_log_changed_at ON config_audit_log(changed_at);
```

#### 5.3 Configuration API

```typescript
// Device management
GET    /api/v2/config/devices
GET    /api/v2/config/devices/:id
GET    /api/v2/config/devices/:id/versions        // Все версии
GET    /api/v2/config/devices/:id/versions/:version // Конкретная версия
POST   /api/v2/config/devices
PUT    /api/v2/config/devices/:id
DELETE /api/v2/config/devices/:id
POST   /api/v2/config/devices/:id/rollback/:version  // Rollback

// Variable management
GET    /api/v2/config/devices/:id/variables
POST   /api/v2/config/devices/:id/variables
PUT    /api/v2/config/devices/:id/variables/:variableId
DELETE /api/v2/config/devices/:id/variables/:variableId

// Device Type management
GET    /api/v2/config/device-types
GET    /api/v2/config/device-types/:id
GET    /api/v2/config/device-types/:id/versions        // Все версии
GET    /api/v2/config/device-types/:id/versions/:version // Конкретная версия
POST   /api/v2/config/device-types
PUT    /api/v2/config/device-types/:id
DELETE /api/v2/config/device-types/:id
POST   /api/v2/config/device-types/:id/rollback/:version  // Rollback

// Message Adapter management
GET    /api/v2/config/message-adapters
GET    /api/v2/config/message-adapters/:id
GET    /api/v2/config/message-adapters/:id/versions        // Все версии
GET    /api/v2/config/message-adapters/:id/versions/:version // Конкретная версия
POST   /api/v2/config/message-adapters
PUT    /api/v2/config/message-adapters/:id
DELETE /api/v2/config/message-adapters/:id
POST   /api/v2/config/message-adapters/:id/rollback/:version  // Rollback

// Config snapshot
POST   /api/v2/config/snapshot                    // Создать snapshot
GET    /api/v2/config/snapshot/:id                 // Получить snapshot
DELETE /api/v2/config/snapshot/:id                 // Удалить snapshot
POST   /api/v2/config/snapshot/:id/restore         // Восстановить из snapshot

// Audit log
GET    /api/v2/config/audit-log
GET    /api/v2/config/audit-log/:deviceId
```

### 6. High Availability Strategy

#### 6.1 Single Instance (Рекомендуется для Phase 1)

**Single OPC instance + Multiple ingest instances (если нужно)**

```
┌─────────────────────────────────────────────────────────┐
│                     Kubernetes Cluster                    │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌─────────────────────────────────────────────────┐     │
│  │             OPC CNC Hub Pod                      │     │
│  │  • Ingestion Layer                               │     │
│  │  • Event Buffer (In-Memory)                       │     │
│  │  • Processing Core (In-Memory)                    │     │
│  │  • OPC Projection (In-Memory)                     │     │
│  │  • OPC UA Server                                  │     │
│  │  • Runtime State (In-Memory)                     │     │
│  └─────────────────────────────────────────────────┘     │
│                                                           │
│  ┌─────────────┐  ┌─────────────┐                        │
│  │ Config DB   │  │  External   │                        │
│  │ (PostgreSQL)│  │  Services   │                        │
│  │             │  │ (Historian) │                        │
│  └─────────────┘  └─────────────┘                        │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

**Преимущества:**

- Простая реализация
- Консистентное состояние
- Быстрый startup
- Минимальные ресурсы

**Ограничения:**

- Single point of failure (OPC)
- Runtime state теряется при перезапуске
- Нет horizontal scaling для OPC

**Примечание:**
Так как мы работаем только со свежими данными в памяти, single instance приемлем для Phase 1. При необходимости HA в Phase 2 можно внедрить Active/Passive с быстрым takeover.

### 7. Monitoring & Observability

#### 7.1 Metrics (In-Memory)

```typescript
interface Metrics {
  // Ingestion metrics
  ingestion: {
    messagesReceived: Counter;
    messagesAccepted: Counter;
    messagesRejected: Counter;
    processingLatency: Histogram;
  };

  // Event buffer metrics
  eventBuffer: {
    bufferSize: Gauge;
    droppedCount: Counter;
    retriedCount: Counter;
    avgProcessingTime: Gauge;
    overflowCount: Counter;
  };

  // Processing metrics
  processing: {
    validationErrors: Counter;
    mappingErrors: Counter;
    qualityGood: Counter;
    qualityBad: Counter;
    qualityUncertain: Counter;
  };

  // OPC projection metrics
  opcProjection: {
    updateCount: Counter;
    updateLatency: Histogram;
    batchCount: Counter;
    changeDetectionSkipped: Counter;
  };

  // Runtime state metrics
  runtimeState: {
    devicesOnline: Gauge;
    devicesOffline: Gauge;
    devicesStale: Gauge;
    variablesUpdated: Counter;
  };

  // System metrics
  system: {
    memoryUsage: Gauge;
    cpuUsage: Gauge;
    eventLoopLag: Gauge;
  };
}
```

#### 7.2 Health Checks

```typescript
interface HealthCheck {
  status: 'up' | 'down' | 'degraded';
  components: {
    ingestion: ComponentStatus;
    eventBuffer: ComponentStatus;
    processing: ComponentStatus;
    opcProjection: ComponentStatus;
    configDb: ComponentStatus;
    opcServer: ComponentStatus;
  };
  uptime: number;
  timestamp: Date;
}

interface ComponentStatus {
  status: 'up' | 'down' | 'degraded';
  details?: {
    message?: string;
    latency?: number;
    error?: string;
    bufferStatus?: 'OK' | 'WARNING' | 'CRITICAL';
  };
}

// Liveness probe (Kubernetes)
GET /health/live
{
  "status": "up"
}

// Readiness probe (Kubernetes)
GET /health/ready
{
  "status": "up",
  "components": {
    "eventBuffer": { "status": "up", "details": { "bufferStatus": "OK" } },
    "processing": { "status": "up" },
    "opcProjection": { "status": "up" }
  }
}
```

### 8. Security Module

#### 8.1 API Authentication

```typescript
// JWT Authentication
interface JwtConfig {
  secret: string;
  expiresIn: string;
  refreshTokenExpiresIn: string;
}

// API Keys
interface ApiKey {
  id: string;
  key: string;
  name: string;
  permissions: string[];
  expiresAt?: Date;
  createdAt: Date;
}

// Guards
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'operator')
@Controller('api/v2/config')
export class ConfigController {
  // ...
}
```

#### 8.2 Rate Limiting

```typescript
interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

// Per-client rate limiting
@Throttle(100, 60) // 100 requests per minute
@Controller('api/v2/ingest')
export class IngestController {
  // ...
}

// Per-IP rate limiting
@Throttle({ limit: 1000, ttl: 60 })
@Controller('api/v2/data')
export class DataController {
  // ...
}
```

#### 8.3 OPC UA Security

```typescript
interface OpcSecurityConfig {
  securityPolicy: 'None' | 'Basic128Rsa15' | 'Basic256' | 'Basic256Sha256';
  securityMode: 'None' | 'Sign' | 'SignAndEncrypt';
  authentication: {
    anonymous: boolean;
    usernamePassword?: boolean;
    certificates?: boolean;
  };
  encryption: {
    certificateFile: string;
    privateKeyFile: string;
    trustedCertificatesDir: string;
  };
}
```

#### 8.4 Audit Trail

```typescript
interface AuditEvent {
  id: string;
  timestamp: Date;
  userId: string;
  clientId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  ipAddress: string;
  userAgent: string;
  details: Record<string, unknown>;
}

// Audit endpoints
GET /api/v2/audit-log
GET /api/v2/audit-log/:deviceId
GET /api/v2/audit-log/actions/:action
```

## Установка и запуск

### Предварительные требования

- Node.js >= 20.x
- pnpm >= 8.x
- PostgreSQL >= 15.x
- MQTT Broker (Mosquitto, EMQX, или другой)

### Установка зависимостей

```bash
pnpm install
```

### Конфигурация

Создайте файл `config/local.yml`:

```yaml
# OPC UA Configuration
opc:
  port: 4840
  endpoint: 'opc.tcp://localhost:4840'
  security:
    policy: 'None'
    mode: 'None'
  server:
    applicationName: 'OPC CNC Hub'
    applicationUri: 'urn:opc-cnc-hub:server'
    productName: 'OPC CNC Hub'
    productUri: 'urn:opc-cnc-hub:product'

# MQTT Configuration
mqtt:
  broker: 'mqtt://localhost:1883'
  clientId: 'opc-cnc-hub'
  username: null
  password: null
  qos: 1
  reconnectPeriod: 5000
  connectTimeout: 10000
  clean: true

# Event Buffer Configuration (In-Memory Only)
eventBuffer:
  maxSize: 10000
  overflowPolicy: 'DROP_OLDEST' # "DROP_OLDEST" | "REJECT"
  retryAttempts: 3
  retryDelay: 1000
  maxAge: 30000 # 30 seconds - события старше 30с отбрасываются

# Database Configuration
database:
  host: 'localhost'
  port: 5432
  database: 'opc_cnc_hub'
  username: 'postgres'
  password: 'postgres'
  ssl: false

# OPC Projection Configuration
opcProjection:
  batchSize: 100
  batchInterval: 50
  changeDetection: true

# Security Configuration
security:
  jwt:
    secret: 'your-secret-key-change-in-production'
    expiresIn: '24h'
    refreshTokenExpiresIn: '7d'
  apiKeys:
    enabled: true
  rateLimiting:
    enabled: true
    windowMs: 60000
    maxRequests: 100

# Monitoring Configuration
monitoring:
  metrics:
    enabled: true
    port: 9090

# Logging Configuration
logging:
  level: 'INFO' # "DEBUG" | "INFO" | "WARN" | "ERROR"
  transports:
    - type: 'console'
    - type: 'file'
      filename: 'logs/combined.log'
      maxsize: 10485760 # 10MB
      maxFiles: 5
```

### Запуск в режиме разработки

```bash
# Переменные окружения
export NODE_ENV=development
export CONFIG_PATH=config/local.yml

# Запуск
pnpm run start:dev
```

### Запуск в продакшн

```bash
# Сборка
pnpm run build

# Запуск
pnpm run start:prod
```

### Проверка

```bash
# Проверка OPC UA сервера
# Используйте UaExpert или другой OPC клиент
opc.tcp://localhost:4840

# Проверка Health
curl http://localhost:3000/health/live

# Проверка Readiness
curl http://localhost:3000/health/ready

# Проверка API
curl http://localhost:3000/api/v2/config/devices
```

## Развертывание

### Docker

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Copy source
COPY . .

# Build
RUN pnpm run build

# Create directories
RUN mkdir -p logs config

# Expose ports
EXPOSE 3000 4840 9090

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/health/live || exit 1

# Run
CMD ["pnpm", "run", "start:prod"]
```

### Docker Compose

```yaml
version: '3.8'

services:
  # MQTT Broker
  mqtt:
    image: eclipse-mosquitto:2
    ports:
      - '1883:1883'
    volumes:
      - ./mosquitto/config:/mosquitto/config
      - ./mosquitto/data:/mosquitto/data
      - ./mosquitto/logs:/mosquitto/logs
    restart: unless-stopped

  # PostgreSQL
  postgres:
    image: postgres:15-alpine
    ports:
      - '5432:5432'
    environment:
      POSTGRES_USER: opc_cnc_hub
      POSTGRES_PASSWORD: opc_cnc_hub_password
      POSTGRES_DB: opc_cnc_hub
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ./database/schema.sql:/docker-entrypoint-initdb.d/schema.sql
    restart: unless-stopped

  # OPC CNC Hub
  opc-cnc-hub:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - '3000:3000'
      - '4840:4840'
      - '9090:9090'
    volumes:
      - ./config:/app/config
      - ./logs:/app/logs
    environment:
      NODE_ENV: production
      CONFIG_PATH: config/production.yml
    depends_on:
      - mqtt
      - postgres
    restart: unless-stopped

volumes:
  postgres-data:
```

### Kubernetes

#### ConfigMap

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: opc-cnc-hub-config
data:
  production.yml: |
    opc:
      port: 4840
      endpoint: "opc.tcp://0.0.0.0:4840"
      security:
        policy: "None"
        mode: "None"

    mqtt:
      broker: "mqtt://mqtt-service:1883"
      clientId: "opc-cnc-hub"
      qos: 1

    eventBuffer:
      maxSize: 10000
      overflowPolicy: "DROP_OLDEST"
      maxAge: 30000  # 30 seconds

    database:
      host: "postgres-service"
      port: 5432
      database: "opc_cnc_hub"
      username: "opc_cnc_hub"
      password: "${DB_PASSWORD}"

    opcProjection:
      batchSize: 100
      batchInterval: 50
      changeDetection: true

    monitoring:
      metrics:
        enabled: true
        port: 9090
```

#### Secret

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: opc-cnc-hub-secrets
type: Opaque
data:
  DB_PASSWORD: b3BjX2NuY19odWJfcGFzc3dvcmQ=
  JWT_SECRET: eW91ci1zZWNyZXQta2V5LWNoYW5nZS1pbi1wcm9kdWN0aW9u
```

#### Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: opc-cnc-hub
  labels:
    app: opc-cnc-hub
spec:
  replicas: 1
  selector:
    matchLabels:
      app: opc-cnc-hub
  template:
    metadata:
      labels:
        app: opc-cnc-hub
    spec:
      containers:
        - name: opc-cnc-hub
          image: opc-cnc-hub:latest
          ports:
            - containerPort: 3000
              name: http
            - containerPort: 4840
              name: opc
            - containerPort: 9090
              name: metrics
          env:
            - name: NODE_ENV
              value: 'production'
            - name: DB_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: opc-cnc-hub-secrets
                  key: DB_PASSWORD
            - name: JWT_SECRET
              valueFrom:
                secretKeyRef:
                  name: opc-cnc-hub-secrets
                  key: JWT_SECRET
          volumeMounts:
            - name: config
              mountPath: /app/config
            - name: logs
              mountPath: /app/logs
          livenessProbe:
            httpGet:
              path: /health/live
              port: http
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /health/ready
              port: http
            initialDelaySeconds: 10
            periodSeconds: 5
          resources:
            requests:
              memory: '512Mi'
              cpu: '500m'
            limits:
              memory: '1Gi'
              cpu: '1000m'
      volumes:
        - name: config
          configMap:
            name: opc-cnc-hub-config
        - name: logs
          emptyDir: {}
```

#### Service

```yaml
apiVersion: v1
kind: Service
metadata:
  name: opc-cnc-hub-http
spec:
  selector:
    app: opc-cnc-hub
  ports:
    - port: 3000
      targetPort: http
      name: http
    - port: 9090
      targetPort: metrics
      name: metrics
  type: LoadBalancer

---
apiVersion: v1
kind: Service
metadata:
  name: opc-cnc-hub-opc
spec:
  selector:
    app: opc-cnc-hub
  ports:
    - port: 4840
      targetPort: opc
      name: opc
  type: LoadBalancer
```

## API Documentation

### Health Endpoints

```bash
# Liveness probe
GET /health/live
Response:
{
  "status": "up",
  "timestamp": "2024-01-15T10:30:00.000Z"
}

# Readiness probe
GET /health/ready
Response:
{
  "status": "up",
  "components": {
    "ingestion": {
      "status": "up",
      "details": {
        "latency": 15
      }
    },
    "eventBuffer": {
      "status": "up",
      "details": {
        "size": 1234,
        "bufferStatus": "OK"
      }
    },
    "processing": {
      "status": "up"
    },
    "opcProjection": {
      "status": "up"
    },
    "configDb": {
      "status": "up",
      "details": {
        "latency": 5
      }
    },
    "opcServer": {
      "status": "up"
    }
  },
  "uptime": 3600,
  "timestamp": "2024-01-15T10:30:00.000Z"
}

# Detailed health
GET /health
Response:
{
  "status": "up",
  "components": { /* same as ready */ },
  "version": "2.0.0",
  "gitCommit": "abc123",
  "buildTime": "2024-01-15T10:00:00.000Z",
  "uptime": 3600,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Configuration API

```bash
# Get all devices
GET /api/v2/config/devices
Response:
{
  "devices": [
    {
      "id": "cnc-001",
      "name": "CNC Machine 1",
      "type": "CNC_MILL",
      "section": "Workshop A",
      "description": "5-axis CNC milling machine",
      "status": "ACTIVE",
      "createdAt": "2024-01-15T10:00:00.000Z",
      "updatedAt": "2024-01-15T10:00:00.000Z",
      "version": 1
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 1
  }
}

# Get device by id
GET /api/v2/config/devices/:id
Response:
{
  "id": "cnc-001",
  "name": "CNC Machine 1",
  "type": "CNC_MILL",
  "section": "Workshop A",
  "description": "5-axis CNC milling machine",
  "status": "ACTIVE",
  "createdAt": "2024-01-15T10:00:00.000Z",
  "updatedAt": "2024-01-15T10:00:00.000Z",
  "version": 1,
  "dataSources": [
    {
      "id": "mqtt-001",
      "type": "mqtt",
      "config": {
        "topic": "machines/cnc-001/data",
        "qos": 1
      }
    }
  ],
  "variables": [
    {
      "id": "var-001",
      "name": "spindle_speed",
      "browseName": "SpindleSpeed",
      "dataType": "Double",
      "description": "Spindle speed in RPM",
      "accessLevel": "CurrentRead",
      "minimumSamplingInterval": 1000,
      "unit": "RPM"
    }
  ]
}

# Create device
POST /api/v2/config/devices
Request:
{
  "id": "cnc-002",
  "name": "CNC Machine 2",
  "type": "CNC_MILL",
  "section": "Workshop B",
  "description": "3-axis CNC machine",
  "dataSources": [
    {
      "type": "mqtt",
      "config": {
        "topic": "machines/cnc-002/data",
        "qos": 1
      }
    }
  ],
  "variables": [
    {
      "name": "spindle_speed",
      "browseName": "SpindleSpeed",
      "dataType": "Double",
      "description": "Spindle speed in RPM",
      "accessLevel": "CurrentRead",
      "minimumSamplingInterval": 1000,
      "unit": "RPM"
    }
  ]
}
Response:
{
  "id": "cnc-002",
  "name": "CNC Machine 2",
  "type": "CNC_MILL",
  "section": "Workshop B",
  "description": "3-axis CNC machine",
  "status": "ACTIVE",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z",
  "version": 1,
  "dataSources": [ /* ... */ ],
  "variables": [ /* ... */ ]
}

# Update device
PUT /api/v2/config/devices/:id
Request: (same as POST)
Response:
{
  "id": "cnc-001",
  "version": 2,
  "previousVersion": 1,
  "updatedAt": "2024-01-15T10:31:00.000Z",
  /* ... */
}

# Delete device (soft delete)
DELETE /api/v2/config/devices/:id
Response: 204 No Content

# Get all versions
GET /api/v2/config/devices/:id/versions
Response:
{
  "versions": [
    {
      "version": 2,
      "deviceId": "cnc-001",
      "config": { /* ... */ },
      "createdBy": "user@example.com",
      "createdAt": "2024-01-15T10:31:00.000Z",
      "comment": "Added new variable"
    },
    {
      "version": 1,
      "deviceId": "cnc-001",
      "config": { /* ... */ },
      "createdBy": "user@example.com",
      "createdAt": "2024-01-15T10:00:00.000Z",
      "comment": "Initial version"
    }
  ]
}

# Rollback to version
POST /api/v2/config/devices/:id/rollback/:version
Response:
{
  "id": "cnc-001",
  "version": 3,
  "rolledBackFrom": 1,
  "updatedAt": "2024-01-15T10:32:00.000Z",
  /* ... */
}
```

### Ingestion API

```bash
# Ingest data (MQTT)
# Automatically handled by MQTT ingestor

# Ingest data (REST API)
POST /api/v2/ingest
Request:
{
  "deviceId": "cnc-001",
  "source": "api",
  "payload": {
    "spindle_speed": 2400,
    "tool_number": 5,
    "axis_x": 123.45,
    "axis_y": 67.89,
    "status": "running"
  },
  "sourceTimestamp": 1705313400000,
  "messageId": "msg-001",
  "sequenceNumber": 1
}
Response:
{
  "eventId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "ACCEPTED",
  "timestamp": "2024-01-15T10:30:00.000Z"
}

# Batch ingest
POST /api/v2/ingest/batch
Request:
{
  "events": [
    {
      "deviceId": "cnc-001",
      "source": "api",
      "payload": { /* ... */ }
    },
    {
      "deviceId": "cnc-002",
      "source": "api",
      "payload": { /* ... */ }
    }
  ]
}
Response:
{
  "events": [
    {
      "eventId": "550e8400-e29b-41d4-a716-446655440000",
      "status": "ACCEPTED"
    },
    {
      "eventId": "660e8400-e29b-41d4-a716-446655440001",
      "status": "ACCEPTED"
    }
  ],
  "accepted": 2,
  "rejected": 0
}
```

### Runtime State API

```bash
# Get device runtime state
GET /api/v2/runtime/devices/:id/state
Response:
{
  "deviceId": "cnc-001",
  "status": "ONLINE",
  "lastSeen": "2024-01-15T10:30:00.000Z",
  "heartbeatTimeoutMs": 30000,
  "consecutiveFailures": 0,
  "variables": [
    {
      "name": "spindle_speed",
      "value": 2400,
      "quality": "GOOD",
      "lastUpdate": "2024-01-15T10:29:58.000Z",
      "staleThresholdMs": 60000
    },
    {
      "name": "tool_number",
      "value": 5,
      "quality": "GOOD",
      "lastUpdate": "2024-01-15T10:29:58.000Z",
      "staleThresholdMs": 60000
    }
  ]
}

# Get all devices status
GET /api/v2/runtime/devices/status
Response:
{
  "devices": [
    {
      "deviceId": "cnc-001",
      "status": "ONLINE",
      "lastSeen": "2024-01-15T10:30:00.000Z"
    },
    {
      "deviceId": "cnc-002",
      "status": "STALE",
      "lastSeen": "2024-01-15T10:15:00.000Z"
    }
  ],
  "summary": {
    "online": 1,
    "offline": 0,
    "stale": 1,
    "total": 2
  }
}
```

### Metrics API

```bash
# Get Prometheus metrics
GET /metrics
Response:
# HELP opc_cnc_hub_ingestion_messages_received_total Total messages received
# TYPE opc_cnc_hub_ingestion_messages_received_total counter
opc_cnc_hub_ingestion_messages_received_total 12345

# HELP opc_cnc_hub_ingestion_messages_accepted_total Total messages accepted
# TYPE opc_cnc_hub_ingestion_messages_accepted_total counter
opc_cnc_hub_ingestion_messages_accepted_total 12300

# HELP opc_cnc_hub_ingestion_messages_rejected_total Total messages rejected
# TYPE opc_cnc_hub_ingestion_messages_rejected_total counter
opc_cnc_hub_ingestion_messages_rejected_total 45

# HELP opc_cnc_hub_event_buffer_size Current event buffer size
# TYPE opc_cnc_hub_event_buffer_size gauge
opc_cnc_hub_event_buffer_size 1234

# HELP opc_cnc_hub_opc_projection_update_latency_seconds OPC projection update latency
# TYPE opc_cnc_hub_opc_projection_update_latency_seconds histogram
opc_cnc_hub_opc_projection_update_latency_seconds_bucket{le="0.001"} 1000
opc_cnc_hub_opc_projection_update_latency_seconds_bucket{le="0.005"} 1500
opc_cnc_hub_opc_projection_update_latency_seconds_bucket{le="0.01"} 1900
opc_cnc_hub_opc_projection_update_latency_seconds_bucket{le="+Inf"} 2000
opc_cnc_hub_opc_projection_update_latency_seconds_sum 12.5
opc_cnc_hub_opc_projection_update_latency_seconds_count 2000
```

## Troubleshooting

### Общие проблемы

**Сервис не запускается**

- Проверьте конфигурацию в `config/local.yml`
- Убедитесь, что все зависимости запущены (MQTT, PostgreSQL)
- Проверьте логи: `logs/error.log`
- Проверьте права доступа к файлам

**MQTT соединение не устанавливается**

- Проверьте URL брокера в конфиге
- Убедитесь, что брокер запущен и доступен
- Проверьте аутентификационные данные
- Проверьте firewall правила

**Данные не обновляются в OPC**

- Проверьте топики MQTT
- Проверьте статус устройства через `/api/v2/runtime/devices/:id/state`
- Проверьте event buffer metrics
- Проверьте processing metrics
- Проверьте OPC projection metrics

**Высокая latency от ingestion до OPC**

- Проверьте event buffer size
- Проверьте batch size и interval
- Проверьте processing latency
- Проверьте OPC projection latency

### Логирование

```bash
# Просмотр логов в реальном времени
tail -f logs/combined.log

# Поиск ошибок
grep ERROR logs/error.log

# Логи конкретного компонента
grep "IngestionLayer" logs/combined.log
grep "ProcessingCore" logs/combined.log
grep "OpcProjection" logs/combined.log

# Логи конкретного устройства
grep "deviceId=cnc-001" logs/combined.log
```

### Отладка

```bash
# Запуск в debug режиме
NODE_ENV=development DEBUG=* pnpm run start:dev

# Отладка конкретных компонентов
DEBUG=opc-cnc-hub:* pnpm run start:dev
DEBUG=opc-cnc-hub:ingestion pnpm run start:dev
DEBUG=opc-cnc-hub:processing pnpm run start:dev
DEBUG=opc-cnc-hub:opc pnpm run start:dev

# Отладка node-opcua
DEBUG=node-opcua* pnpm run start:dev

# Отладка MQTT
DEBUG=mqtt* pnpm run start:dev
```

### Мониторинг

```bash
# Проверка метрик
curl http://localhost:9090/metrics

# Проверка health
curl http://localhost:3000/health/live
curl http://localhost:3000/health/ready

# Проверка runtime state
curl http://localhost:3000/api/v2/runtime/devices/status

# Проверка event buffer metrics
curl http://localhost:3000/api/v2/metrics/event-buffer
```

## Roadmap

### v2.0.0 (Current)

- [x] Event-driven architecture
- [x] Separation of Ingestion, Processing, Projection
- [x] Versioned configuration
- [x] Runtime state management (in-memory)
- [x] Quality calculation
- [x] Change detection
- [x] Batching strategy
- [x] In-memory event buffer only

### v2.1.0 (Q2 2024)

- [ ] Modbus TCP интеграция
- [ ] Serial/USB ingesters
- [ ] REST API device connectors
- [ ] Advanced quality calculation
- [ ] Out-of-order handling
- [ ] Idempotency с messageId

### v2.2.0 (Q3 2024)

- [ ] Advanced monitoring с Grafana dashboards
- [ ] Custom alerts и notifications
- [ ] Advanced backpressure strategies
- [ ] Graceful shutdown improvements
- [ ] Cold start warmup optimization

### v2.3.0 (Q4 2024)

- [ ] Active/passive OPC HA
- [ ] Improved error recovery
- [ ] Runtime state persistence (optional)
- [ ] Device templates
- [ ] Bulk configuration operations

### v3.0.0 (Q1 2025)

- [ ] WebSocket subscriptions
- [ ] OPC UA Methods
- [ ] Enterprise features (advanced RBAC, advanced audit)
- [ ] Multi-instance deployment

## Contributing

1. Fork репозитория
2. Создайте feature branch (`git checkout -b feature/amazing-feature`)
3. Commit изменения (`git commit -m 'Add amazing feature'`)
4. Push в branch (`git push origin feature/amazing-feature`)
5. Откройте Pull Request

## Лицензия

UNLICENSED

## Поддержка

Для вопросов и поддержки:

- Email: support@example.com
- Документация: https://docs.example.com
- Issues: GitHub Issues
- Slack: #opc-cnc-hub
