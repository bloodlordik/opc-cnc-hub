## ADDED Requirements

### Requirement: Simple MqttClientService

MqttClientService SHALL provide simple, testable MQTT operations without complex business logic.

#### Scenario: MqttClientService provides minimal operations

- **GIVEN** MqttClientService is initialized
- **THEN** service provides `connect()` method
- **THEN** service provides `disconnect()` method
- **THEN** service provides `subscribe(topic, qos)` method
- **THEN** service provides `unsubscribe(topic)` method
- **THEN** service provides `onMessage(callback)` method
- **THEN** service provides `getStatistics()` method
- **THEN** service has no business logic or processing

#### Scenario: MqttClientService tracks statistics

- **GIVEN** MqttClientService lifecycle events occur
- **WHEN** connection is established
- **THEN** connectCount is incremented
- **WHEN** connection is closed
- **THEN** disconnectCount is incremented
- **WHEN** subscription is added
- **THEN** subscriptionCount is incremented
- **THEN** topic is added to subscriptions list
- **THEN** QoS level is recorded for subscription

#### Scenario: MqttClientService is easily testable

- **GIVEN** MqttClientService needs to be tested
- **WHEN** creating unit tests
- **THEN** all methods can be mocked
- **THEN** no external dependencies are required for mocking
- **THEN** interface can be replaced with mock implementation
- **THEN** tests run without actual MQTT broker

### Requirement: Reconnection Strategy

ReconnectionStrategy SHALL be a pluggable class that determines when and how to reconnect to MQTT broker.

#### Scenario: ExponentialBackoffReconnectionStrategy implements strategy

- **GIVEN** ReconnectionStrategy interface is defined
- **WHEN** ExponentialBackoffReconnectionStrategy is created
- **THEN** it implements `shouldReconnect(attempt, lastError)` method
- **THEN** it implements `getDelay(attempt)` method
- **THEN** it implements `onConnect()`, `onDisconnect()`, `onReconnectSuccess()` hooks
- **THEN** delay increases exponentially with attempt number
- **THEN** delay is capped at maximum value

#### Scenario: Strategy can be configured

- **GIVEN** ReconnectionStrategy is instantiated
- **WHEN** strategy is configured with parameters
- **THEN** maxAttempts limits reconnection tries
- **THEN** initialDelay sets first attempt delay
- **THEN** maxDelay caps the exponential growth
- **THEN** backoffMultiplier determines exponential factor

#### Scenario: Strategy is pluggable

- **GIVEN** different reconnection behavior is needed
- **WHEN** new strategy class implements ReconnectionStrategy interface
- **THEN** it can be injected into MqttIngestorService
- **THEN** no changes to MqttIngestorService are needed
- **THEN** strategy is used automatically

#### Scenario: Strategy tracks reconnection lifecycle

- **GIVEN** MqttIngestorService uses ReconnectionStrategy
- **WHEN** connection is established
- **THEN** `onConnect()` is called on strategy
- **WHEN** connection is lost
- **THEN** `onDisconnect()` is called on strategy
- **WHEN** reconnection succeeds
- **THEN** `onReconnectSuccess(attempt)` is called with attempt number

### Requirement: Schema Registry

SchemaRegistry SHALL map MQTT topics to message schemas for proper event creation.

#### Scenario: Register schema for topic

- **GIVEN** SchemaRegistry is initialized
- **WHEN** `register(schema)` is called with topic and schema
- **THEN** schema is stored with topic as key
- **THEN** schema can be retrieved by topic
- **THEN** schema is used for validating messages from that topic

#### Scenario: Unregister schema

- **GIVEN** SchemaRegistry has registered schema for topic
- **WHEN** `unregister(topic)` is called
- **THEN** schema is removed from registry
- **THEN** `get(topic)` returns undefined
- **THEN** `has(topic)` returns false

#### Scenario: Lookup schema by topic

