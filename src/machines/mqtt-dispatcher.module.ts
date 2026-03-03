import { Module } from '@nestjs/common';
import { MqttDispatcherService } from './mqtt-dispatcher.service';
import { MachinesModule } from './machines.module';
import { MqttModule } from '../mqtt/mqtt.module';

/**
 * Модуль диспетчеризации MQTT сообщений
 *
 * Автоматически подписывается на MQTT топики станков при старте приложения
 * на основе конфигурации из базы данных
 */
@Module({
  imports: [
    MachinesModule,
    MqttModule,
  ],
  providers: [MqttDispatcherService],
  exports: [MqttDispatcherService],
})
export class MqttDispatcherModule {}
