## ADDED Requirements

### Requirement: Configuration File Location

ConfigModule SHALL load configuration from the file path specified by the `CONFIG` environment variable, defaulting to `config/local.yml` if not set.

#### Scenario: Configuration file exists at default location

- **GIVEN** `CONFIG` environment variable is not set
- **GIVEN** a configuration file exists at `config/local.yml`
- **WHEN** ConfigService is initialized
- **THEN** the file is successfully read and parsed

#### Scenario: Configuration file at custom path

- **GIVEN** `CONFIG` environment variable is set to `/path/to/custom/config.yml`
- **GIVEN** a configuration file exists at the custom path
- **WHEN** ConfigService is initialized
- **THEN** the file from the custom path is successfully read and parsed

#### Scenario: Configuration file is missing

- **GIVEN** no configuration file exists at the specified path (default or custom)
- **WHEN** ConfigService is initialized
- **THEN** the application crashes with a descriptive error message indicating the missing file path

### Requirement: Environment Variable Override

ConfigModule SHALL support overriding and extending configuration values using environment variables. Environment variables SHALL take precedence over values defined in the YAML file.

#### Scenario: Environment variable overrides YAML value

- **GIVEN** YAML file defines `opc.port: 4840`
- **GIVEN** environment variable `OPC_PORT` is set to `5000`
- **WHEN** configuration is loaded
- **THEN** `opc.port` value is `5000`

#### Scenario: Environment variable adds new parameter

- **GIVEN** YAML file does not define `opc.customSetting`
- **GIVEN** environment variable `OPC_CUSTOMSETTING` is set to `value123`
- **WHEN** configuration is loaded
- **THEN** `opc.customSetting` is `value123`

#### Scenario: Nested environment variable naming

- **GIVEN** environment variable `MQTT_BROKER` is set to `mqtt://custom-broker:1883`
- **WHEN** configuration is loaded
- **THEN** `mqtt.broker` is set to `mqtt://custom-broker:1883`

#### Scenario: Environment variable with null/empty value

- **GIVEN** environment variable `MQTT_USERNAME` is set to empty string or not set
- **WHEN** configuration is loaded
- **THEN** YAML value is used (or null/undefined if not defined)

### Requirement: Configuration Schema Validation

ConfigModule SHALL validate the entire configuration using a Zod schema before exposing it to the application.

#### Scenario: Valid configuration passes validation

- **GIVEN** a configuration file with all required fields and valid values
- **WHEN** ConfigService is initialized
- **THEN** configuration is loaded successfully without errors

#### Scenario: Invalid configuration triggers crash

- **GIVEN** a configuration file with missing required fields or invalid data types
- **WHEN** ConfigService is initialized
- **THEN** the application crashes with a descriptive error message specifying the validation errors

### Requirement: Configuration Schema Structure

Zod schema SHALL define the following configuration sections with their respective types:

- `opc`: OPC UA server configuration
  - `port`: number (4840)
  - `endpoint`: string URL
  - `security.policy`: enum ('None', 'Sign', 'SignAndEncrypt')
  - `security.mode`: enum ('None', 'Sign', 'SignAndEncrypt')
  - `server.applicationName`: string
  - `server.applicationUri`: string
  - `server.productName`: string
  - `server.productUri`: string

- `mqtt`: MQTT broker configuration
  - `broker`: string URL
  - `clientId`: string
  - `username`: string | null
  - `password`: string | null
  - `qos`: number (0-2)
  - `reconnectPeriod`: number
  - `connectTimeout`: number
  - `clean`: boolean

- `eventBuffer`: In-memory event buffer configuration
  - `maxSize`: number
  - `overflowPolicy`: enum ('DROP_OLDEST', 'REJECT')
  - `retryAttempts`: number
  - `retryDelay`: number
  - `maxAge`: number

- `database`: PostgreSQL configuration
  - `host`: string
  - `port`: number
  - `database`: string
  - `username`: string
  - `password`: string
  - `ssl`: boolean

- `opcProjection`: OPC projection configuration
  - `batchSize`: number
  - `batchInterval`: number
  - `changeDetection`: boolean

- `security.jwt`: JWT token configuration
  - `secret`: string
  - `expiresIn`: string
  - `refreshTokenExpiresIn`: string

- `security.apiKeys.enabled`: boolean

- `security.rateLimiting.enabled`: boolean
- `security.rateLimiting.windowMs`: number
- `security.rateLimiting.maxRequests`: number

- `monitoring.metrics.enabled`: boolean

- `logging.level`: enum ('DEBUG', 'INFO', 'WARN', 'ERROR')
- `logging.transports`: array of transport objects
  - `type`: string ('console' | 'file')
  - `filename`: string (optional, required for file type)
  - `maxsize`: number (optional, required for file type)
  - `maxFiles`: number (optional, required for file type)

#### Scenario: All required configuration fields are present

- **GIVEN** configuration file contains all fields as defined in schema
- **WHEN** schema validation runs
- **THEN** validation passes and configuration is exposed

#### Scenario: Optional fields are handled correctly

- **GIVEN** configuration file omits optional fields or sets them to null
- **WHEN** schema validation runs
- **THEN** validation passes and default values are applied

### Requirement: Type Safety

ConfigModule SHALL provide TypeScript types derived from the Zod schema for use throughout the application.

#### Scenario: TypeScript types are available

- **GIVEN** Zod schema is defined
- **WHEN** TypeScript types are inferred from the schema
- **THEN** types can be imported and used in other modules and services

### Requirement: Global Module Availability

ConfigModule SHALL be available globally throughout the application for injection into any module or service.

#### Scenario: ConfigService is injectable in any module

- **GIVEN** ConfigModule is imported in AppModule as global
- **WHEN** any other module or service attempts to inject ConfigService
- **THEN** injection succeeds without additional imports

### Requirement: Configuration Access

ConfigService SHALL provide a single method to access the complete configuration object with full TypeScript typing.

#### Scenario: Access complete configuration

- **GIVEN** configuration is loaded and validated
- **WHEN** calling `configService.getConfig()`
- **THEN** returns the complete configuration object with proper typing
- **THEN** the return type is `Config` (inferred from Zod schema)
- **THEN** properties can be accessed directly (e.g., `config.opc.port`)

### Requirement: Read-Once Configuration Loading

ConfigService SHALL read the configuration file and environment variables only once during initialization and store the result immutably.

#### Scenario: Configuration is immutable in runtime

- **GIVEN** configuration is loaded at startup
- **WHEN** calling `configService.getConfig()` multiple times
- **THEN** the same configuration object is returned each time
- **THEN** file is not re-read from disk

#### Scenario: Configuration initialization on service startup

- **GIVEN** ConfigService is instantiated by NestJS DI container
- **WHEN** the constructor is called
- **THEN** configuration file is read immediately
- **THEN** environment variables are processed
- **THEN** validation is performed
- **THEN** configuration is stored in readonly property

### Requirement: Error Handling

ConfigModule SHALL throw a detailed exception immediately when configuration file is missing or validation fails, preventing application startup.

#### Scenario: Missing file exception

- **GIVEN** configuration file does not exist at `config/local.yml`
- **WHEN** ConfigService is initialized
- **THEN** throws exception with message: "Configuration file not found at path: config/local.yml"

#### Scenario: Validation error exception

- **GIVEN** configuration file has invalid data (e.g., wrong type, missing field)
- **WHEN** ConfigService is initialized
- **THEN** throws exception with detailed validation errors listing all issues found