- **GIVEN** SchemaRegistry has registered schemas
- **WHEN** `get(topic)` is called
- **THEN** schema is returned if topic is registered
- **THEN** undefined is returned if topic is not registered
- **THEN** same schema is returned on subsequent calls

#### Scenario: List all schemas

- **GIVEN** SchemaRegistry has multiple registered schemas
- **WHEN** `list()` is called
- **THEN** array of all registered schemas is returned
- **THEN** each schema includes topic, schema, version, description

#### Scenario: Check schema existence

- **GIVEN** SchemaRegistry has registered schemas
- **WHEN** `has(topic)` is called
- **THEN** true is returned if topic is registered
- **THEN** false is returned if topic is not registered

### Requirement: Topic Subscription with Schema

MqttIngestorService SHALL associate message schemas with topic subscriptions.

#### Scenario: Subscribe with schema

- **GIVEN** SchemaRegistry has schema registered for topic
- **WHEN** POST /api/v2/ingestion/subscribe is called with topic and schema
- **THEN** topic is subscribed via MqttClientService
- **THEN** schema is associated with subscription
- **THEN** messages from topic are validated against schema

#### Scenario: Subscribe without schema

- **GIVEN** topic has no registered schema
- **WHEN** POST /api/v2/ingestion/subscribe is called with topic only
- **THEN** topic is subscribed without schema association
- **THEN** messages are processed without schema validation
- **THEN** warning is logged indicating no schema for topic

#### Scenario: Subscribe with default QoS 0

- **GIVEN** subscription request does not specify QoS
- **WHEN** POST /api/v2/ingestion/subscribe is called without qos parameter
- **THEN** topic is subscribed with QoS 0
- **THEN** QoS 0 is returned in subscription info

### Requirement: Default QoS Level

MqttClientService SHALL use QoS 0 as default for all subscriptions.

#### Scenario: Default QoS 0 when not specified

- **GIVEN** subscription request does not include QoS parameter
- **WHEN** `subscribe(topic)` is called
- **THEN** MqttClientService subscribes with QoS 0
- **THEN** broker is requested to send messages at most once

#### Scenario: Custom QoS when specified

- **GIVEN** subscription request includes QoS parameter
- **WHEN** `subscribe(topic, qos)` is called with qos 1 or 2
- **THEN** MqttClientService subscribes with specified QoS
- **THEN** broker is requested to send messages with requested QoS

### Requirement: MQTT Broker Connection

IngestionModule SHALL establish a connection to an MQTT broker using configuration from ConfigModule.

#### Scenario: Successful connection on startup

- **GIVEN** MQTT broker is available at configured URL
- **GIVEN** valid client ID and credentials are provided in configuration
- **WHEN** IngestionModule is initialized
- **THEN** MqttIngestorService calls MqttClientService.connect()
- **THEN** MqttClientService establishes connection to broker
- **THEN** ReconnectionStrategy.onConnect() is called
- **THEN** connection status changes to 'CONNECTED'
- **THEN** connection event is logged

#### Scenario: Connection failure during startup

- **GIVEN** MQTT broker is unavailable or unreachable
- **WHEN** IngestionModule is initialized
- **THEN** MqttIngestorService calls MqttClientService.connect()
- **THEN** connection fails with error
- **THEN** ReconnectionStrategy.shouldReconnect() is called
- **THEN** if true, ReconnectionStrategy.getDelay() determines next attempt
- **THEN** connection status changes to 'RECONNECTING'
- **THEN** connection error is logged
- **THEN** application startup continues (non-blocking)

#### Scenario: Connection with authentication

- **GIVEN** MQTT broker requires authentication
- **GIVEN** valid username and password are configured
- **WHEN** MqttIngestorService connects to broker
- **THEN** credentials are sent during connection
- **THEN** connection is authenticated successfully
- **THEN** connection status changes to 'CONNECTED'

#### Scenario: Manual connection trigger

