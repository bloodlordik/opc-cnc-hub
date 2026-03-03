
import { Column, CreateDateColumn, DeleteDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn, VersionColumn } from 'typeorm';
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
    @Column('integer', { nullable: true })
    messageSchemaId: number | null;
    @Column('integer', { nullable: true })
    machineTypeId: number | null;
    @ManyToOne(() => MessageSchema, (messageSchema) => messageSchema.machines, { nullable: true })
    @JoinColumn({ name: 'messageSchemaId' })
    messageSchema: MessageSchema | null;
    @ManyToOne(() => MachineType, (machineType) => machineType.machines, { nullable: true })
    @JoinColumn({ name: 'machineTypeId' })
    machineType: MachineType | null;
}
