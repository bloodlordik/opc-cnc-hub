import { Module } from '@nestjs/common';
import { ConfigModule } from '../config/config.module';
import { MqttClientService } from './mqtt-client.service';
import {
  ExponentialBackoffReconnectionStrategy,
  DEFAULT_RECONNECT_ATTEMPTS,
  DEFAULT_INITIAL_DELAY,
  DEFAULT_MAX_DELAY,
  DEFAULT_BACKOFF_MULTIPLIER,
} from './exponential-backoff-reconnection-strategy.service';
import { IngestionSchemaRegistry } from './schema-registry.service';
import { CanonicalEventFactory } from './canonical-event-factory.service';
import { MqttIngestorService } from './mqtt-ingestor.service';
import { ApiIngestorService } from './api-ingestor.service';
import { IngestionController } from './ingestion.controller';

@Module({
  imports: [ConfigModule],
  controllers: [IngestionController],
  providers: [
    {
      provide: 'mqtt.reconnect.maxAttempts',
      useValue: DEFAULT_RECONNECT_ATTEMPTS,
    },
    {
      provide: 'mqtt.reconnect.initialDelay',
      useValue: DEFAULT_INITIAL_DELAY,
    },
    {
      provide: 'mqtt.reconnect.maxDelay',
      useValue: DEFAULT_MAX_DELAY,
    },
    {
      provide: 'mqtt.reconnect.backoffMultiplier',
      useValue: DEFAULT_BACKOFF_MULTIPLIER,
    },
    MqttClientService,
    ExponentialBackoffReconnectionStrategy,
    IngestionSchemaRegistry,
    CanonicalEventFactory,
    MqttIngestorService,
    ApiIngestorService,
  ],
  exports: [
    MqttClientService,
    IngestionSchemaRegistry,
    CanonicalEventFactory,
    MqttIngestorService,
    ApiIngestorService,
  ],
})
export class IngestionModule {}
