import { z } from 'zod';
import { CncRawMessageSchema } from '../ingestion/schemas/cnc-raw.schema';
import { CncStatusMessageSchema } from '../ingestion/schemas/cnc-status.schema';

/**
 * Типы схем для маппинга
 */
export enum SchemaType {
  CNC_RAW = 'BPT6-Syntec',
  CNC_STATUS = 'OPC-Syntec',
}

/**
 * Интерфейс для маппинга схем
 */
export interface SchemaMapper {
  getSchema(schemaName: string): z.ZodSchema | null;
  getDescription(schemaName: string): string;
  hasSchema(schemaName: string): boolean;
  getRegisteredSchemas(): string[];
}

/**
 * Реализация маппера схем
 */
export class CncSchemaMapper implements SchemaMapper {
  private readonly schemaMap = new Map<string, { schema: z.ZodSchema; description: string }>([
    [
      SchemaType.CNC_RAW,
      {
        schema: CncRawMessageSchema,
        description: 'CNC raw parameters message from API',
      },
    ],
    [
      SchemaType.CNC_STATUS,
      {
        schema: CncStatusMessageSchema,
        description: 'CNC status message from OPC server',
      },
    ],
  ]);

  getSchema(schemaName: string): z.ZodSchema | null {
    return this.schemaMap.get(schemaName)?.schema ?? null;
  }

  getDescription(schemaName: string): string {
    return this.schemaMap.get(schemaName)?.description ?? 'Unknown schema';
  }

  /**
   * Проверка наличия схемы
   */
  hasSchema(schemaName: string): boolean {
    return this.schemaMap.has(schemaName);
  }

  /**
   * Получить все зарегистрированные имена схем
   */
  getRegisteredSchemas(): string[] {
    return Array.from(this.schemaMap.keys());
  }
}
