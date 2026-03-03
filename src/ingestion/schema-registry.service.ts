import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';

export interface MessageSchema {
  topic: string;
  schema: z.ZodSchema;
  version?: string;
  description?: string;
}

export interface SchemaRegistry {
  register(schema: MessageSchema): void;
  unregister(topic: string): void;
  get(topic: string): MessageSchema | undefined;
  list(): MessageSchema[];
  has(topic: string): boolean;
}

@Injectable()
export class IngestionSchemaRegistry implements SchemaRegistry {
  private readonly logger = new Logger(IngestionSchemaRegistry.name);
  private schemas = new Map<string, MessageSchema>();

  register(schema: MessageSchema): void {
    this.schemas.set(schema.topic, schema);
    this.logger.log(
      `Schema registered for topic ${schema.topic} (version: ${schema.version || 'N/A'})`,
    );
  }

  unregister(topic: string): void {
    const deleted = this.schemas.delete(topic);
    if (deleted) {
      this.logger.log(`Schema unregistered for topic ${topic}`);
    } else {
      this.logger.warn(`No schema found for topic ${topic} to unregister`);
    }
  }

  get(topic: string): MessageSchema | undefined {
    return this.schemas.get(topic);
  }

  list(): MessageSchema[] {
    return Array.from(this.schemas.values());
  }

  has(topic: string): boolean {
    return this.schemas.has(topic);
  }
}
