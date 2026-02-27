# Design Document: IngestionModule

## Context

IngestionModule is the first stage of the event pipeline in OPC CNC Hub, responsible for receiving telemetry data from MQTT brokers and REST APIs, converting it to canonical events, and forwarding it to the EventBufferModule. This module is critical for real-time data ingestion and must be highly reliable with automatic recovery from failures.

## Goals / Non-Goals

**Goals:**

- Reliable MQTT broker connection with automatic reconnection
- Dynamic topic subscription management via REST API
- Conversion of raw messages to canonical events
- Forwarding events to EventBufferModule
- Comprehensive error handling and circuit breaker pattern
- Metrics and observability for all operations
- Graceful shutdown with resource cleanup

**Non-Goals:**

- Message persistence (no local storage of messages)
- Message replay capabilities
- Historical data access (in-memory only)
- Complex message transformation (delegated to ProcessingModule)
- Direct OPC UA integration (handled by OpcProjectionModule)

## Decisions

### 0. Architecture: Separation of Concerns

**Decision:** Split MQTT logic into three distinct layers

```
MqttClientService (simple, testable)
    ↓ (used by)
MqttIngestorService (orchestrator, message processing)
    ↓ (uses)
ReconnectionStrategy (pluggable reconnection logic)
```

**Rationale:**

- **MqttClientService** is simple and easy to mock for testing
- **MqttIngestorService** contains business logic without worrying about MQTT internals
- **ReconnectionStrategy** is separate and can be swapped without affecting other layers
- Clear separation makes code more maintainable and testable

**Components:**

- `MqttClientService`: Basic operations only (connect, disconnect, subscribe, unsubscribe, statistics)
- `MqttIngestorService`: Orchestrates message processing, uses SchemaRegistry, forwards to EventBuffer
- `ReconnectionStrategy`: Implements reconnection logic (exponential backoff, retry policy)
- `SchemaRegistry`: Maps topics to message schemas for event creation

### 1. MQTT Client Library

**Decision:** Use existing `mqtt` npm package (already in dependencies)

**Rationale:**

- Package is already listed in dependencies (v5.15.0)
- Well-maintained and widely-used in Node.js ecosystem
- Supports automatic reconnection out of the box
- Compatible with TypeScript
- Provides comprehensive callback-based API for events

**Alternatives considered:**

