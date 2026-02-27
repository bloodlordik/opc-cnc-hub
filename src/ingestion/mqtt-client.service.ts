import { Injectable, Logger } from '@nestjs/common';
import * as mqtt from 'mqtt';
import {
  IMqttClientService,
  MqttStatistics,
  QoS,
  Subscription,
} from './ingestion.types';
import { ConfigService } from '../config/config.service';

export type MessageCallback = (topic: string, payload: Buffer) => void

@Injectable()
export class MqttClientService implements IMqttClientService {
  private readonly logger = new Logger(MqttClientService.name);

  private client: mqtt.MqttClient | null = null;
  private messageCallbacks: Array<MessageCallback> = [];
  private subscriptions = new Map<string, Subscription>();
  private connectCount = 0;
  private disconnectCount = 0;

  constructor(private readonly configService: ConfigService) {}

  async connect(): Promise<void> {
    if (this.client?.connected) {
      this.logger.warn('Already connected to MQTT broker');
      return;
    }

    const config = this.configService.getConfig();
    const mqttConfig = config.mqtt;

    return new Promise<void>((resolve, reject) => {
      this.client = mqtt.connect(mqttConfig.broker, {
        clientId: mqttConfig.clientId,
        username: mqttConfig.username ?? undefined,
        password: mqttConfig.password ?? undefined,
        clean: mqttConfig.clean,
        connectTimeout: mqttConfig.connectTimeout,
        reconnectPeriod: mqttConfig.reconnectPeriod,
      });

      this.client.on('connect', () => {
        this.connectCount++;
        this.logger.log(`Connected to MQTT broker at ${mqttConfig.broker}`);
        resolve();
      });

      this.client.on('error', (error) => {
        this.logger.error('MQTT connection error', error);
        reject(error);
      });

      this.client.on('message', (topic, payload) => {
        if (this.messageCallbacks.length > 0) {
          for (const callback of this.messageCallbacks) {
            callback(topic, payload);
          }         
        }
      });

      this.client.on('disconnect', () => {
        this.disconnectCount++;
        this.logger.warn('Disconnected from MQTT broker');
      });

      this.client.on('reconnect', () => {
        this.logger.log('Reconnecting to MQTT broker...');
      });
    });
  }

  async disconnect(): Promise<void> {
    if (!this.client) {
      this.logger.warn('MQTT client not initialized');
      return;
    }

    const client = this.client;
    return new Promise<void>((resolve) => {
      if (client.connected) {
        client.end(false, {}, () => {
          this.client = null;
          this.subscriptions.clear();
          this.logger.log('Disconnected from MQTT broker');
          resolve();
        });
      } else {
        this.client = null;
        this.subscriptions.clear();
        resolve();
      }
    });
  }

  async subscribe(topic: string, qos: QoS = 0): Promise<void> {
    if (!this.client?.connected) {
      throw new Error('MQTT client is not connected');
    }

    return new Promise<void>((resolve, reject) => {
      this.client!.subscribe(topic, { qos }, (error, granted) => {
        if (error) {
          this.logger.error(`Failed to subscribe to topic ${topic}`, error);
          reject(error);
        } else {
          const grantedQos = granted?.[0]?.qos;
          const subscriptionQos: QoS =
            grantedQos === 0 || grantedQos === 1 || grantedQos === 2
              ? grantedQos
              : qos;
          const subscription: Subscription = {
            topic,
            qos: subscriptionQos,
            subscribedAt: new Date(),
          };
          this.subscriptions.set(topic, subscription);
          this.logger.log(`Subscribed to topic ${topic} with QoS ${qos}`);
          resolve();
        }
      });
    });
  }

  async unsubscribe(topic: string): Promise<void> {
    if (!this.client?.connected) {
      throw new Error('MQTT client is not connected');
    }

    return new Promise<void>((resolve, reject) => {
      this.client!.unsubscribe(topic, (error) => {
        if (error) {
          this.logger.error(`Failed to unsubscribe from topic ${topic}`, error);
          reject(error);
        } else {
          this.subscriptions.delete(topic);
          this.logger.log(`Unsubscribed from topic ${topic}`);
          resolve();
        }
      });
    });
  }

  onMessage(callback: MessageCallback): void {
    this.messageCallbacks.push(callback);
  }

  getStatistics(): MqttStatistics {
    return {
      isConnected: this.client?.connected ?? false,
      subscriptionCount: this.subscriptions.size,
      subscriptions: Array.from(this.subscriptions.values()),
      connectCount: this.connectCount,
      disconnectCount: this.disconnectCount,
    };
  }
}