- **GIVEN** IngestionModule is initialized and disconnected
- **WHEN** POST /api/v2/ingestion/connect is called
- **THEN** MqttIngestorService attempts connection
- **THEN** connection status is returned in response
- **THEN** connection attempt is logged

### Requirement: Automatic Reconnection

MqttIngestorService SHALL automatically reconnect to MQTT broker when connection is lost, using ReconnectionStrategy.

#### Scenario: Reconnection after broker disconnect

- **GIVEN** MqttIngestorService is connected to broker
- **WHEN** connection to broker is lost (network issue, broker restart, etc.)
- **THEN** ReconnectionStrategy.onDisconnect() is called
- **THEN** connection status changes to 'RECONNECTING'
- **THEN** ReconnectionStrategy.shouldReconnect() is called with attempt number
- **THEN** if true, ReconnectionStrategy.getDelay() determines delay before next attempt
- **THEN** MqttClientService.connect() is called after delay
- **THEN** successful reconnection calls ReconnectionStrategy.onReconnectSuccess()
- **THEN** connection status changes to 'CONNECTED'
- **THEN** all previous subscriptions are restored

#### Scenario: Max reconnection attempts exceeded

- **GIVEN** MqttIngestorService is attempting to reconnect
- **GIVEN** ReconnectionStrategy.shouldReconnect() returns false
- **WHEN** reconnection attempt fails
- **THEN** connection status changes to 'FAILED'
- **THEN** reconnection attempts stop
- **THEN** error is logged with failure details
- **THEN** manual intervention required to restart connection

#### Scenario: Reconnection with subscriptions restoration

- **GIVEN** MqttIngestorService has active subscriptions before disconnect
- **WHEN** reconnection succeeds
- **THEN** all previously subscribed topics are resubscribed automatically
- **THEN** subscription count matches pre-disconnect state
- **THEN** message reception continues normally

### Requirement: Dynamic Topic Subscription

IngestionModule SHALL provide API endpoints for dynamic subscription and unsubscription to MQTT topics.

#### Scenario: Subscribe to single topic

- **GIVEN** MqttIngestorService is connected to broker
- **GIVEN** topic 'machine/+/telemetry' is not subscribed
- **WHEN** POST /api/v2/ingestion/subscribe is called with topic 'machine/+/telemetry'
- **THEN** MqttIngestorService subscribes to topic
- **THEN** subscription is added to active subscriptions list
- **THEN** topic is returned in subscriptions list
- **THEN** messages from matching topics are received

#### Scenario: Subscribe to multiple topics

- **GIVEN** MqttIngestorService is connected to broker
- **WHEN** POST /api/v2/ingestion/subscribe is called with array of topics
- **THEN** MqttIngestorService subscribes to all topics
- **THEN** all topics appear in active subscriptions list
- **THEN** failed subscriptions return error with specific topics

#### Scenario: Unsubscribe from topic

- **GIVEN** topic 'machine/1/telemetry' is currently subscribed
- **WHEN** DELETE /api/v2/ingestion/unsubscribe is called with topic 'machine/1/telemetry'
- **THEN** MqttIngestorService unsubscribes from topic
- **THEN** topic is removed from active subscriptions list
- **THEN** messages from topic are no longer received

#### Scenario: List active subscriptions

- **GIVEN** MqttIngestorService has active subscriptions
- **WHEN** GET /api/v2/ingestion/subscriptions is called
- **THEN** list of all active subscriptions is returned
- **THEN** each subscription includes topic and QoS level
- **THEN** timestamp of subscription is included

### Requirement: Message Reception and Processing

MqttIngestorService SHALL receive messages from subscribed topics, convert them to canonical events, and forward to EventBufferModule.

#### Scenario: Successful message processing

