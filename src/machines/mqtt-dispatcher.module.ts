import { Module } from '@nestjs/common';
import { MqttDispatcherService } from './mqtt-dispatcher.service';
import { MachinesModule } from './machines.module';
import { IngestionModule } from '../ingestion/ingestion.module';

/**
 * Модуль диспетчеризации MQTT сообщений
 * 
 * Автоматически подписывается на MQTT топики станков при старте приложения
 * на основе конфигурации из базы данных
 */
@Module({
  imports: [
    MachinesModule,
    IngestionModule,
  ],
  providers: [MqttDispatcherService],
  exports: [MqttDispatcherService],
})
export class MqttDispatcherModule {}
