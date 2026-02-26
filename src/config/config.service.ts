import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as fs from 'node:fs';
import * as yaml from 'js-yaml';
import { configSchema, Config } from './config.schema';

@Injectable()
export class ConfigService {
  private readonly config: Config;

  constructor() {
    const configPath = process.env.CONFIG || 'config/local.yml';

    let rawConfig: unknown;

    try {
      const fileContent = fs.readFileSync(configPath, 'utf-8');
      rawConfig = yaml.load(fileContent);
    } catch (error) {
      throw new InternalServerErrorException(
        `Configuration file not found or could not be read at path: ${configPath}. Error: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    const configWithEnv = this.applyEnvironmentVariables(rawConfig);
    const parseResult = configSchema.safeParse(configWithEnv);

    if (!parseResult.success) {
      const errorMessages = parseResult.error.issues
        .map((e) => `${e.path.join('.')}: ${e.message}`)
        .join('\n  ');

      throw new InternalServerErrorException(
        `Configuration validation failed:\n  ${errorMessages}`,
      );
    }

    this.config = parseResult.data;
  }

  private applyEnvironmentVariables(rawConfig: unknown): unknown {
    const configObj =
      typeof rawConfig === 'object' && rawConfig !== null
        ? { ...rawConfig }
        : {};

    for (const [key, value] of Object.entries(process.env)) {
      if (value !== undefined && this.isValidConfigEnvVar(key)) {
        this.setNestedValue(configObj, key, value);
      }
    }

    return configObj;
  }

  private isValidConfigEnvVar(key: string): boolean {
    const knownTopLevelKeys = [
      'OPC',
      'MQTT',
      'EVENTBUFFER',
      'DATABASE',
      'OPCPROJECTION',
      'SECURITY',
      'MONITORING',
      'LOGGING',
    ];
    return knownTopLevelKeys.some(
      (knownKey) => key.startsWith(knownKey + '_') && key.includes('_'),
    );
  }

  private setNestedValue(
    obj: Record<string, unknown>,
    key: string,
    value: string,
  ): void {
    const parts = key.split('_');

    let current: Record<string, unknown> = obj;

    for (let i = 0; i < parts.length - 1; i++) {
      let part = parts[i];
      if (i === 0) {
        part = part.charAt(0).toLowerCase() + part.slice(1);
      } else {
        part = part.toLowerCase();
      }
      if (!(part in current)) {
        current[part] = {};
      }
      if (typeof current[part] !== 'object' || current[part] === null) {
        current[part] = {};
      }
      current = current[part] as Record<string, unknown>;
    }

    let lastPart = parts[parts.length - 1];
    if (!lastPart) {
      return;
    }
    lastPart = lastPart.toLowerCase();
    const parsedValue = this.parseEnvValue(value);
    current[lastPart] = parsedValue;
  }

  private parseEnvValue(value: string): unknown {
    if (value === 'true') {
      return true;
    }
    if (value === 'false') {
      return false;
    }
    if (value === 'null') {
      return null;
    }
    const numValue = Number(value);
    if (!Number.isNaN(numValue) && value.trim() !== '') {
      return numValue;
    }
    return value;
  }

  getConfig(): Config {
    return this.config;
  }
}
