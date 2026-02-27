import { z } from 'zod';

const SecurityPolicyEnum = z.enum(['None', 'Sign', 'SignAndEncrypt']);

const SecurityModeEnum = z.enum(['None', 'Sign', 'SignAndEncrypt']);

const OverflowPolicyEnum = z.enum(['DROP_OLDEST', 'REJECT']);

const LogLevelEnum = z.enum(['DEBUG', 'INFO', 'WARN', 'ERROR']);

const FileTransportSchema = z.object({
  type: z.literal('file'),
  filename: z.string(),
  maxsize: z.number(),
  maxFiles: z.number(),
});

const ConsoleTransportSchema = z.object({
  type: z.literal('console'),
});

const TransportSchema = z.discriminatedUnion('type', [
  ConsoleTransportSchema,
  FileTransportSchema,
]);

const OpcSecuritySchema = z.object({
  policy: SecurityPolicyEnum,
  mode: SecurityModeEnum,
});

const OpcServerSchema = z.object({
  applicationName: z.string(),
  applicationUri: z.string(),
  productName: z.string(),
  productUri: z.string(),
});

const OpcSchema = z.object({
  port: z.number(),
  endpoint: z.url(),
  security: OpcSecuritySchema,
  server: OpcServerSchema,
});

const MqttSchema = z.object({
  broker: z.url(),
  clientId: z.string(),
  username: z.string().nullable(),
  password: z.string().nullable(),
  qos: z.number().int().min(0).max(2),
  reconnectPeriod: z.number().int(),
  connectTimeout: z.number().int(),
  clean: z.boolean(),
  retryDelay: z.number().int().positive(),
  retryAttempts: z.number().int().positive(),
  maxDelay: z.number().int().positive(),
  backoffMultiplier: z.number().int().positive(),
});

const EventBufferSchema = z.object({
  maxSize: z.number().int().positive(),
  overflowPolicy: OverflowPolicyEnum,
  retryAttempts: z.number().int().min(0),
  retryDelay: z.number().int().min(0),
  maxAge: z.number().int().min(0),
});

const DatabaseSchema = z.object({
  host: z.string(),
  port: z.number().int().positive(),
  database: z.string(),
  username: z.string(),
  password: z.string(),
  ssl: z.boolean(),
});

const OpcProjectionSchema = z.object({
  batchSize: z.number().int().positive(),
  batchInterval: z.number().int().min(0),
  changeDetection: z.boolean(),
});

const JwtSchema = z.object({
  secret: z.string(),
  expiresIn: z.string(),
  refreshTokenExpiresIn: z.string(),
});

const ApiKeysSchema = z.object({
  enabled: z.boolean(),
});

const RateLimitingSchema = z.object({
  enabled: z.boolean(),
  windowMs: z.number().int().min(0),
  maxRequests: z.number().int().min(0),
});

const SecuritySchema = z.object({
  jwt: JwtSchema,
  apiKeys: ApiKeysSchema,
  rateLimiting: RateLimitingSchema,
});

const MetricsSchema = z.object({
  enabled: z.boolean(),
});

const MonitoringSchema = z.object({
  metrics: MetricsSchema,
});

const LoggingSchema = z.object({
  level: LogLevelEnum,
  transports: z.array(TransportSchema),
});

const configSchema = z.object({
  opc: OpcSchema,
  mqtt: MqttSchema,
  eventBuffer: EventBufferSchema,
  database: DatabaseSchema,
  opcProjection: OpcProjectionSchema,
  security: SecuritySchema,
  monitoring: MonitoringSchema,
  logging: LoggingSchema,
});

export type Config = z.infer<typeof configSchema>;

export { configSchema };
