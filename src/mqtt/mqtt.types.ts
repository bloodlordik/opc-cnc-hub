import { z } from 'zod';

export enum ConnectionStatus {
  CONNECTED = 'CONNECTED',
  DISCONNECTED = 'DISCONNECTED',
  RECONNECTING = 'RECONNECTING',
  FAILED = 'FAILED',
}

export type QoS = 0 | 1 | 2;

export interface Subscription {
  topic: string;
  qos: QoS;
  subscribedAt: Date;
}

export interface MqttStatistics {
  isConnected: boolean;
  subscriptionCount: number;
  subscriptions: Subscription[];
  connectCount: number;
  disconnectCount: number;
}

export interface CanonicalEvent {
  eventId: string;
  source: 'mqtt' | 'api';
  topic?: string;
  payload: Record<string, unknown>;
  timestamp: Date;
  metadata: EventMetadata;
}

export interface EventMetadata {
  [key: string]: unknown;
}

export interface ReconnectionStrategy {
  shouldReconnect(attempt: number, lastError?: Error): boolean;
  getDelay(attempt: number): number;
  onConnect(): void;
  onDisconnect(): void;
  onReconnectSuccess(attempt: number): void;
}

export interface IMqttClientService {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  subscribe(topic: string, qos: QoS): Promise<void>;
  unsubscribe(topic: string): Promise<void>;
  onMessage(callback: (topic: string, payload: Buffer) => void): void;
  getStatistics(): MqttStatistics;
}
