import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { MessageSchemaRegistryService, MqttIngestorService } from '../mqtt';
import { MachinesService } from './machines.service';
import { CncSchemaMapper, SchemaMapper } from './schema-mapper';
import { Machine } from './entities/machine.entity';

/**
 * Информация о подписке на топик
 */
interface TopicSubscription {
  topic: string;
  machineId: number;
  machineName: string;
  schemaName: string;
  subscribed: boolean;
}

/**
 * Сервис диспетчеризации MQTT сообщений на основе конфигурации станков
 *
 * Автоматически подписывается на топики станков при старте приложения
 * и регистрирует соответствующие схемы валидации
 */
@Injectable()
export class MqttDispatcherService implements OnModuleInit {
  private readonly logger = new Logger(MqttDispatcherService.name);
  private readonly schemaMapper: SchemaMapper;
  private readonly subscriptions = new Map<string, TopicSubscription>();

  constructor(
    private readonly machinesService: MachinesService,
    private readonly mqttIngestorService: MqttIngestorService,
    private readonly schemaRegistry: MessageSchemaRegistryService,
  ) {
    this.schemaMapper = new CncSchemaMapper();
  }

  async onModuleInit(): Promise<void> {
    this.logger.log('Initializing MQTT dispatcher...');
    await this.subscribeToAllMachines();
  }

  /**
   * Подписка на все станки из базы данных
   */
  private async subscribeToAllMachines(): Promise<void> {
    try {
      const machines = await this.machinesService.findAllMachines();

      if (machines.length === 0) {
        this.logger.log('No machines found in database, skipping MQTT subscriptions');
        return;
      }

      this.logger.log(`Found ${machines.length} machine(s) to subscribe to`);

      for (const machine of machines) {
        await this.subscribeToMachine(machine);
      }

      this.logSubscriptionSummary();
    } catch (error) {
      this.logger.error('Failed to subscribe to machines', error);
      throw error;
    }
  }

  /**
   * Подписка на конкретный станок
   */
  private async subscribeToMachine(machine: Machine): Promise<void> {
    // Пропускаем станки без MQTT топика
    if (!machine.mqttSource) {
      this.logger.debug(`Machine "${machine.name}" has no MQTT topic, skipping`);
      return;
    }

    // Пропускаем станки без схемы
    if (!machine.messageSchema) {
      this.logger.warn(`Machine "${machine.name}" has no message schema, skipping`);
      return;
    }

    const schemaName = machine.messageSchema.name;

    // Проверяем, есть ли у нас маппер для этой схемы
    if (!this.schemaMapper.hasSchema(schemaName)) {
      this.logger.warn(
        `No schema mapper found for "${schemaName}" (machine: ${machine.name}). ` +
          `Available schemas: ${this.schemaMapper.getRegisteredSchemas().join(', ')}`,
      );
      return;
    }

    // Получаем схему из маппера
    const schema = this.schemaMapper.getSchema(schemaName);
    const description = this.schemaMapper.getDescription(schemaName);

    if (!schema) {
      this.logger.error(`Schema "${schemaName}" returned null from mapper`);
      return;
    }

    // Регистрируем схему в реестре
    const topic = machine.mqttSource;
    this.schemaRegistry.registerSchema(topic, schema, {
      version: '1.0.0',
      description: `${description} (machine: ${machine.name}, ID: ${machine.id})`,
    });

    // Подписываемся на топик
    try {
      await this.mqttIngestorService.subscribe(topic, 1);

      // Сохраняем информацию о подписке
      this.subscriptions.set(topic, {
        topic,
        machineId: machine.id,
        machineName: machine.name,
        schemaName,
        subscribed: true,
      });

      this.logger.log(
        `Subscribed to topic "${topic}" for machine "${machine.name}" ` +
          `with schema "${schemaName}"`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to subscribe to topic "${topic}" for machine "${machine.name}"`,
        error,
      );

      this.subscriptions.set(topic, {
        topic,
        machineId: machine.id,
        machineName: machine.name,
        schemaName,
        subscribed: false,
      });
    }
  }

  /**
   * Логирование итогов подписки
   */
  private logSubscriptionSummary(): void {
    const subscribed = Array.from(this.subscriptions.values()).filter((s) => s.subscribed);
    const failed = Array.from(this.subscriptions.values()).filter((s) => !s.subscribed);

    this.logger.log(`MQTT subscription summary:`);
    this.logger.log(`  - Successfully subscribed: ${subscribed.length}`);
    this.logger.log(`  - Failed: ${failed.length}`);

    if (subscribed.length > 0) {
      this.logger.log('  Subscriptions:');
      for (const sub of subscribed) {
        this.logger.log(
          `    - ${sub.topic} (machine: ${sub.machineName}, schema: ${sub.schemaName})`,
        );
      }
    }

    if (failed.length > 0) {
      this.logger.warn('  Failed subscriptions:');
      for (const sub of failed) {
        this.logger.warn(`    - ${sub.topic} (machine: ${sub.machineName})`);
      }
    }
  }

  /**
   * Получить информацию о всех подписках
   */
  getSubscriptions(): TopicSubscription[] {
    return Array.from(this.subscriptions.values());
  }

  /**
   * Получить информацию о конкретной подписке
   */
  getSubscription(topic: string): TopicSubscription | undefined {
    return this.subscriptions.get(topic);
  }

  /**
   * Принудительная переподписка на все станки
   * Полезно при восстановлении соединения с MQTT брокером
   */
  async resubscribeAll(): Promise<void> {
    this.logger.log('Resubscribing to all machines...');
    this.subscriptions.clear();
    await this.subscribeToAllMachines();
  }

  /**
   * Подписка на новый станок (динамическое добавление)
   */
  async subscribeToMachineById(machineId: number): Promise<void> {
    const machine = await this.machinesService.findOneMachine(machineId);

    if (!machine) {
      throw new Error(`Machine with ID ${machineId} not found`);
    }

    await this.subscribeToMachine(machine);
  }

  /**
   * Отписка от станка
   */
  async unsubscribeFromMachine(machineId: number): Promise<void> {
    const subscription = Array.from(this.subscriptions.values()).find(
      (s) => s.machineId === machineId,
    );

    if (!subscription) {
      this.logger.debug(`No subscription found for machine ID ${machineId}`);
      return;
    }

    try {
      await this.mqttIngestorService.unsubscribe(subscription.topic);
      this.subscriptions.delete(subscription.topic);
      this.schemaRegistry.unregister(subscription.topic);

      this.logger.log(
        `Unsubscribed from machine "${subscription.machineName}" (topic: ${subscription.topic})`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to unsubscribe from machine "${subscription.machineName}"`,
        error,
      );
      throw error;
    }
  }
}
