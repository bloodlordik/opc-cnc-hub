import { Injectable, Logger } from '@nestjs/common';
import { CanonicalEvent } from '../mqtt';

export interface IngestRequest {
  source: string;
  topic?: string;
  payload: Record<string, unknown>;
}

export interface IngestResponse {
  eventId: string;
  timestamp: Date;
}

export interface BatchIngestRequest {
  messages: IngestRequest[];
}

export interface BatchIngestResponse {
  events: IngestResponse[];
  successCount: number;
  errorCount: number;
}

@Injectable()
export class ApiIngestorService {
  private readonly logger = new Logger(ApiIngestorService.name);
  private readonly MAX_PAYLOAD_SIZE = 1 * 1024 * 1024; // 1MB

  constructor() {}

  async ingest(request: IngestRequest): Promise<IngestResponse> {
    this.logger.debug(`Processing ingest request from source ${request.source}`);

    try {
      const payloadSize = JSON.stringify(request.payload).length;
      if (payloadSize > this.MAX_PAYLOAD_SIZE) {
        throw new Error('Payload size exceeds maximum allowed size of 1MB');
      }

      const event: CanonicalEvent = {
        eventId: this.generateEventId(),
        source: 'api',
        topic: request.topic,
        payload: request.payload,
        timestamp: new Date(),
        metadata: {
          source: request.source,
          receivedAt: new Date().toISOString(),
        },
      };

      return {
        eventId: event.eventId,
        timestamp: event.timestamp,
      };
    } catch (error) {
      this.logger.error('Failed to process ingest request', error);
      throw error;
    }
  }

  async ingestBatch(request: BatchIngestRequest): Promise<BatchIngestResponse> {
    this.logger.debug(
      `Processing batch ingest request with ${request.messages.length} messages`,
    );

    const results: IngestResponse[] = [];
    let successCount = 0;
    let errorCount = 0;

    for (const message of request.messages) {
      try {
        const result = await this.ingest(message);
        results.push(result);
        successCount++;
      } catch (error) {
        this.logger.error(
          `Failed to ingest message from source ${message.source}`,
          error,
        );
        errorCount++;
      }
    }

    return {
      events: results,
      successCount,
      errorCount,
    };
  }

  private generateEventId(): string {
    const { randomUUID } = require('node:crypto');
    return randomUUID();
  }
}
