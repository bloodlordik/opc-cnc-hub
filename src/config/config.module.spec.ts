import { ConfigModule } from './config.module';
import { ConfigService } from './config.service';

describe('ConfigModule', () => {
  it('should be defined', () => {
    expect(ConfigModule).toBeDefined();
  });

  it('should export ConfigService', () => {
    const providers = Reflect.getMetadata(
      'providers',
      ConfigModule,
    ) as unknown[];
    const exports = Reflect.getMetadata('exports', ConfigModule) as unknown[];

    expect(providers).toContain(ConfigService);
    expect(exports).toContain(ConfigService);
  });
});
