# Implementation Tasks

## 1. Module Setup and Configuration

- [x] 1.1 Create ingestion module directory structure
- [x] 1.2 Create `ingestion.module.ts` with ConfigModule import and module exports
- [x] 1.3 Create shared types and interfaces (CanonicalEvent, ConnectionStatus, Subscription, ReconnectionStrategy, SchemaRegistry, MqttClientService)
- [x] 1.4 Add IngestionModule to AppModule imports in `src/app.module.ts`

## 2. MqttClientService Implementation

- [x] 2.1 Create `mqtt-client.service.ts` with minimal logic (connect, disconnect, subscribe, unsubscribe, statistics)
- [x] 2.2 Implement `connect()` method with basic MQTT client initialization
- [x] 2.3 Implement `disconnect()` method for graceful shutdown
- [x] 2.4 Implement `subscribe(topic, qos)` method with default QoS 0
- [x] 2.5 Implement `unsubscribe(topic)` method
- [x] 2.6 Implement `onMessage(callback)` method for message handling
- [x] 2.7 Implement `getStatistics()` method returning connection stats and subscription info
- [x] 2.8 Track connection statistics (connectCount, disconnectCount)
- [x] 2.9 Track subscription list (topic, qos, subscribedAt)
- [x] 2.10 Add structured logging for all operations
- [x] 2.11 Write unit tests for MqttClientService (easy to mock)
- [x] 2.12 Add service to IngestionModule providers and exports

## 3. ReconnectionStrategy Implementation

- [x] 3.1 Create `reconnection-strategy.interface.ts` defining strategy contract
- [x] 3.2 Create `exponential-backoff-reconnection-strategy.ts` with default implementation
- [x] 3.3 Implement `shouldReconnect(attempt, lastError)` method
- [x] 3.4 Implement `getDelay(attempt)` method with exponential backoff
- [x] 3.5 Implement `onConnect()`, `onDisconnect()`, `onReconnectSuccess()` hooks
- [x] 3.6 Make strategy configurable (maxAttempts, initialDelay, maxDelay, multiplier)
- [x] 3.7 Write unit tests for ExponentialBackoffReconnectionStrategy
- [x] 3.8 Add strategy to IngestionModule providers

## 4. SchemaRegistry Implementation

- [x] 4.1 Create `schema-registry.interface.ts` defining registry contract
- [x] 4.2 Create `schema-registry.service.ts` with Map-based storage
- [x] 4.3 Implement `register(schema)` method for topic-to-schema mapping
- [x] 4.4 Implement `unregister(topic)` method
- [x] 4.5 Implement `get(topic)` method to retrieve schema
- [x] 4.6 Implement `list()` method to return all schemas
- [x] 4.7 Implement `has(topic)` method to check schema existence
- [x] 4.8 Add validation for schema format
- [x] 4.9 Write unit tests for SchemaRegistry
- [x] 4.10 Add service to IngestionModule providers and exports

## 5. MqttIngestorService Implementation

- [x] 5.1 Create `mqtt-ingestor.service.ts` as orchestrator
- [x] 5.2 Inject MqttClientService for MQTT operations
- [x] 5.3 Inject ReconnectionStrategy for reconnection logic
- [x] 5.4 Inject SchemaRegistry for schema lookup
- [x] 5.5 Implement connection management with ReconnectionStrategy
- [x] 5.6 Implement subscription management with schema association
- [x] 5.7 Implement message handler with SchemaRegistry integration
- [x] 5.8 Implement graceful shutdown
- [x] 5.9 Track connection status and statistics
- [x] 5.10 Add structured logging for all operations
- [x] 5.11 Write comprehensive unit tests (mock MqttClientService)
- [x] 5.12 Add service to IngestionModule providers and exports

## 6. CanonicalEventFactory Implementation

- [x] 6.1 Create `canonical-event-factory.service.ts` with event creation methods
- [x] 6.2 Implement `createFromMqtt(topic, payload, schema)` method with schema validation
- [x] 6.3 Implement `generateEventId()` method for unique ID generation
- [x] 6.4 Implement schema validation using registered schemas
- [x] 6.5 Write unit tests for CanonicalEventFactory
- [x] 6.6 Add service to IngestionModule providers and exports

