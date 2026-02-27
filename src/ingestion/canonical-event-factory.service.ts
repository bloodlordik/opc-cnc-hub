import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  CanonicalEvent,
  EventMetadata,
  MessageSchema,
} from './ingestion.types';

@Injectable()
export class CanonicalEventFactory {
  private readonly logger = new Logger(CanonicalEventFactory.name);

  generateEventId(): string {
    return randomUUID();
  }

  createFromMqtt(
    topic: string,
    payload: Buffer,
    schema?: MessageSchema,
  ): CanonicalEvent {
    let parsedPayload: Record<string, unknown>;

    try {
      parsedPayload = JSON.parse(payload.toString('utf-8'));
    } catch (error) {
      this.logger.error(
        `Failed to parse message payload for topic ${topic}`,
        error,
      );
      throw new Error(
        `Invalid JSON payload for topic ${topic}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    if (schema) {
      try {
        parsedPayload = schema.schema.parse(parsedPayload) as Record<
          string,
          unknown
        >;
        this.logger.debug(
          `Message validated against schema for topic ${topic}`,
        );
      } catch (error) {
        this.logger.error(`Schema validation failed for topic ${topic}`, error);
        throw new Error(
          `Schema validation failed for topic ${topic}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    } else {
      this.logger.warn(`No schema registered for topic ${topic}`);
    }

    const metadata: EventMetadata = {
      source: 'mqtt',
      topic,
      payloadSize: payload.length,
      receivedAt: new Date().toISOString(),
    };

    if (schema) {
      metadata.schemaVersion = schema.version;
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
}
