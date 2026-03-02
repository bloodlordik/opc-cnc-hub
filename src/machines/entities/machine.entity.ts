
import { Column, CreateDateColumn, DeleteDateColumn, Entity, ManyToOne, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn, VersionColumn } from 'typeorm';
import { MessageSchema } from './message-schema.entity';
import { MachineType } from './machine-type.entity';

@Entity('machine')
export class Machine {
    @PrimaryGeneratedColumn()
    id: number;
    @Column('text')
    name: string;
    @Column('integer')
    alias: number;
    @Column('text', {nullable: true})
    description: string | null;
    @UpdateDateColumn()
    updatedAt: Date;
    @CreateDateColumn()
    createdAt: Date;
    @DeleteDateColumn()
    deletedAt: Date | null;
    @VersionColumn()
    version: number;
    @Column('text')
    mqttSource: string | null;
    @ManyToOne(() => MessageSchema, (messageSchema) => messageSchema.machines)
    messageSchema: MessageSchema;
    @ManyToOne(() => MachineType, (machineType) => machineType.machines)
    machineType: MachineType;
}
