# Change: add-ingestion-module

## Why

IngestionModule is required to receive telemetry data from MQTT brokers as first stage of event pipeline defined in architecture. This module will handle MQTT connections, manage topic subscriptions with schema mapping, and forward messages to EventBufferModule for further processing.

## What Changes

- **Create IngestionModule** with the following components:
  - `MqttClientService` - Simple MQTT client service with basic operations only (connect, disconnect, subscribe, unsubscribe, statistics)
  - `MqttIngestorService` - Orchestrator that uses MqttClientService, handles message processing, and manages reconnection strategy
  - `ReconnectionStrategy` - Separate class for reconnection logic (exponential backoff, retry logic) that can be easily swapped
  - `SchemaRegistry` - Registry for message schemas mapped to topics (allows different topics to have different message formats)
  - `CanonicalEventFactory` - Factory for creating canonical events from MQTT messages using schemas from SchemaRegistry
  - `ApiIngestorService` - Service for REST API data ingestion (optional, included for completeness)
  - `IngestionController` - REST API controller for dynamic subscription management and connection status

- **Key features**:
  - **MqttClientService** - Simple, testable service with minimal logic (can be easily mocked in tests)
  - **ReconnectionStrategy** - Pluggable reconnection strategy with configurable parameters
  - **Connection statistics** - Track connects, disconnects, subscription counts and topics
  - **SchemaRegistry** - Map topics to message schemas for proper event creation
  - **Automatic reconnection** - Using ReconnectionStrategy (exponential backoff by default)
  - **Dynamic topic subscription** - With schema association per topic
  - **Default QoS 0** - Configurable, but defaults to 0 for all subscriptions
  - **Forward messages to EventBufferModule** (will be created in a future change)
  - **Error handling with logging** - Structured logging for all operations
  - **Connection status tracking** - Health checks and status queries
  - **Configuration from ConfigModule** (broker URL, client ID, credentials, QoS, etc.)

## Impact

- **Affected specs**: New capability `ingestion` will be created
- **Affected code**:
  - New module: `src/ingestion/ingestion.module.ts`
  - New services: `src/ingestion/mqtt-ingestor.service.ts`, `src/ingestion/api-ingestor.service.ts`, `src/ingestion/canonical-event-factory.service.ts`
  - New controller: `src/ingestion/ingestion.controller.ts`
  - New DTOs: `src/ingestion/dto/`
  - New types/interfaces: `src/ingestion/interfaces/`
  - New tests: `src/ingestion/*.spec.ts`

- **Breaking changes**: None
- **Dependencies**:
  - Uses existing `ConfigModule` for configuration
  - Will depend on `EventBufferModule` when created (currently using placeholder interface)
  - Uses existing `mqtt` npm package (already in dependencies)

- **Integration points**:
  - `AppModule` will import IngestionModule
  - ConfigModule provides MQTT configuration
  - LoggingModule for structured logging
