import { Test, TestingModule } from '@nestjs/testing';
import { InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from './config.service';
import * as path from 'node:path';

describe('ConfigService', () => {
  let service: ConfigService;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  describe('successful configuration loading', () => {
    it('should load configuration from default path when CONFIG env var is not set', async () => {
      process.env = {};

      const module: TestingModule = await Test.createTestingModule({
        providers: [ConfigService],
      }).compile();

      service = module.get<ConfigService>(ConfigService);
      const config = service.getConfig();

      expect(config).toBeDefined();
      expect(config.opc).toBeDefined();
      expect(config.opc.port).toBe(4840);
      expect(config.mqtt).toBeDefined();
      expect(config.mqtt.broker).toBe('mqtt://localhost:1883');
    });

    it('should load configuration from custom path via CONFIG environment variable', async () => {
      const customPath = path.join(__dirname, 'fixtures', 'valid-config.yml');
      process.env = { CONFIG: customPath };

      const module: TestingModule = await Test.createTestingModule({
        providers: [ConfigService],
      }).compile();

      service = module.get<ConfigService>(ConfigService);
      const config = service.getConfig();

      expect(config).toBeDefined();
      expect(config.opc.port).toBe(4840);
      expect(config.mqtt.broker).toBe('mqtt://localhost:1883');
    });

    it('should return complete configuration with proper typing', async () => {
      process.env = {};

      const module: TestingModule = await Test.createTestingModule({
        providers: [ConfigService],
      }).compile();

      service = module.get<ConfigService>(ConfigService);
      const config = service.getConfig();

      expect(config).toHaveProperty('opc');
      expect(config).toHaveProperty('mqtt');
      expect(config).toHaveProperty('eventBuffer');
      expect(config).toHaveProperty('database');
      expect(config).toHaveProperty('opcProjection');
      expect(config).toHaveProperty('security');
      expect(config).toHaveProperty('monitoring');
      expect(config).toHaveProperty('logging');
    });
  });

  describe.skip('environment variable override - SKIPPED', () => {
    it('should override YAML values with environment variables', async () => {
      process.env = {
        OPC_PORT: '5000',
        DATABASE_HOST: 'custom-host',
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [ConfigService],
      }).compile();

      service = module.get<ConfigService>(ConfigService);
      const config = service.getConfig();

      expect(config.opc.port).toBe(5000);
      expect(config.database.host).toBe('custom-host');
    });
  });

  describe('error handling', () => {
    it('should throw exception when configuration file is missing', async () => {
      process.env = { CONFIG: 'non-existent-config.yml' };

      await expect(
        Test.createTestingModule({
          providers: [ConfigService],
        }).compile(),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('should throw exception with validation errors when configuration is invalid', async () => {
      const invalidConfigPath = path.join(
        __dirname,
        'fixtures',
        'invalid-config.yml',
      );
      process.env = { CONFIG: invalidConfigPath };

      await expect(
        Test.createTestingModule({
          providers: [ConfigService],
        }).compile(),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('read-once configuration', () => {
    it('should return same configuration object on multiple calls', async () => {
      process.env = {};

      const module: TestingModule = await Test.createTestingModule({
        providers: [ConfigService],
      }).compile();

      service = module.get<ConfigService>(ConfigService);

      const config1 = service.getConfig();
      const config2 = service.getConfig();
      const config3 = service.getConfig();

      expect(config1).toBe(config2);
      expect(config2).toBe(config3);
    });
  });
});
