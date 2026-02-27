import { Test, TestingModule } from '@nestjs/testing';
import { MqttClientService } from './mqtt-client.service';
import { ConfigModule } from '../config/config.module';

describe('MqttClientService', () => {
  let service: MqttClientService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule],
      providers: [MqttClientService],
    }).compile();

    service = module.get<MqttClientService>(MqttClientService);
  });

  describe('service instantiation', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should have connect method', () => {
      expect(service.connect).toBeDefined();
      expect(typeof service.connect).toBe('function');
    });

    it('should have disconnect method', () => {
      expect(service.disconnect).toBeDefined();
      expect(typeof service.disconnect).toBe('function');
    });

    it('should have subscribe method', () => {
      expect(service.subscribe).toBeDefined();
      expect(typeof service.subscribe).toBe('function');
    });

    it('should have unsubscribe method', () => {
      expect(service.unsubscribe).toBeDefined();
      expect(typeof service.unsubscribe).toBe('function');
    });

    it('should have onMessage method', () => {
      expect(service.onMessage).toBeDefined();
      expect(typeof service.onMessage).toBe('function');
    });

    it('should have getStatistics method', () => {
      expect(service.getStatistics).toBeDefined();
      expect(typeof service.getStatistics).toBe('function');
    });
  });

  describe('getStatistics', () => {
    it('should return statistics object with correct structure', () => {
      const stats = service.getStatistics();

      expect(stats).toBeDefined();
      expect(stats).toHaveProperty('isConnected');
      expect(stats).toHaveProperty('subscriptionCount');
      expect(stats).toHaveProperty('subscriptions');
      expect(stats).toHaveProperty('connectCount');
      expect(stats).toHaveProperty('disconnectCount');
      expect(typeof stats.isConnected).toBe('boolean');
      expect(typeof stats.subscriptionCount).toBe('number');
      expect(Array.isArray(stats.subscriptions)).toBe(true);
      expect(typeof stats.connectCount).toBe('number');
      expect(typeof stats.disconnectCount).toBe('number');
    });
  });
});
