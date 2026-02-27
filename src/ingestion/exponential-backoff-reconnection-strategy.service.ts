import { Injectable, Logger } from '@nestjs/common';
import { ReconnectionStrategy } from './ingestion.types';
import { Optional, Inject } from '@nestjs/common';

export const DEFAULT_RECONNECT_ATTEMPTS = 10;
export const DEFAULT_INITIAL_DELAY = 1000;
export const DEFAULT_MAX_DELAY = 30000;
export const DEFAULT_BACKOFF_MULTIPLIER = 2;

@Injectable()
export class ExponentialBackoffReconnectionStrategy implements ReconnectionStrategy {
  private readonly logger = new Logger(
    ExponentialBackoffReconnectionStrategy.name,
  );

  constructor(
    @Optional()
    @Inject('mqtt.reconnect.maxAttempts')
    readonly maxAttempts: number = DEFAULT_RECONNECT_ATTEMPTS,
    @Optional()
    @Inject('mqtt.reconnect.initialDelay')
    readonly initialDelay: number = DEFAULT_INITIAL_DELAY,
    @Optional()
    @Inject('mqtt.reconnect.maxDelay')
    readonly maxDelay: number = DEFAULT_MAX_DELAY,
    @Optional()
    @Inject('mqtt.reconnect.backoffMultiplier')
    readonly backoffMultiplier: number = DEFAULT_BACKOFF_MULTIPLIER,
  ) {}

  shouldReconnect(attempt: number): boolean {
    return attempt < this.maxAttempts;
  }

  getDelay(attempt: number): number {
    const delay = this.initialDelay * Math.pow(this.backoffMultiplier, attempt);
    return Math.min(delay, this.maxDelay);
  }

  onConnect(): void {
    this.logger.log('ReconnectionStrategy: Connected');
  }

  onDisconnect(): void {
    this.logger.warn('ReconnectionStrategy: Disconnected');
  }

  onReconnectSuccess(attempt: number): void {
    this.logger.log(
      `ReconnectionStrategy: Reconnected successfully after ${attempt} attempt(s)`,
    );
  }
}
