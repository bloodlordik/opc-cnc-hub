import { Test, TestingModule } from '@nestjs/testing';
import { CanonicalEventFactory } from './canonical-event-factory.service';
import { z } from 'zod';

describe('CanonicalEventFactory', () => {
  let factory: CanonicalEventFactory;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CanonicalEventFactory],
    }).compile();

    factory = module.get<CanonicalEventFactory>(CanonicalEventFactory);
  });

  describe('generateEventId', () => {
    it('should generate unique event IDs', () => {
      const id1 = factory.generateEventId();
      const id2 = factory.generateEventId();
      const id3 = factory.generateEventId();

      expect(id1).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
      expect(id2).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
      expect(id3).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );

      expect(id1).not.toBe(id2);
      expect(id1).not.toBe(id3);
      expect(id2).not.toBe(id3);
    });
  });

  describe('createFromMqtt', () => {
    it('should create event from valid MQTT message', () => {
      const topic = 'machine/1/telemetry';
      const payload = Buffer.from(
        JSON.stringify({ temperature: 25, pressure: 101 }),
      );
      const schema = {
        topic,
        schema: z.object({
          temperature: z.number(),
          pressure: z.number(),
        }),
        version: '1.0',
      };

      const event = factory.createFromMqtt(topic, payload, schema);

      expect(event).toHaveProperty('eventId');
      expect(event.source).toBe('mqtt');
      expect(event.topic).toBe(topic);
      expect(event.payload).toEqual({ temperature: 25, pressure: 101 });
      expect(event.timestamp).toBeInstanceOf(Date);
      expect(event.metadata).toHaveProperty('source', 'mqtt');
      expect(event.metadata).toHaveProperty('topic', topic);
    });

    it('should throw error for invalid JSON', () => {
      const topic = 'machine/1/telemetry';
      const payload = Buffer.from('invalid json');

      expect(() => factory.createFromMqtt(topic, payload)).toThrow();
    });

    it('should create event without schema validation when no schema provided', () => {
      const topic = 'machine/1/telemetry';
      const payload = Buffer.from(JSON.stringify({ temperature: 25 }));

      const event = factory.createFromMqtt(topic, payload);

      expect(event).toHaveProperty('eventId');
      expect(event.source).toBe('mqtt');
      expect(event.payload).toEqual({ temperature: 25 });
      expect(event.metadata).not.toHaveProperty('schemaVersion');
    });

    it('should throw error when schema validation fails', () => {
      const topic = 'machine/1/telemetry';
      const payload = Buffer.from(JSON.stringify({ temperature: 'invalid' }));
      const schema = {
        topic,
        schema: z.object({
          temperature: z.number(),
        }),
        version: '1.0',
      };

      expect(() => factory.createFromMqtt(topic, payload, schema)).toThrow();
    });
  });
});
