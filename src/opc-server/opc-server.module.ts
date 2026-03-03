import { Global, Module, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigModule } from '../config/config.module';
import { OpcServerService } from './opc-server.service';
import { CncDeviceService } from './cnc-device.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [OpcServerService, CncDeviceService],
  exports: [OpcServerService],
})
export class OpcServerModule implements OnModuleInit, OnModuleDestroy {
  constructor(private readonly opcServerService: OpcServerService) {}

  async onModuleInit(): Promise<void> {
    // Автоматический запуск сервера при инициализации модуля
    await this.opcServerService.startServer();
  }

  async onModuleDestroy(): Promise<void> {
    // Автоматическая остановка сервера при уничтожении модуля
    await this.opcServerService.stopServer();
  }
}
