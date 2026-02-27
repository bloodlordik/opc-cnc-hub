import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { IngestionModule } from './ingestion/ingestion.module';
import { MachinesModule } from './machines/machines.module';

@Module({
  imports: [ConfigModule, IngestionModule, MachinesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
