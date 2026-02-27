import { Module } from '@nestjs/common';
import { ConfigModule } from '../config/config.module';
import { MqttClientService } from './mqtt-client.service';

import { IngestionSchemaRegistry } from './schema-registry.service';
import { CanonicalEventFactory } from './canonical-event-factory.service';
import { MqttIngestorService } from './mqtt-ingestor.service';
import { ApiIngestorService } from './api-ingestor.service';
import { IngestionController } from './ingestion.controller';
import { ExponentialBackoffReconnectionStrategy } from './exponential-backoff-reconnection-strategy.service';

@Module({
  imports: [ConfigModule],
  controllers: [IngestionController],
  providers: [    
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
