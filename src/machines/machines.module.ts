import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MachinesService } from './machines.service';
import { MachinesController } from './machines.controller';
import { Machine } from './entities/machine.entity';
import { MachineType } from './entities/machine-type.entity';
import { MessageSchema } from './entities/message-schema.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Machine, MachineType, MessageSchema]),
  ],
  controllers: [MachinesController],
  providers: [MachinesService],
})
export class MachinesModule {}
