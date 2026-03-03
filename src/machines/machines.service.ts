import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Machine } from './entities/machine.entity';
import { MessageSchema } from './entities/message-schema.entity';
import { MachineType } from './entities/machine-type.entity';
import { CreateMachineDto } from './dto/create-machine.dto';
import { UpdateMachineDto } from './dto/update-machine.dto';
import { CreateMessageSchemaDto } from './dto/create-message-schema.dto';
import { UpdateMessageSchemaDto } from './dto/update-message-schema.dto';
import { CreateMachineTypeDto } from './dto/create-machine-type.dto';
import { UpdateMachineTypeDto } from './dto/update-machine-type.dto';

@Injectable()
export class MachinesService {
    constructor(
        @InjectRepository(Machine)
        private readonly machineRepository: Repository<Machine>,
        @InjectRepository(MessageSchema)
        private readonly messageSchemaRepository: Repository<MessageSchema>,
        @InjectRepository(MachineType)
        private readonly machineTypeRepository: Repository<MachineType>,
    ) {}

    // ==================== Machine CRUD ====================

    async createMachine(createMachineDto: CreateMachineDto) {
        const machine = this.machineRepository.create({
            name: createMachineDto.name,
            alias: createMachineDto.alias,
            description: createMachineDto.description,
            mqttSource: createMachineDto.mqttSource,
            messageSchemaId: createMachineDto.messageSchemaId ?? null,
            machineTypeId: createMachineDto.machineTypeId ?? null,
        });
        return this.machineRepository.save(machine);
    }

    findAllMachines() {
        return this.machineRepository.find({
            relations: ['messageSchema', 'machineType'],
            withDeleted: true,
        });
    }

    findOneMachine(id: number) {
        return this.machineRepository.findOne({
            where: { id },
            relations: ['messageSchema', 'machineType'],
            withDeleted: true,
        });
    }

    async updateMachine(id: number, updateMachineDto: UpdateMachineDto) {
        const machine = await this.machineRepository.findOne({ where: { id } });
        if (!machine) {
            throw new NotFoundException(`Machine with ID ${id} not found`);
        }

        // Обновляем поля
        Object.assign(machine, {
            name: updateMachineDto.name ?? machine.name,
            alias: updateMachineDto.alias ?? machine.alias,
            description: updateMachineDto.description ?? machine.description,
            mqttSource: updateMachineDto.mqttSource ?? machine.mqttSource,
            messageSchemaId: updateMachineDto.messageSchemaId !== undefined
                ? updateMachineDto.messageSchemaId
                : machine.messageSchemaId,
            machineTypeId: updateMachineDto.machineTypeId !== undefined
                ? updateMachineDto.machineTypeId
                : machine.machineTypeId,
        });

        return this.machineRepository.save(machine);
    }

    async removeMachine(id: number) {
        const machine = await this.machineRepository.findOne({ where: { id } });
        if (!machine) {
            throw new NotFoundException(`Machine with ID ${id} not found`);
        }
        return this.machineRepository.softRemove(machine);
    }

    async restoreMachine(id: number) {
        return this.machineRepository.recover({ id } as Machine);
    }

    // ==================== MessageSchema CRUD ====================

    createMessageSchema(createMessageSchemaDto: CreateMessageSchemaDto) {
        const messageSchema = this.messageSchemaRepository.create(createMessageSchemaDto);
        return this.messageSchemaRepository.save(messageSchema);
    }

    findAllMessageSchemas() {
        return this.messageSchemaRepository.find({
            relations: ['machines'],
            withDeleted: true,
        });
    }

    findOneMessageSchema(id: number) {
        return this.messageSchemaRepository.findOne({
            where: { id },
            relations: ['machines'],
            withDeleted: true,
        });
    }

    async updateMessageSchema(id: number, updateMessageSchemaDto: UpdateMessageSchemaDto) {
        const messageSchema = await this.messageSchemaRepository.findOne({ where: { id } });
        if (!messageSchema) {
            throw new NotFoundException(`MessageSchema with ID ${id} not found`);
        }
        Object.assign(messageSchema, updateMessageSchemaDto);
        return this.messageSchemaRepository.save(messageSchema);
    }

    async removeMessageSchema(id: number) {
        const messageSchema = await this.messageSchemaRepository.findOne({ where: { id } });
        if (!messageSchema) {
            throw new NotFoundException(`MessageSchema with ID ${id} not found`);
        }
        return this.messageSchemaRepository.softRemove(messageSchema);
    }

    async restoreMessageSchema(id: number) {
        return this.messageSchemaRepository.recover({ id } as MessageSchema);
    }

    // ==================== MachineType CRUD ====================

    createMachineType(createMachineTypeDto: CreateMachineTypeDto) {
        const machineType = this.machineTypeRepository.create(createMachineTypeDto);
        return this.machineTypeRepository.save(machineType);
    }

    async findAllMachineTypes(): Promise<MachineType[]> {
        return this.machineTypeRepository.find({
            relations: ['machines'],
            withDeleted: true,
        });
        
    }

    findOneMachineType(id: number) {
        return this.machineTypeRepository.findOne({
            where: { id },
            relations: ['machines'],
            withDeleted: true,
        });
    }

    async updateMachineType(id: number, updateMachineTypeDto: UpdateMachineTypeDto) {
        const machineType = await this.machineTypeRepository.findOne({ where: { id } });
        if (!machineType) {
            throw new NotFoundException(`MachineType with ID ${id} not found`);
        }
        Object.assign(machineType, updateMachineTypeDto);
        return this.machineTypeRepository.save(machineType);
    }

    async removeMachineType(id: number) {
        const machineType = await this.machineTypeRepository.findOne({ where: { id } });
        if (!machineType) {
            throw new NotFoundException(`MachineType with ID ${id} not found`);
        }
        return this.machineTypeRepository.softRemove(machineType);
    }

    async restoreMachineType(id: number) {
        return this.machineTypeRepository.recover({ id } as MachineType);
    }
}
