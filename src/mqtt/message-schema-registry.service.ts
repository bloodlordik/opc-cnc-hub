import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';

export interface MessageSchemaMetadata {
  topic: string;
  version: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RegisteredMessageSchema extends MessageSchemaMetadata {
  schema: z.ZodSchema;
}

export interface RegisterSchemaOptions {
  topic: string;
  schema: z.ZodSchema;
  version?: string;
  description?: string;
}

export interface ValidationResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: z.ZodError;
  topic: string;
}

@Injectable()
export class MessageSchemaRegistryService {
  private readonly logger = new Logger(MessageSchemaRegistryService.name);
  private readonly schemas = new Map<string, RegisteredMessageSchema>();

  register(options: RegisterSchemaOptions): RegisteredMessageSchema {
    const { topic, schema, version = '1.0.0', description } = options;

    const now = new Date();
    const registeredSchema: RegisteredMessageSchema = {
      topic,
      schema,
      version,
      description,
      createdAt: now,
      updatedAt: now,
    };

    this.schemas.set(topic, registeredSchema);

    this.logger.log(
      `Schema registered for topic "${topic}" (version: ${version})${description ? ` - ${description}` : ''}`,
    );

    return registeredSchema;
  }

  registerSchema(
    topic: string,
    schema: z.ZodSchema,
    options?: { version?: string; description?: string },
  ): RegisteredMessageSchema {
    return this.register({
      topic,
      schema,
      version: options?.version,
      description: options?.description,
    });
  }

  update(topic: string, schema: z.ZodSchema, version?: string): RegisteredMessageSchema {
    const existing = this.schemas.get(topic);

    if (!existing) {
      throw new Error(`No schema found for topic "${topic}". Use register() first.`);
    }

    const updatedSchema: RegisteredMessageSchema = {
      ...existing,
      schema,
      version: version || existing.version,
      updatedAt: new Date(),
    };

    this.schemas.set(topic, updatedSchema);

    this.logger.log(
      `Schema updated for topic "${topic}" (version: ${updatedSchema.version})`,
    );

    return updatedSchema;
  }

  unregister(topic: string): boolean {
    const deleted = this.schemas.delete(topic);

    if (deleted) {
      this.logger.log(`Schema unregistered for topic "${topic}"`);
    } else {
      this.logger.warn(`No schema found for topic "${topic}" to unregister`);
    }

    return deleted;
  }

  get(topic: string): RegisteredMessageSchema | undefined {
    return this.schemas.get(topic);
  }

  getSchema(topic: string): z.ZodSchema | undefined {
    return this.schemas.get(topic)?.schema;
  }

  has(topic: string): boolean {
    return this.schemas.has(topic);
  }

  validate<T = unknown>(topic: string, payload: unknown): ValidationResult<T> {
    const registeredSchema = this.schemas.get(topic);

    if (!registeredSchema) {
      this.logger.warn(`No schema found for topic "${topic}", skipping validation`);
      return {
        success: true,
        data: payload as T,
        topic,
      };
    }

    const result = registeredSchema.schema.safeParse(payload);

    if (result.success) {
      return {
        success: true,
        data: result.data as T,
        topic,
      };
    }

    this.logger.error(
      `Validation failed for topic "${topic}": ${result.error.issues.map((e) => e.message).join(', ')}`,
    );

    return {
      success: false,
      error: result.error,
      topic,
    };
  }

  parse<T = unknown>(topic: string, payload: unknown): T {
    const registeredSchema = this.schemas.get(topic);

    if (!registeredSchema) {
      this.logger.warn(`No schema found for topic "${topic}", returning as-is`);
      return payload as T;
    }

    return registeredSchema.schema.parse(payload) as T;
  }

  list(): RegisteredMessageSchema[] {
    return Array.from(this.schemas.values());
  }

  listTopics(): string[] {
    return Array.from(this.schemas.keys());
  }

  count(): number {
    return this.schemas.size;
  }

  clear(): void {
    const count = this.schemas.size;
    this.schemas.clear();
    this.logger.log(`Cleared ${count} registered schema(s)`);
  }

  findByTopicPattern(pattern: string): RegisteredMessageSchema[] {
    const regexPattern = pattern
      .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
      .replace(/#/g, '.*')
      .replace(/\+/g, '[^/]+');

    const topicRegex = new RegExp(`^${regexPattern}$`);

    return this.list().filter((schema) => topicRegex.test(schema.topic));
  }

  findByPrefix(prefix: string): RegisteredMessageSchema[] {
    return this.list().filter((schema) => schema.topic.startsWith(prefix));
  }
}
