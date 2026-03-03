import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { CanonicalEvent, EventMetadata } from './mqtt.types';
import { MessageSchemaRegistryService } from './message-schema-registry.service';

@Injectable()
export class CanonicalEventFactory {
  private readonly logger = new Logger(CanonicalEventFactory.name);

  constructor(private readonly schemaRegistry: MessageSchemaRegistryService) {}

  generateEventId(): string {
    return randomUUID();
  }

  createFromMqtt(topic: string, payload: Buffer): CanonicalEvent {
    let parsedPayload: Record<string, unknown>;

    try {
      parsedPayload = JSON.parse(payload.toString('utf-8'));
    } catch (error) {
      this.logger.error(`Failed to parse message payload for topic ${topic}`, error);
      throw new Error(
        `Invalid JSON payload for topic ${topic}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    const validationResult = this.schemaRegistry.validate(topic, parsedPayload);

    if (validationResult.success) {
      parsedPayload = validationResult.data as Record<string, unknown>;
      if (validationResult.data) {
        this.logger.debug(`Message validated against schema for topic ${topic}`);
      }
    } else if (validationResult.error) {
      this.logger.error(
        `Schema validation failed for topic ${topic}: ${validationResult.error.issues.map((e) => e.message).join(', ')}`,
      );
      throw new Error(
        `Schema validation failed for topic ${topic}: ${validationResult.error.issues.map((e) => e.message).join(', ')}`,
      );
    }

    const metadata: EventMetadata = {
      source: 'mqtt',
      topic,
      payloadSize: payload.length,
      receivedAt: new Date().toISOString(),
    };

    const registeredSchema = this.schemaRegistry.get(topic);
    if (registeredSchema) {
      metadata.schemaVersion = registeredSchema.version;
    }

    return {
      eventId: this.generateEventId(),
      source: 'mqtt',
      topic,
      payload: parsedPayload,
      timestamp: new Date(),
      metadata,
    };
  }

  createFromMqttWithSchema<T extends Record<string, unknown>>(
    topic: string,
    payload: Buffer,
  ): CanonicalEvent & { payload: T } {
    const baseEvent = this.createFromMqtt(topic, payload);
    return baseEvent as CanonicalEvent & { payload: T };
  }
}
