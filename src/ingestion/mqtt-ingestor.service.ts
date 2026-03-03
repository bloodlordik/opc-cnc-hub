import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
  OnApplicationShutdown,
} from '@nestjs/common';
import { Subject, Observable, filter, share } from 'rxjs';
import { ConnectionStatus, CanonicalEvent } from './ingestion.types';
import { MqttClientService } from './mqtt-client.service';
import { ExponentialBackoffReconnectionStrategy } from './exponential-backoff-reconnection-strategy.service';
import { CanonicalEventFactory } from './canonical-event-factory.service';
import type { QoS } from './ingestion.types';
import { ConfigService } from 'src/config/config.service';
import { MessageSchemaRegistryService } from './message-schema-registry.service';

@Injectable()
export class MqttIngestorService
  implements OnModuleInit, OnModuleDestroy, OnApplicationShutdown
{
  private readonly logger = new Logger(MqttIngestorService.name);
  private connectionStatus: ConnectionStatus = ConnectionStatus.DISCONNECTED;
  private reconnectionAttempt = 0;
  private reconnectionTimer: NodeJS.Timeout | null = null;
  private readonly messageSubject = new Subject<CanonicalEvent>();
  private readonly messageObservable: Observable<CanonicalEvent>;

  constructor(
    private readonly mqttClientService: MqttClientService,
    private readonly reconnectionStrategy: ExponentialBackoffReconnectionStrategy,
    private readonly schemaRegistry: MessageSchemaRegistryService,
    private readonly canonicalEventFactory: CanonicalEventFactory,
    private readonly config: ConfigService,
  ) {
    this.messageObservable = this.messageSubject.asObservable().pipe(share());
  }

  async onModuleInit(): Promise<void> {
    this.logger.log('Initializing MqttIngestorService');
    await this.connect();
    this.setupMessageHandler();
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log('Destroying MqttIngestorService');
    this.clearReconnectionTimer();
    this.messageSubject.complete();
    await this.disconnect();
  }

  async onApplicationShutdown(): Promise<void> {
    this.logger.log('Application shutdown, cleaning up MQTT resources');
    this.messageSubject.complete();
    await this.disconnect();
  }

  private clearReconnectionTimer(): void {
    if (this.reconnectionTimer) {
      clearTimeout(this.reconnectionTimer);
      this.reconnectionTimer = null;
    }
  }

  async connect(): Promise<void> {
    this.logger.log('Attempting to connect to MQTT broker');
    this.connectionStatus = ConnectionStatus.RECONNECTING;
    this.reconnectionAttempt = 0;

    try {
      await this.mqttClientService.connect();
      this.connectionStatus = ConnectionStatus.CONNECTED;
      this.reconnectionStrategy.onConnect();
      this.reconnectionAttempt = 0;
    } catch (error) {
      this.logger.error('Failed to connect to MQTT broker', error);
      this.connectionStatus = ConnectionStatus.DISCONNECTED;
      this.scheduleReconnection(error);
    }
  }

  async disconnect(): Promise<void> {
    this.logger.log('Disconnecting from MQTT broker');
    this.clearReconnectionTimer();
    try {
      await this.mqttClientService.disconnect();
      this.connectionStatus = ConnectionStatus.DISCONNECTED;
      this.reconnectionStrategy.onDisconnect();
    } catch (error) {
      this.logger.error('Error during disconnect', error);
    }
  }

  private scheduleReconnection(error?: Error): void {
    if (
      !this.reconnectionStrategy.shouldReconnect(this.reconnectionAttempt)
    ) {
      this.logger.error(
        'Max reconnection attempts reached. Connection failed.',
        error,
      );
      this.connectionStatus = ConnectionStatus.FAILED;
      return;
    }

    const delay = this.reconnectionStrategy.getDelay(this.reconnectionAttempt);
    this.logger.log(
      `Scheduling reconnection attempt ${this.reconnectionAttempt + 1} in ${delay}ms`,
    );

    this.reconnectionTimer = setTimeout(async () => {
      this.reconnectionAttempt++;
      try {
        await this.mqttClientService.connect();
        this.connectionStatus = ConnectionStatus.CONNECTED;
        this.reconnectionStrategy.onReconnectSuccess(this.reconnectionAttempt);
        this.reconnectionAttempt = 0;
      } catch (reconnectError) {
        this.logger.error(
          `Reconnection attempt ${this.reconnectionAttempt} failed`,
          reconnectError,
        );
        this.connectionStatus = ConnectionStatus.RECONNECTING;
        this.scheduleReconnection(reconnectError as Error);
      }
    }, delay);
  }

  async subscribe(
    topic: string,
    qos: QoS = 0,
    schema?: string,
  ): Promise<void> {
    try {
      await this.mqttClientService.subscribe(topic, qos);
      this.logger.log(`Subscribed to topic ${topic} with QoS ${qos}`);
    } catch (error) {
      this.logger.error(`Failed to subscribe to topic ${topic}`, error);
      throw error;
    }
  }

  async unsubscribe(topic: string): Promise<void> {
    try {
      await this.mqttClientService.unsubscribe(topic);
      this.logger.log(`Unsubscribed from topic ${topic}`);
    } catch (error) {
      this.logger.error(`Failed to unsubscribe from topic ${topic}`, error);
      throw error;
    }
  }

  private setupMessageHandler(): void {
    this.mqttClientService.onMessage(async (topic, payload) => {
      try {
        const event = this.canonicalEventFactory.createFromMqtt(
          topic,
          payload,
        );

        this.messageSubject.next(event);
      } catch (error) {
        this.logger.error(
          `Failed to process message from topic ${topic}`,
          error,
        );
      }
    });
  }

  /**
   * Возвращает реактивный поток всех MQTT сообщений в виде CanonicalEvent
   * Другие сервисы могут подписываться на этот поток для обработки сообщений
   *
   * @example
   * // В другом сервисе:
   * constructor(private mqttIngestor: MqttIngestorService) {
   *   this.mqttIngestor.getMessageStream()
   *     .pipe(filter(event => event.topic?.startsWith('cnc/')))
   *     .subscribe(event => this.handleCncEvent(event));
   * }
   */
  getMessageStream(): Observable<CanonicalEvent> {
    return this.messageObservable;
  }

  /**
   * Возвращает отфильтрованный поток сообщений по указанному топику (поддерживает wildcard)
   *
   * @param topicPattern - Шаблон топика (например, 'cnc/+/status' или 'cnc/device1/#')
   * @example
   * // Подписка на все статусы CNC устройств:
   * mqttIngestor.getMessageStreamByTopic('cnc/+/status')
   *   .subscribe(event => console.log('CNC Status:', event.payload));
   */
  getMessageStreamByTopic(topicPattern: string): Observable<CanonicalEvent> {
    const regexPattern = topicPattern
      .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
      .replace(/#/g, '.*')
      .replace(/\+/g, '[^/]+');

    const topicRegex = new RegExp(`^${regexPattern}$`);

    return this.messageObservable.pipe(
      filter((event) => !!event.topic && topicRegex.test(event.topic)),
    );
  }

  getConnectionStatus(): ConnectionStatus {
    return this.connectionStatus;
  }

  async getConnectionStatusResponse() {
    const stats = this.mqttClientService.getStatistics();
    return {
      status: this.connectionStatus,
      brokerUrl: this.config.getConfig().mqtt.broker,
      clientId: this.config.getConfig().mqtt.clientId,
      connectedAt: stats.isConnected ? new Date() : undefined,
      lastError:
        this.connectionStatus === ConnectionStatus.FAILED
          ? 'Max reconnection attempts reached'
          : undefined,
      subscriptionCount: stats.subscriptionCount,
      connectCount: stats.connectCount,
      disconnectCount: stats.disconnectCount,
    };
  }
}
