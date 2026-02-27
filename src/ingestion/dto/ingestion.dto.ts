import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  Min,
  Max,
  IsObject,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import type { QoS } from '../ingestion.types';

export class SubscribeDto {
  @IsString()
  @IsNotEmpty()
  topic!: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(2)
  qos?: QoS;

  @IsObject()
  @IsOptional()
  schema?: Record<string, unknown>;

  @IsString()
  @IsOptional()
  version?: string;

  @IsString()
  @IsOptional()
  description?: string;
}

export class UnsubscribeDto {
  @IsString()
  @IsNotEmpty()
  topic!: string;
}

export class RegisterSchemaDto {
  @IsString()
  @IsNotEmpty()
  topic!: string;

  @IsObject()
  @IsNotEmpty()
  schema!: Record<string, unknown>;

  @IsString()
  @IsOptional()
  version?: string;

  @IsString()
  @IsOptional()
  description?: string;
}

export class IngestDto {
  @IsString()
  @IsNotEmpty()
  source!: string;

  @IsString()
  @IsOptional()
  topic?: string;

  @IsObject()
  @IsNotEmpty()
  payload!: Record<string, unknown>;
}

export class BatchIngestDto {
  @IsArray()
  @IsNotEmpty()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  messages!: IngestDto[];
}