- **GIVEN** MqttIngestorService is connected and subscribed to topics
- **GIVEN** SchemaRegistry has schema for topic
- **WHEN** message is received on subscribed topic
- **THEN** SchemaRegistry.get(topic) retrieves schema
- **THEN** CanonicalEventFactory creates CanonicalEvent using schema
- **THEN** event payload is validated against schema
- **THEN** event is forwarded to EventBufferModule
- **THEN** message processing is logged
- **THEN** metrics counter for received messages is incremented

#### Scenario: Message processing without schema

- **GIVEN** MqttIngestorService is connected and subscribed to topics
- **GIVEN** SchemaRegistry has no schema for topic
- **WHEN** message is received on subscribed topic
- **THEN** SchemaRegistry.get(topic) returns undefined
- **THEN** CanonicalEventFactory creates CanonicalEvent without schema validation
- **THEN** warning is logged indicating no schema for topic
- **THEN** event is forwarded to EventBufferModule
- **THEN** metrics counter for received messages is incremented

#### Scenario: Message parsing failure

- **GIVEN** MqttIngestorService receives malformed message
- **GIVEN** SchemaRegistry has schema for topic
- **WHEN** CanonicalEventFactory fails to parse or validate message against schema
- **THEN** error is logged with message details and schema version
- **THEN** metrics counter for parse errors is incremented
- **THEN** message is discarded (does not crash service)
- **THEN** next message continues processing normally

#### Scenario: EventBuffer forwarding failure

- **GIVEN** EventBufferModule is unavailable or rejects event
- **WHEN** MqttIngestorService forwards CanonicalEvent
- **THEN** error is logged
- **THEN** metrics counter for forward errors is incremented
- **THEN** message is discarded (no retry by design)
- **THEN** service continues receiving next messages

### Requirement: Connection Status Tracking

MqttIngestorService SHALL track and expose connection status for monitoring and health checks.

#### Scenario: Query connection status

- **GIVEN** IngestionModule is initialized
- **WHEN** GET /api/v2/ingestion/status is called
- **THEN** current connection status is returned
- **THEN** status includes: state (CONNECTED/DISCONNECTED/RECONNECTING/FAILED)
- **THEN** status includes: broker URL
- **THEN** status includes: connection timestamp (if connected)
- **THEN** status includes: last error (if any)
- **THEN** status includes: connectCount from MqttClientService
- **THEN** status includes: disconnectCount from MqttClientService
- **THEN** status includes: subscriptionCount from MqttClientService

#### Scenario: Status changes during lifecycle

- **GIVEN** MqttIngestorService lifecycle events occur
- **THEN** connection status transitions are logged
- **THEN** status changes are tracked internally
- **THEN** status reflects current actual connection state
- **THEN** MqttClientService statistics are updated on each event

### Requirement: Canonical Event Creation

CanonicalEventFactory SHALL convert MQTT messages to canonical event format with unique IDs and metadata.

#### Scenario: Create event from MQTT message with schema

- **GIVEN** MQTT message is received with topic 'machine/1/telemetry'
- **GIVEN** SchemaRegistry has schema for topic
- **GIVEN** message payload contains JSON data
- **WHEN** CanonicalEventFactory.createFromMqtt() is called with schema
- **THEN** CanonicalEvent is created with unique eventId
- **THEN** event source is set to 'mqtt'
- **THEN** event topic is set to message topic
- **THEN** event payload is parsed from message buffer
- **THEN** event payload is validated against schema
- **THEN** validation errors are thrown if payload doesn't match schema
- **THEN** event timestamp is set to current time
- **THEN** event metadata includes MQTT-specific info
- **THEN** event metadata includes schema version

#### Scenario: Create event from MQTT message without schema

- **GIVEN** MQTT message is received with topic 'machine/1/telemetry'
- **GIVEN** SchemaRegistry has no schema for topic
- **GIVEN** message payload contains JSON data
- **WHEN** CanonicalEventFactory.createFromMqtt() is called without schema
- **THEN** CanonicalEvent is created with unique eventId
- **THEN** event source is set to 'mqtt'
- **THEN** event topic is set to message topic
- **THEN** event payload is parsed from message buffer
- **THEN** no schema validation is performed
- **THEN** event timestamp is set to current time
- **THEN** event metadata includes MQTT-specific info

