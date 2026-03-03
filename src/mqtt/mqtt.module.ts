import { Module } from '@nestjs/common';
import { ConfigModule } from '../config/config.module';
import { MqttClientService } from './mqtt-client.service';
import { ExponentialBackoffReconnectionStrategy } from './exponential-backoff-reconnection-strategy.service';
import { MessageSchemaRegistryService } from './message-schema-registry.service';
import { CanonicalEventFactory } from './canonical-event-factory.service';
import { MqttIngestorService } from './mqtt-ingestor.service';

@Module({
  imports: [ConfigModule],
  providers: [
    MqttClientService,
    ExponentialBackoffReconnectionStrategy,
    MessageSchemaRegistryService,
    CanonicalEventFactory,
    MqttIngestorService,
  ],
  exports: [
    MqttClientService,
    ExponentialBackoffReconnectionStrategy,
    MessageSchemaRegistryService,
    CanonicalEventFactory,
    MqttIngestorService,
  ],
})
export class MqttModule {}
