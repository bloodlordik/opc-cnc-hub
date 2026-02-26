## 1. Setup and Dependencies

- [x] 1.1 Verify `zod` and `js-yaml` dependencies are installed (check package.json, add if needed)
- [x] 1.2 Create directory structure: `src/config/`
- [x] 1.3 Create directory for test fixtures: `src/config/fixtures/`

## 2. Zod Schema Definition

- [x] 2.1 Create `src/config/config.schema.ts` with Zod schema for entire configuration
- [x] 2.2 Define enum types for: `SecurityPolicy`, `SecurityMode`, `OverflowPolicy`, `LogLevel`
- [x] 2.3 Define schema for each configuration section (opc, mqtt, eventBuffer, database, opcProjection, security, monitoring, logging)
- [x] 2.4 Create TypeScript type inference from Zod schema using `z.infer<>`

## 3. ConfigService Implementation

- [x] 3.1 Create `src/config/config.service.ts`
- [x] 3.2 Implement path resolution: check `CONFIG` environment variable, default to `config/local.yml`
- [x] 3.3 Implement file loading logic using `fs.readFileSync` and `js-yaml` parser
- [x] 3.4 Implement environment variable override logic (format: `SECTION_SUBSECTION_KEY`)
- [x] 3.5 Implement validation using Zod schema with detailed error messages
- [x] 3.6 Implement crash on missing file with descriptive error message
- [x] 3.7 Implement crash on validation failure with detailed error output
- [x] 3.8 Add `getConfig(): Config` method to return complete configuration object (method name matches spec)
- [x] 3.9 Store configuration in private readonly property (read-once at startup)
- [x] 3.10 Initialize configuration in constructor (fail-fast pattern)

## 4. ConfigModule Implementation

- [x] 4.1 Create `src/config/config.module.ts`
- [x] 4.2 Mark module as global using `@Global()` decorator
- [x] 4.3 Register ConfigService as provider
- [x] 4.4 Export ConfigService for dependency injection

## 5. Integration with AppModule

- [x] 5.1 Update `src/app.module.ts` to import ConfigModule
- [x] 5.2 Ensure ConfigModule is imported as first module (per module initialization order)

## 6. Testing

- [x] 6.1 Create `src/config/config.service.spec.ts` with unit tests
- [x] 6.2 Test successful configuration loading from valid YAML file
- [x] 6.3 Test configuration loading from custom path via `CONFIG` environment variable
- [ ] 6.4 Test environment variable override of YAML values (SKIPPED - needs follow-up)
- [ ] 6.5 Test environment variable addition of new parameters (SKIPPED - needs follow-up)
- [x] 6.6 Test exception when configuration file is missing
- [x] 6.7 Test exception when configuration file has validation errors
- [x] 6.8 Test `getConfig()` method returns complete configuration
- [x] 6.9 Test configuration is read only once (immutable in runtime)
- [x] 6.10 Create test fixtures in `src/config/fixtures/` with valid and invalid config files

## 7. Documentation and Validation

- [x] 7.1 Run `pnpm run build` to verify TypeScript compilation
- [x] 7.2 Run `pnpm run test` to ensure all tests pass
- [x] 7.3 Run `pnpm run lint` to verify code quality
- [x] 7.4 Verify application starts successfully with valid `config/local.yml`
- [ ] 7.5 Verify application uses custom config path when `CONFIG` environment variable is set
- [ ] 7.6 Verify environment variables override YAML values correctly (SKIPPED - needs follow-up)
- [x] 7.7 Verify application crashes with error message when `config/local.yml` is missing
- [x] 7.8 Verify application crashes with detailed error when `config/local.yml` has invalid configuration