#### Scenario: Unique event ID generation

- **GIVEN** CanonicalEventFactory generates event IDs
- **WHEN** generateEventId() is called multiple times
- **THEN** each generated ID is unique
- **THEN** IDs follow consistent format (e.g., UUID or timestamp-based)
- **THEN** collision probability is negligible

### Requirement: Schema Management API

IngestionModule SHALL provide REST API endpoints for managing message schemas.

#### Scenario: Register schema via API

- **GIVEN** SchemaRegistry is initialized
- **WHEN** POST /api/v2/ingestion/schemas is called with topic and schema
- **THEN** schema is registered in SchemaRegistry
- **THEN** schema can be used for validating messages from topic
- **THEN** schema is returned in response with registration timestamp

#### Scenario: List all schemas via API

- **GIVEN** SchemaRegistry has multiple registered schemas
- **WHEN** GET /api/v2/ingestion/schemas is called
- **THEN** array of all registered schemas is returned
- **THEN** each schema includes topic, version, description

#### Scenario: Get schema for specific topic

- **GIVEN** SchemaRegistry has schema for topic 'machine/+/telemetry'
- **WHEN** GET /api/v2/ingestion/schemas/machine/+%2Ftelemetry is called
- **THEN** schema for topic is returned
- **THEN** schema definition is included in response

#### Scenario: Unregister schema via API

- **GIVEN** SchemaRegistry has schema for topic
- **WHEN** DELETE /api/v2/ingestion/schemas/:topic is called
- **THEN** schema is removed from SchemaRegistry
- **THEN** messages from topic are no longer validated
- **THEN** 204 No Content response is returned

#### Scenario: Schema validation error

- **GIVEN** POST /api/v2/ingestion/schemas is called with invalid schema
- **WHEN** schema validation fails
- **THEN** 400 Bad Request response is returned
- **THEN** error details include validation errors
- **THEN** no schema is registered

### Requirement: REST API Data Ingestion

ApiIngestorService SHALL provide REST endpoints for manual data ingestion.

#### Scenario: Single message ingestion via API

- **GIVEN** valid API authentication credentials
- **GIVEN** request payload matches expected schema
- **WHEN** POST /api/v2/ingestion/ingest is called
- **THEN** request is validated
- **THEN** CanonicalEvent is created from request
- **THEN** event is forwarded to EventBufferModule
- **THEN** eventId is returned in response

#### Scenario: Batch message ingestion via API

- **GIVEN** valid API authentication credentials
- **GIVEN** array of valid messages in request
- **WHEN** POST /api/v2/ingestion/ingest/batch is called
- **THEN** all messages are validated
- **THEN** CanonicalEvents are created for each message
- **THEN** all events are forwarded to EventBufferModule
- **THEN** array of eventIds is returned in response

#### Scenario: Invalid API request

- **GIVEN** request payload is invalid or malformed
- **WHEN** POST /api/v2/ingestion/ingest is called
- **THEN** validation error is returned with details
- **THEN** HTTP status 400 (Bad Request) is returned
- **THEN** no event is created or forwarded

### Requirement: Error Handling and Circuit Breaker

IngestionModule SHALL implement circuit breaker pattern to prevent cascading failures from repeated connection errors.

#### Scenario: Circuit breaker activation

- **GIVEN** MqttIngestorService experiences repeated connection failures
- **GIVEN** configured failure threshold is reached
- **WHEN** next reconnection attempt fails
- **THEN** circuit breaker opens
- **THEN** further reconnection attempts are blocked
- **THEN** connection status changes to 'FAILED'
- **THEN** alert is logged indicating circuit breaker is open

