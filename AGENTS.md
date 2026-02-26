# AI Agent Guidelines for opc-cnc-hub

This file provides coding guidelines and command references for AI agents working in this NestJS TypeScript project.

## Build, Lint, and Test Commands

### Build

- `pnpm run build` - Build the project to `dist/` directory
- `pnpm run start` - Start the application
- `pnpm run start:dev` - Start in watch mode (auto-reload on changes)
- `pnpm run start:prod` - Start production build

### Code Quality

- `pnpm run lint` - Run ESLint with auto-fix
- `pnpm run format` - Format code with Prettier

### Testing

- `pnpm run test` - Run all unit tests (`*.spec.ts` in `src/`)
- `pnpm run test:watch` - Run tests in watch mode
- `pnpm run test:cov` - Generate test coverage report
- `pnpm run test:e2e` - Run e2e tests (`*.e2e-spec.ts` in `test/`)
- `pnpm run test:debug` - Debug tests with Node inspector

**Running a single test:** Use Jest's `-t` flag:

```bash
pnpm run test -- -t "should return Hello World"
```

## Code Style Guidelines

### TypeScript Configuration

- Target: ES2023 with NodeNext modules
- Strict null checks enabled
- Experimental decorators enabled (for NestJS)
- Output directory: `dist/`
- Use `moduleResolution: "nodenext"` for proper imports

### Import and Module Style

- Use ES modules (import/export)
- Import NestJS decorators from `@nestjs/common`
- Use relative paths with `./` prefix for local imports
- Order imports: external libs → internal modules → types

### Naming Conventions

- Classes: PascalCase (`AppController`, `AppService`)
- Methods/variables: camelCase (`getHello`, `appService`)
- Decorators: NestJS decorators above class declarations
- Files: PascalCase for classes (`app.controller.ts`), lowercase with hyphens for modules

### NestJS Patterns

- Controllers: Use `@Controller()` decorator, inject services via constructor
- Services: Use `@Injectable()` decorator
- Modules: Use `@Module()` decorator with imports/controllers/providers arrays
- Dependency Injection: Use `private readonly` in constructor parameters
- Controllers in `src/**.controller.ts`, Services in `src/**.service.ts`, Modules in `src/**.module.ts`

### Type Safety

- Explicit return types on all methods
- Use interfaces for complex types when appropriate
- `@typescript-eslint/no-explicit-any` is allowed by default
- Floating promises trigger warnings, handle async/await properly

### Formatting (Prettier)

- Single quotes: `'string'`
- Trailing commas: always
- Auto-format with `pnpm run format`

### Testing Patterns

- Unit tests: `*.spec.ts` files alongside source files
- E2E tests: `*.e2e-spec.ts` in `test/` directory
- Use Jest with `describe()`, `it()`, `beforeEach()`
- Mock services with NestJS `TestingModule`
- Expect standard: `expect(result).toBe(expected)` or `.toEqual()`

### Error Handling

- Use NestJS exception filters when appropriate
- Handle async errors properly (no floating promises)
- Return appropriate HTTP status codes in controllers

### File Structure

```
src/
  main.ts              # Application bootstrap
  *.module.ts          # Feature modules
  *.controller.ts      # Route handlers
  *.service.ts         # Business logic
  *.spec.ts            # Unit tests
test/
  *.e2e-spec.ts        # End-to-end tests
  jest-e2e.json        # E2E test config
```

### Security

- ESLint security plugin enabled
- Avoid hardcoded secrets
- Validate inputs (use class-validator when available)

<!-- OPENSPEC:START -->

# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:

- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:

- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->
