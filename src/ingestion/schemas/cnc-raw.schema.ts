import { z } from 'zod';

/**
 * Режимы работы CNC станка
 */
export const CncModeSchema = z.enum([
  'AUTO',
  'JOG',
  'MDI',
  'EDIT',
  'HANDLE',
  'RAPID',
  'ZERO',
  'STOP',
]);

/**
 * Статусы CNC станка
 */
export const CncStatusSchema = z.enum([
  'START',
  'STOP',
  'READY',
  'RUNNING',
  'IDLE',
  'ERROR',
  'ALARM',
  'EMERGENCY',
]);

/**
 * Схема метаданных сообщения
 */
export const CncMetaSchema = z.object({
  Name: z.string().describe('Название станка/организации'),
  Org: z.string().describe('Организация'),
  ClientId: z.string().describe('Идентификатор клиента'),
});

/**
 * Схема информации о протоколе
 */
export const CncProtocolSchema = z.object({
  ProtocolName: z.string().describe('Имя протокола'),
  ProtocolVersion: z.number().int().nonnegative().describe('Версия протокола'),
});

/**
 * Схема сообщения CNC параметров (raw format)
 * 
 * Пример использования:
 * ```typescript
 * const schema = CncRawMessageSchema;
 * const validated = schema.parse(message);
 * 
 * // Или через registry:
 * registry.registerSchema('api/cnc/raw', CncRawMessageSchema, {
 *   version: '1.0.0',
 *   description: 'CNC raw parameters message from API',
 * });
 * ```
 */
export const CncRawMessageSchema = z.object({
  Timestamp: z
    .string()
    .datetime({ offset: true })
    .describe('Временная метка с часовым поясом'),
  MainProg: z.string().describe('Основная программа'),
  CurProg: z.string().describe('Текущая программа'),
  CurrSeq: z.number().int().nonnegative().describe('Текущая последовательность'),
  Mode: CncModeSchema.describe('Режим работы станка'),
  Status: CncStatusSchema.describe('Статус станка'),
  Alarm: z.string().describe('Код ошибки (**** если нет ошибок)'),
  EMG: z.string().describe('Статус аварийной остановки (**** если нет)'),
  OvFeed: z.number().int().min(0).max(200).describe('Переопределение подачи (%)'),
  OvSpindel: z
    .number()
    .int()
    .min(0)
    .max(200)
    .describe('Переопределение шпинделя (%)'),
  ActFeed: z.number().nonnegative().describe('Фактическая подача (мм/мин)'),
  ActSpindel: z.number().nonnegative().describe('Фактическая скорость шпинделя (об/мин)'),
  RemoteTime: z.string().describe('Удаленное время'),
  PowerOnTime: z.number().int().nonnegative().describe('Время включения (секунды)'),
  AccumulateCutttingTime: z
    .number()
    .int()
    .nonnegative()
    .describe('Накопленное время резания (секунды)'),
  CuttingTimePerCycle: z
    .number()
    .int()
    .nonnegative()
    .describe('Время резания за цикл (секунды)'),
  WorkTime: z.number().int().nonnegative().describe('Время работы (секунды)'),
  IsAlarm: z.boolean().describe('Флаг наличия ошибки'),
  Alarms: z.array(z.string()).describe('Массив активных ошибок'),
  meta: CncMetaSchema.describe('Метаданные сообщения'),
  Schema: CncProtocolSchema.describe('Информация о протоколе'),
});

/**
 * Тип для валидированного сообщения CNC параметров
 */
export type CncRawMessage = z.infer<typeof CncRawMessageSchema>;

/**
 * Тип для метаданных сообщения
 */
export type CncMeta = z.infer<typeof CncMetaSchema>;

/**
 * Тип для информации о протоколе
 */
export type CncProtocol = z.infer<typeof CncProtocolSchema>;

/**
 * Helper функция для регистрации схемы в реестре
 */
export function registerCncRawSchema(
  topic: string,
  options?: { version?: string; description?: string },
) {
  return {
    topic,
    schema: CncRawMessageSchema,
    version: options?.version ?? '1.0.0',
    description: options?.description ?? 'CNC raw parameters message from API',
  };
}
