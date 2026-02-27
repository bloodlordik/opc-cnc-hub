import { ExponentialBackoffReconnectionStrategy } from './exponential-backoff-reconnection-strategy.service';

describe('ExponentialBackoffReconnectionStrategy', () => {
  let strategy: ExponentialBackoffReconnectionStrategy;

  beforeEach(() => {
    strategy = new ExponentialBackoffReconnectionStrategy();
  });

  describe('shouldReconnect', () => {
    it('should return true when attempts are below default max (10)', () => {
      expect(strategy.shouldReconnect(0)).toBe(true);
      expect(strategy.shouldReconnect(5)).toBe(true);
      expect(strategy.shouldReconnect(9)).toBe(true);
    });

    it('should return false when attempts reach default max (10)', () => {
      expect(strategy.shouldReconnect(10)).toBe(false);
      expect(strategy.shouldReconnect(11)).toBe(false);
    });
  });

  describe('getDelay', () => {
    it('should return exponentially increasing delays', () => {
      expect(strategy.getDelay(0)).toBe(1000);
      expect(strategy.getDelay(1)).toBe(2000);
      expect(strategy.getDelay(2)).toBe(4000);
      expect(strategy.getDelay(3)).toBe(8000);
    });

    it('should cap delay at max delay', () => {
      expect(strategy.getDelay(5)).toBe(30000);
      expect(strategy.getDelay(6)).toBe(30000);
      expect(strategy.getDelay(10)).toBe(30000);
    });
  });

  describe('hooks', () => {
    it('should have onConnect hook', () => {
      expect(strategy.onConnect).toBeDefined();
      expect(typeof strategy.onConnect).toBe('function');
    });

    it('should have onDisconnect hook', () => {
      expect(strategy.onDisconnect).toBeDefined();
      expect(typeof strategy.onDisconnect).toBe('function');
    });

    it('should have onReconnectSuccess hook', () => {
      expect(strategy.onReconnectSuccess).toBeDefined();
      expect(typeof strategy.onReconnectSuccess).toBe('function');
    });
  });
});
