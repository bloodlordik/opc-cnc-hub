import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { MqttIngestorService, MqttClientService } from '../mqtt';
import { IngestionSchemaRegistry } from './schema-registry.service';
import { ApiIngestorService } from './api-ingestor.service';
import {
  SubscribeDto,
  UnsubscribeDto,
  RegisterSchemaDto,
  IngestDto,
  BatchIngestDto,
} from './dto/ingestion.dto';
import { z } from 'zod';

@Controller('api/v2/ingestion')
export class IngestionController {
  constructor(
    private readonly mqttIngestorService: MqttIngestorService,
    private readonly schemaRegistry: IngestionSchemaRegistry,
    private readonly apiIngestorService: ApiIngestorService,
    private readonly mqttClientService: MqttClientService,
  ) {}

  @Get('status')
  async getStatus() {
    return await this.mqttIngestorService.getConnectionStatusResponse();
  }

  @Post('connect')
  @HttpCode(HttpStatus.OK)
  async connect() {
    await this.mqttIngestorService.connect();
    return { message: 'Connection initiated' };
  }

  @Post('disconnect')
  @HttpCode(HttpStatus.OK)
  async disconnect() {
    await this.mqttIngestorService.disconnect();
    return { message: 'Disconnect initiated' };
  }

  @Get('subscriptions')
  getSubscriptions() {
    const stats = this.mqttClientService.getStatistics();
    return { subscriptions: stats.subscriptions };
  }

  @Post('subscribe')
  async subscribe(@Body() dto: SubscribeDto) {
    const qos = dto.qos ?? 0;

    if (dto.schema) {
      const messageSchema = {
        topic: dto.topic,
        schema: z.object(dto.schema),
        version: dto.version,
        description: dto.description,
      };
      this.schemaRegistry.register(messageSchema);
    }

    await this.mqttIngestorService.subscribe(dto.topic, qos);
    return {
      message: 'Subscribed to ' + dto.topic,
      topic: dto.topic,
      qos,
    };
  }

  @Delete('unsubscribe')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unsubscribe(@Body() dto: UnsubscribeDto) {
    await this.mqttIngestorService.unsubscribe(dto.topic);
    return;
  }

  @Get('schemas')
  getSchemas() {
    return this.schemaRegistry.list();
  }

  @Get('schemas/:topic')
  getSchema(@Body('topic') topic: string) {
    const schema = this.schemaRegistry.get(topic);
    if (!schema) {
      throw new Error('Schema not found for topic: ' + topic);
    }
    return schema;
  }

  @Post('schemas')
  registerSchema(@Body() dto: RegisterSchemaDto) {
    const messageSchema = {
      topic: dto.topic,
      schema: z.object(dto.schema),
      version: dto.version,
      description: dto.description,
    };
    this.schemaRegistry.register(messageSchema);
    return {
      message: 'Schema registered for topic: ' + dto.topic,
      topic: dto.topic,
      version: dto.version,
    };
  }

  @Delete('schemas/:topic')
  @HttpCode(HttpStatus.NO_CONTENT)
  unregisterSchema(@Body('topic') topic: string) {
    this.schemaRegistry.unregister(topic);
    return;
  }

  @Post('ingest')
  async ingest(@Body() dto: IngestDto) {
    return await this.apiIngestorService.ingest(dto);
  }

  @Post('ingest/batch')
  async ingestBatch(@Body() dto: BatchIngestDto) {
    return await this.apiIngestorService.ingestBatch(dto);
  }
}