- `mqtt-connection`: Lower-level, would require more custom code
- `aedes`: MQTT broker implementation (not needed, we're a client)
- Custom implementation: Too much complexity for initial version

### 2. Service Structure

**Decision:** Separate services for different responsibilities

```
MqttClientService      - Simple MQTT client operations (connect, disconnect, subscribe, unsubscribe, stats)
MqttIngestorService    - Orchestrator: message processing, SchemaRegistry integration, reconnection
ReconnectionStrategy    - Pluggable reconnection logic (exponential backoff)
SchemaRegistry         - Maps topics to message schemas
CanonicalEventFactory  - Event creation using SchemaRegistry
ApiIngestorService     - REST API ingestion
IngestionController    - API endpoints
```

**Rationale:**

- **MqttClientService** is minimal and testable - only MQTT operations, no business logic
- **MqttIngestorService** orchestrates without knowing MQTT internals
- **ReconnectionStrategy** is separate - can be changed without touching MqttClientService
- **SchemaRegistry** handles schema mapping - different topics can have different formats
- Separation of concerns: each service has single responsibility
- Testability: MqttClientService can be easily mocked in tests
- Future extensibility: can add other ingestion sources without affecting existing code

**MqttClientService Interface:**

```typescript
class MqttClientService {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  subscribe(topic: string, qos: 0 | 1 | 2): Promise<void>;
  unsubscribe(topic: string): Promise<void>;
  onMessage(callback: (topic: string, payload: Buffer) => void): void;
  getStatistics(): MqttStatistics;
}

interface MqttStatistics {
  isConnected: boolean;
  subscriptionCount: number;
  subscriptions: string[];
  connectCount: number;
  disconnectCount: number;
}
```

**Alternatives considered:**

- Single monolithic service: Would violate single responsibility principle
- Microservices approach: Overkill for monolithic architecture

### 3. EventBuffer Integration

**Decision:** Implement SchemaRegistry to map topics to message schemas

**Rationale:**

- **Flexible message formats:** Different topics can have different message structures
- **Schema validation:** Events are validated against registered schemas
- **Dynamic registration:** Schemas can be added/removed at runtime via API
- **Type safety:** Provides typing information for canonical events

**SchemaRegistry Interface:**

```typescript
interface MessageSchema {
  topic: string
  schema: z.ZodSchema | JSON Schema
  version?: string
  description?: string
}

interface SchemaRegistry {
  register(schema: MessageSchema): void
  unregister(topic: string): void
  get(topic: string): MessageSchema | undefined
  list(): MessageSchema[]
  has(topic: string): boolean
}

class SchemaRegistry implements SchemaRegistry {
  private schemas = new Map<string, MessageSchema>()

  register(schema: MessageSchema): void {
    this.schemas.set(schema.topic, schema);
  }

  get(topic: string): MessageSchema | undefined {
    return this.schemas.get(topic);
  }

  // ... other methods
}
```

**Integration with MqttIngestorService:**

- When subscribing to topic, associate schema with subscription
- When message is received, lookup schema and use for event creation
- Schema is passed to CanonicalEventFactory for validation

**Schema Management API:**

```typescript
// Register schema for topic
POST /api/v2/ingestion/schemas
{
  "topic": "machine/+/telemetry",
  "schema": { ... zod schema ... },
  "version": "1.0"
}

// List all schemas
GET /api/v2/ingestion/schemas

// Get schema for specific topic
GET /api/v2/ingestion/schemas/:topic

// Unregister schema
DELETE /api/v2/ingestion/schemas/:topic
```

**Subscription with Schema:**

```typescript
// Subscribe with schema
POST /api/v2/ingestion/subscribe
{
  "topic": "machine/1/telemetry",
  "qos": 0,
  "schema": {
    "type": "object",
    "properties": {
      "temperature": { "type": "number" },
      "pressure": { "type": "number" }
    }
  }
}
```

**Alternatives considered:**

- Single schema for all topics: Too restrictive, different devices have different formats
- Hard-coded schemas per topic: Not flexible enough for dynamic environment
- Schema per device type: Possible, but SchemaRegistry is more generic

### 5. EventBuffer Integration

**Rationale:**

- EventBufferModule doesn't exist yet
- Avoids circular dependency issues
- Allows independent development of IngestionModule
- Interface provides contract for future implementation

**Alternatives considered:**

- Direct dependency on non-existent module: Would prevent compilation
- Skip event forwarding: Would break architectural design
- EventEmitter pattern: Less explicit than service interface

### 4. Circuit Breaker Pattern

### 6. Default QoS Level

**Decision:** Default QoS level is 0 (at most once)

**Rationale:**

- **Performance:** QoS 0 is fastest with minimal overhead
- **Real-time focus:** OPC CNC Hub prioritizes fresh data over guaranteed delivery
- **Simplicity:** Default configuration works for most use cases
- **Configurable:** Can be overridden per subscription if needed

**Implementation:**

```typescript
// MqttClientService uses default QoS 0
subscribe(topic: string, qos: 0 | 1 | 2 = 0): Promise<void>

// Subscription request with QoS
POST /api/v2/ingestion/subscribe
{
  "topic": "machine/1/telemetry",
  "qos": 0  // defaults to 0 if not specified
}
```

**Alternatives considered:**

- QoS 1 or 2 by default: More overhead, slower for real-time scenarios
- Configurable global QoS: More complex, rarely needed
- Per-device QoS: Overkill for initial implementation

### 7. Circuit Breaker Pattern

**Rationale:**

- Prevents cascading failures from repeated connection attempts
- Provides manual recovery path when broker is permanently unavailable
- Standard pattern for external service integration
- Protects system resources from exhaustion

**Implementation:**

- Track consecutive failures
- Open circuit after threshold is reached
- Half-open state for testing recovery
- Manual reset via API

### 3. Reconnection Strategy

**Decision:** Implement ReconnectionStrategy as separate, pluggable class

**Rationale:**

- **Flexibility:** Easy to change reconnection logic without modifying MqttClientService
- **Testing:** Can mock ReconnectionStrategy in tests
- **Configurability:** Different strategies can be swapped at runtime
- **Separation of concerns:** Reconnection logic is isolated from MQTT client

**Default Strategy - ExponentialBackoffReconnectionStrategy:**

```typescript
interface ReconnectionStrategy {
  shouldReconnect(attempt: number, lastError?: Error): boolean;
  getDelay(attempt: number): number;
  onConnect(): void;
  onDisconnect(): void;
  onReconnectSuccess(attempt: number): void;
}

class ExponentialBackoffReconnectionStrategy implements ReconnectionStrategy {
  constructor(
    private readonly maxAttempts: number,
    private readonly initialDelay: number,
    private readonly maxDelay: number,
    private readonly backoffMultiplier: number,
  ) {}

  shouldReconnect(attempt: number): boolean {
    return attempt < this.maxAttempts;
  }

  getDelay(attempt: number): number {
    return Math.min(
      this.initialDelay * Math.pow(this.backoffMultiplier, attempt),
      this.maxDelay,
    );
  }
}
```

**Connection Statistics:**

- Track connect count (incremented on successful connections)
- Track disconnect count (incremented on disconnections)
- Track current connection state
- All statistics available via `getStatistics()`

**Alternatives considered:**

- Hardcoded reconnection logic in MqttClientService: Less flexible, harder to test
- Multiple strategies with configuration: More complex than single pluggable strategy

### 4. Schema Registry

**Decision:** Dynamic subscription management via REST API

**Rationale:**

- Flexibility: subscriptions can be changed without restart
- Runtime configuration: can respond to operational needs
- API-driven: consistent with rest of system architecture
- No need for YAML-based static configuration

**Alternatives considered:**

- YAML configuration: Too static, requires restart
- Database storage: Overkill, subscriptions don't need persistence
- Hard-coded: Not flexible enough

### 6. Error Handling Strategy

**Decision:** Log and continue (no blocking on individual message errors)

**Rationale:**

- System should remain operational even if some messages fail
- Prevents one bad message from blocking entire pipeline
- Aligns with real-time focus (data freshness > completeness)
- Errors are logged and tracked in metrics

**Alternatives considered:**

- Retry on error: Could cause backpressure, complicates timing
- Dead-letter queue: Adds complexity, not needed for real-time
- Crash on error: Would violate availability requirements

### 7. Connection Lifecycle

**Decision:** Automatic connection on module init, manual trigger via API

**Rationale:**

- Automatic connection: expected behavior for production
- Manual trigger: useful for testing and recovery scenarios
- Graceful degradation: service continues if connection fails initially

**Implementation:**

- `OnModuleInit`: automatically start connection
- `POST /connect`: manual reconnection trigger
- `OnModuleDestroy`: graceful shutdown

### 8. Event ID Generation

**Decision:** Use UUID for event IDs

**Rationale:**

- Guaranteed uniqueness across all events
- No coordination required (no sequence numbers)
- Standard and well-understood format
- Can be generated without database access

**Alternatives considered:**

- Timestamp-based: Risk of collisions in high-throughput scenarios
- Database sequence: Requires DB access, adds latency
- Snowflake-like: More complex than needed

### 9. Metrics Collection

**Decision:** Increment counters for all significant events

**Rationale:**

- Observability is key for operations
- Metrics allow monitoring system health
- Counters for events, gauges for state, histograms for timing
- Aligns with existing MonitoringModule design

**Implementation:**

- Messages received, processed, errors
- Connection attempts, successes, failures
- Subscription count
- Processing time distribution

## Data Flow

```
MQTT Broker
    ↓
MqttIngestorService (connect, subscribe)
    ↓ (message received)
CanonicalEventFactory (create canonical event)
    ↓
EventBufferModule (forward event)
    ↓ (in future: EventBufferModule processes)
ProcessingModule (future: validation, mapping)
```

## External Dependencies

- **mqtt** (v5.15.0): MQTT client library
- **ConfigModule**: Provides MQTT connection settings
- **LoggingModule**: Structured logging
- **EventBufferModule** (future): Event queue and processing
- **MonitoringModule** (future): Metrics and health checks

## API Endpoints

### Connection Management

- `GET /api/v2/ingestion/status` - Get connection status
- `POST /api/v2/ingestion/connect` - Trigger connection
- `POST /api/v2/ingestion/disconnect` - Trigger disconnection

### Subscription Management

- `GET /api/v2/ingestion/subscriptions` - List active subscriptions
- `POST /api/v2/ingestion/subscribe` - Subscribe to topics with optional schema
- `DELETE /api/v2/ingestion/unsubscribe` - Unsubscribe from topics

### Schema Management

- `GET /api/v2/ingestion/schemas` - List all registered schemas
- `GET /api/v2/ingestion/schemas/:topic` - Get schema for specific topic
- `POST /api/v2/ingestion/schemas` - Register new schema for topic
- `DELETE /api/v2/ingestion/schemas/:topic` - Unregister schema

### Data Ingestion

- `POST /api/v2/ingestion/ingest` - Ingest single message
- `POST /api/v2/ingestion/ingest/batch` - Ingest batch of messages

## Types and Interfaces

```typescript
// Connection states
enum ConnectionStatus {
  CONNECTED = 'CONNECTED',
  DISCONNECTED = 'DISCONNECTED',
  RECONNECTING = 'RECONNECTING',
  FAILED = 'FAILED',
}

// QoS levels
type QoS = 0 | 1 | 2;

// MQTT statistics
interface MqttStatistics {
  isConnected: boolean;
  subscriptionCount: number;
  subscriptions: Subscription[];
  connectCount: number;
  disconnectCount: number;
}

// Subscription info
interface Subscription {
  topic: string;
  qos: QoS;
  subscribedAt: Date;
  schema?: MessageSchema;
}

// Message schema
interface MessageSchema {
  topic: string;
  schema: z.ZodSchema;
  version?: string;
  description?: string;
}

// Canonical event structure
interface CanonicalEvent {
  eventId: string;
  source: 'mqtt' | 'api';
  topic?: string;
  payload: Record<string, unknown>;
  timestamp: Date;
  metadata: EventMetadata;
}

// Event metadata
interface EventMetadata {
  [key: string]: unknown;
}

// Connection status response
interface ConnectionStatusResponse {
  status: ConnectionStatus;
  brokerUrl: string;
  clientId: string;
  connectedAt?: Date;
  lastError?: string;
  subscriptionCount: number;
  connectCount: number;
  disconnectCount: number;
}

// Reconnection strategy interface
interface ReconnectionStrategy {
  shouldReconnect(attempt: number, lastError?: Error): boolean;
  getDelay(attempt: number): number;
  onConnect(): void;
  onDisconnect(): void;
  onReconnectSuccess(attempt: number): void;
}

// Schema registry interface
interface SchemaRegistry {
  register(schema: MessageSchema): void;
  unregister(topic: string): void;
  get(topic: string): MessageSchema | undefined;
  list(): MessageSchema[];
  has(topic: string): boolean;
}

// MqttClientService interface
interface MqttClientService {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  subscribe(topic: string, qos: QoS): Promise<void>;
  unsubscribe(topic: string): Promise<void>;
  onMessage(callback: (topic: string, payload: Buffer) => void): void;
  getStatistics(): MqttStatistics;
}

// EventBuffer service interface (placeholder)
interface IEventBufferService {
  push(event: CanonicalEvent): Promise<boolean>;
}
```

## Risks / Trade-offs

### Risk 1: EventBufferModule Not Yet Implemented

**Mitigation:**

- Create interface placeholder with clear contract
- Log warnings when forwarding fails
- Document dependency in code and architecture
- Plan EventBufferModule implementation as next priority

### Risk 2: MQTT Broker Unavailability

**Mitigation:**

- Automatic reconnection with exponential backoff
- Circuit breaker to prevent resource exhaustion
- Status API allows monitoring of connection state
- Manual reconnection trigger for recovery

### Risk 3: Message Loss During High Throughput

**Mitigation:**

- Metrics to monitor message throughput
- Backpressure indication via status API
- Logging of message processing delays
- Consider rate limiting in future if needed

### Risk 4: Memory Pressure from Many Active Subscriptions

**Mitigation:**

- Limit number of subscriptions per client (configurable)
- Monitor subscription count in metrics
- API to clean up unused subscriptions
- Document recommended subscription patterns

### Trade-off 1: No Message Persistence vs Real-Time Focus

**Decision:** In-memory only, no persistence

**Rationale:**

- System is designed for real-time fresh data
- Persistence adds complexity and latency
- Historical data handled by external systems
- Aligns with project architecture (in-memory only)

**Impact:**

- Messages lost if system restarts
- No replay capability
- Not suitable for auditing or compliance

### Trade-off 2: No Retry on Processing Failure vs System Stability

**Decision:** No retry, log and continue

**Rationale:**

- Retry could cause backpressure and timing issues
- Real-time focus favors fresh data over completeness
- Simpler implementation, easier to reason about
- Metrics capture failure rate for monitoring

**Impact:**

- Some messages may be lost on errors
- Higher-level systems must handle missing data
- Requires monitoring to detect high error rates

## Migration Plan

### Phase 1: Implementation (Current change)

- Implement IngestionModule with all services
- Create placeholder for EventBufferModule interface
- Write comprehensive tests
- Integrate into AppModule

### Phase 2: EventBufferModule (Future change)

- Implement actual EventBufferModule
- Update IngestionModule to use real implementation
- Remove placeholder interface
- Test integration between modules

### Phase 3: ProcessingModule (Future change)

- Implement validation, mapping, quality calculation
- Connect EventBufferModule to ProcessingModule
- Test end-to-end pipeline

### Phase 4: Production Deployment

- Monitor metrics in staging environment
- Adjust reconnection parameters if needed
- Tune subscription management based on usage
- Document operational procedures

## Open Questions

1. **Q:** Should we limit the number of concurrent subscriptions?
   - **A:** Start with no limit, add if operational issues arise. Monitor metrics for subscription count.

2. **Q:** What QoS level should be default for subscriptions?
   - **A:** Use QoS 0 for now (at most once). Can be configurable in future via API.

3. **Q:** Should we support wildcard topic subscriptions?
   - **A:** Yes, support MQTT wildcards (+ and #). Document patterns and limitations.

4. **Q:** How should we handle extremely large messages?
   - **A:** Add payload size limit (configurable, default 1MB). Reject oversized messages with error.

5. **Q:** Should we implement message deduplication?
   - **A:** Not in MVP. Add if needed based on operational requirements. messageId tracking could be added later.

## Testing Strategy

### Unit Tests

- Test each service in isolation
- Mock MQTT client, EventBufferModule
- Cover success and error paths
- Test edge cases (null values, malformed data)

### Integration Tests

- Test with mock MQTT broker (e.g., Mosquitto in Docker)
- Test reconnection scenarios
- Test subscription lifecycle
- Test error recovery

### E2E Tests

- Test full message flow from MQTT to EventBuffer
- Test API endpoints
- Test shutdown and startup
- Test concurrent subscriptions

### Performance Tests

- Test message throughput at scale
- Test reconnection behavior under load
- Test memory usage with many subscriptions
- Test long-running stability

## Security Considerations

1. **MQTT Authentication:** Use credentials from ConfigModule (username/password)
2. **TLS/SSL:** Support encrypted connections (broker URL with mqtts://)
3. **API Authentication:** Use API keys via SecurityModule (when available)
4. **Rate Limiting:** Implement rate limiting on API endpoints
5. **Input Validation:** Validate all API request payloads
6. **Logging:** Never log sensitive data (passwords, tokens)

## Compliance and Regulatory

- **Data Privacy:** Ensure no sensitive PII is logged or exposed
- **Data Retention:** No message persistence (in-memory only)
- **Audit Trail:** Log all subscription changes for audit
- **Security:** Use TLS for MQTT connections in production