#### Scenario: Circuit breaker reset after timeout

- **GIVEN** circuit breaker is open
- **GIVEN** configured reset timeout has elapsed
- **WHEN** manual reconnection is triggered via API
- **THEN** circuit breaker resets to half-open state
- **THEN** single reconnection attempt is allowed
- **THEN** success closes circuit, failure opens it again

### Requirement: Graceful Shutdown

IngestionModule SHALL gracefully disconnect from MQTT broker and clean up resources on application shutdown.

#### Scenario: Normal shutdown

- **GIVEN** MqttIngestorService is connected
- **WHEN** application receives shutdown signal
- **THEN** OnModuleDestroy hook is triggered
- **THEN** MqttIngestorService disconnects gracefully from broker
- **THEN** all subscriptions are cleared
- **THEN** connection status changes to 'DISCONNECTED'
- **THEN** resources are cleaned up

#### Scenario: Shutdown with pending messages

- **GIVEN** MqttIngestorService has unprocessed messages
- **WHEN** application shutdown is initiated
- **THEN** disconnect is attempted after processing completes (with timeout)
- **THEN** timeout prevents indefinite blocking
- **THEN** unprocessed messages are logged as dropped

### Requirement: Metrics and Observability

IngestionModule SHALL expose metrics for connection events and message throughput.

#### Scenario: Connection metrics

- **GIVEN** MqttIngestorService lifecycle events occur
- **THEN** counter for successful connections is incremented
- **THEN** counter for failed connections is incremented
- **THEN** gauge for current connection state is updated
- **THEN** histogram for connection duration is recorded
- **THEN** counter for connectCount from MqttClientService is exposed
- **THEN** counter for disconnectCount from MqttClientService is exposed

#### Scenario: Message metrics

- **GIVEN** messages are received and processed
- **THEN** counter for received messages is incremented
- **THEN** counter for processed messages is incremented
- **THEN** counter for parse errors is incremented
- **THEN** counter for validation errors is incremented (from schema validation)
- **THEN** counter for forward errors is incremented
- **THEN** histogram for processing time is recorded

#### Scenario: Subscription metrics

- **GIVEN** subscriptions are added and removed
- **THEN** gauge for subscription count is updated
- **THEN** counter for schema registrations is incremented
- **THEN** counter for schema unregistrations is incremented

### Requirement: Configuration

IngestionModule SHALL use ConfigModule for all MQTT connection settings.

#### Scenario: Load MQTT configuration

- **GIVEN** ConfigModule provides configuration
- **WHEN** IngestionModule is initialized
- **THEN** MQTT broker URL is loaded from config.mqtt.broker
- **THEN** client ID is loaded from config.mqtt.clientId
- **THEN** username is loaded from config.mqtt.username
- **THEN** password is loaded from config.mqtt.password
- **THEN** QoS is loaded from config.mqtt.qos
- **THEN** reconnectPeriod is loaded from config.mqtt.reconnectPeriod
- **THEN** connectTimeout is loaded from config.mqtt.connectTimeout
- **THEN** clean session is loaded from config.mqtt.clean

### Requirement: Logging

IngestionModule SHALL use structured logging for all operations and errors.

#### Scenario: Log connection events

- **GIVEN** MqttIngestorService connection events occur
- **THEN** connection attempt is logged with broker URL
- **THEN** successful connection is logged with connection details
- **THEN** connection failure is logged with error details
- **THEN** reconnection attempts are logged with attempt count

#### Scenario: Log message events

- **GIVEN** messages are received
- **THEN** message reception is logged with topic and eventId
- **THEN** processing errors are logged with message context
- **THEN** forwarding errors are logged with event details

#### Scenario: Log subscription events

- **GIVEN** subscription management operations occur
- **THEN** subscribe requests are logged with topic
- **THEN** unsubscribe requests are logged with topic
- **THEN** subscription failures are logged with error details
