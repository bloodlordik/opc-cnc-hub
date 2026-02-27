import { Test, TestingModule } from '@nestjs/testing';
import { IngestionSchemaRegistry } from './schema-registry.service';
import { z } from 'zod';

describe('IngestionSchemaRegistry', () => {
  let service: IngestionSchemaRegistry;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [IngestionSchemaRegistry],
    }).compile();

    service = module.get<IngestionSchemaRegistry>(IngestionSchemaRegistry);
  });

  describe('register', () => {
    it('should register a schema', () => {
      const schema = {
        topic: 'test/topic',
        schema: z.object({ temperature: z.number() }),
        version: '1.0',
        description: 'Test schema',
      };

      service.register(schema);
      expect(service.has('test/topic')).toBe(true);
    });
  });

  describe('unregister', () => {
    it('should unregister a schema', () => {
      const schema = {
        topic: 'test/topic',
        schema: z.object({}),
        version: '1.0',
      };

      service.register(schema);
      expect(service.has('test/topic')).toBe(true);

      service.unregister('test/topic');
      expect(service.has('test/topic')).toBe(false);
    });
  });

  describe('get', () => {
    it('should get a registered schema', () => {
      const schema = {
        topic: 'test/topic',
        schema: z.object({}),
        version: '1.0',
      };

      service.register(schema);
      const retrieved = service.get('test/topic');

      expect(retrieved).toBeDefined();
      expect(retrieved?.topic).toBe('test/topic');
    });

    it('should return undefined for non-existent schema', () => {
      const retrieved = service.get('non/existent');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('list', () => {
    it('should return all registered schemas', () => {
      const schema1 = {
        topic: 'test/topic1',
        schema: z.object({}),
        version: '1.0',
      };
      const schema2 = {
        topic: 'test/topic2',
        schema: z.object({}),
        version: '2.0',
      };

      service.register(schema1);
      service.register(schema2);

      const schemas = service.list();
      expect(schemas).toHaveLength(2);
    });
  });

  describe('has', () => {
    it('should return true for registered schema', () => {
      const schema = {
        topic: 'test/topic',
        schema: z.object({}),
        version: '1.0',
      };

      service.register(schema);
      expect(service.has('test/topic')).toBe(true);
    });

    it('should return false for non-existent schema', () => {
      expect(service.has('non/existent')).toBe(false);
    });
  });
});