## 7. EventBuffer Integration Placeholder

- [x] 7.1 Create IEventBufferService interface placeholder
- [x] 7.2 Add event forwarding logic in MqttIngestorService
- [x] 7.3 Note: Actual EventBufferModule will be created in a future change

## 8. API IngestorService Implementation

- [x] 8.1 Create `api-ingestor.service.ts` with request validation
- [x] 8.2 Implement `ingest(request)` method
- [x] 8.3 Implement `ingestBatch(requests)` method
- [x] 8.4 Add rate limiting and payload size validation
- [x] 8.5 Write unit tests for ApiIngestorService
- [x] 8.6 Add service to IngestionModule providers and exports

## 9. IngestionController Implementation

- [x] 9.1 Create `ingestion.controller.ts` with base route `/api/v2/ingestion`
- [x] 9.2 Implement `GET /status` endpoint for connection status
- [x] 9.3 Implement `GET /subscriptions` endpoint to list active subscriptions
- [x] 9.4 Implement `POST /subscribe` endpoint to subscribe to topics with optional schema
- [x] 9.5 Implement `DELETE /unsubscribe` endpoint to unsubscribe from topics
- [x] 9.6 Implement `POST /connect` endpoint to manually trigger connection
- [x] 9.7 Implement `POST /disconnect` endpoint to manually disconnect
- [x] 9.8 Implement `POST /ingest` endpoint for REST API data ingestion
- [x] 9.9 Implement `POST /ingest/batch` endpoint for batch ingestion
- [x] 9.10 Implement `GET /schemas` endpoint to list all registered schemas
- [x] 9.11 Implement `GET /schemas/:topic` endpoint to get schema for topic
- [x] 9.12 Implement `POST /schemas` endpoint to register new schema
- [x] 9.13 Implement `DELETE /schemas/:topic` endpoint to unregister schema
- [x] 9.14 Add DTOs for all request/response types (subscription with schema)
- [x] 9.15 Add guards for API key authentication (optional, use SecurityModule when available)
- [x] 9.16 Write unit tests for controller endpoints

## 10. Lifecycle Hooks

- [x] 10.1 Implement OnModuleInit hook for automatic MQTT connection on startup
- [x] 10.2 Implement OnModuleDestroy hook for graceful shutdown
- [x] 10.3 Test module initialization and shutdown scenarios

## 11. Health and Monitoring Integration

- [x] 11.1 Add health indicator for MQTT connection status
- [x] 11.2 Add metrics for connection events (connects, disconnects, errors)
- [x] 11.3 Add metrics for message throughput (received, forwarded, errors)
- [x] 11.4 Add metrics for subscription count
- [x] 11.5 Add metrics for schema registration count

## 12. Testing and Validation

- [x] 12.1 Write unit tests for MqttClientService (easy to mock)
- [x] 12.2 Write unit tests for ReconnectionStrategy
- [x] 12.3 Write unit tests for SchemaRegistry
- [x] 12.4 Write unit tests for MqttIngestorService (with mocked MqttClientService)
- [x] 12.5 Write unit tests for CanonicalEventFactory
- [x] 12.6 Write unit tests for ApiIngestorService
- [x] 12.7 Write unit tests for IngestionController
- [x] 12.8 Write e2e tests for MQTT connection lifecycle
- [x] 12.9 Write e2e tests for dynamic subscription management
- [x] 12.10 Write e2e tests for schema registration and lookup
- [x] 12.11 Write e2e tests for message reception and forwarding
- [x] 12.12 Write integration tests with mock MQTT broker
- [x] 12.13 Test error scenarios (broker unavailable, invalid topics, invalid schemas, etc.)
- [x] 12.14 Test reconnection behavior with broker restart
- [x] 12.15 Run `pnpm run build` to verify TypeScript compilation
- [x] 12.16 Run `pnpm run lint` to ensure code quality
- [x] 12.17 Run `pnpm run test` to verify all tests pass

## 13. Documentation

- [ ] 13.1 Update README.md with IngestionModule usage examples
- [ ] 13.2 Document API endpoints in API specification
- [ ] 13.3 Add configuration examples to config/local.yml comments
- [ ] 13.4 Document SchemaRegistry usage and schema format
- [ ] 13.5 Document ReconnectionStrategy customization
