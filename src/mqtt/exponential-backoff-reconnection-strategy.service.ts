import { Injectable, Logger } from '@nestjs/common';
import { ReconnectionStrategy } from './mqtt.types';
import { ConfigService } from '../config/config.service';

@Injectable()
export class ExponentialBackoffReconnectionStrategy implements ReconnectionStrategy {
  private readonly logger = new Logger(ExponentialBackoffReconnectionStrategy.name);

  constructor(private readonly configService: ConfigService) {}

  shouldReconnect(attempt: number): boolean {
    return attempt < this.configService.getConfig().mqtt.retryAttempts;
  }

  getDelay(attempt: number): number {
    const delay =
      this.configService.getConfig().mqtt.retryDelay *
      Math.pow(this.configService.getConfig().mqtt.backoffMultiplier, attempt);
    return Math.min(delay, this.configService.getConfig().mqtt.maxDelay);
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
