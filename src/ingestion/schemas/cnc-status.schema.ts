import { z } from 'zod';

/**
 * Типы данных CNC значений
 */
export const CncDataTypeSchema = z.enum([
  'String',
  'Int32',
  'Float',
  'Double',
  'Boolean',
  'UInt32',
  'Int16',
  'UInt16',
]);

/**
 * Единицы измерения CNC
 */
export const CncUnitSchema = z.enum([
  'program.name',
  'line',
  'Syntec.Mode',
  'Syntec.Status',
  'Syntec.Alarm',
  'Syntec.Emg',
  'Percent',
  'mm/min',
  'RPM',
  'pcs',
  'seconds',
  'mm',
  'deg',
]);

/**
 * Схема отдельного значения CNC
 */
export const CncValueSchema = z.object({
  path: z.string().describe('Путь к параметру (например, CncStatus.MainProg)'),
  value: z.union([z.string(), z.number(), z.boolean()]).describe('Значение параметра'),
  type: CncDataTypeSchema.describe('Тип данных'),
  unit: CncUnitSchema.describe('Единица измерения'),
});

/**
 * Схема сообщения статуса CNC станка
 * 
 * Пример использования:
 * ```typescript
 * const schema = CncStatusMessageSchema;
 * const validated = schema.parse(message);
 * 
 * // Или через registry:
 * registry.registerSchema('cnc/+/status', CncStatusMessageSchema, {
 *   version: '1.0.0',
 *   description: 'Сообщение статуса CNC станка F500T-R',
 * });
 * ```
 */
export const CncStatusMessageSchema = z.object({
  timestamp: z.string().datetime().describe('Временная метка в формате ISO 8601'),
  source: z.string().describe('Идентификатор источника (например, F500T-R-01)'),
  values: z.array(CncValueSchema).describe('Массив значений параметров CNC'),
});

/**
 * Тип для валидированного сообщения CNC статуса
 */
export type CncStatusMessage = z.infer<typeof CncStatusMessageSchema>;

/**
 * Тип для отдельного значения CNC
 */
export type CncValue = z.infer<typeof CncValueSchema>;

/**
 * Helper функция для регистрации схемы в реестре
 */
export function registerCncStatusSchema(
  topic: string,
  options?: { version?: string; description?: string },
) {
  return {
    topic,
    schema: CncStatusMessageSchema,
    version: options?.version ?? '1.0.0',
    description: options?.description ?? 'Сообщение статуса CNC станка F500T-R',
  };
}
