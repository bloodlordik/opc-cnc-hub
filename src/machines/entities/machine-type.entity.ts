import { Column, CreateDateColumn, DeleteDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn, VersionColumn } from 'typeorm';
import { Machine } from './machine.entity';

@Entity('machine_type')
export class MachineType {
    @PrimaryGeneratedColumn()
    id: number;
    @Column('text')
    name: string;
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
    @OneToMany(() => Machine, (machine) => machine.machineType)
    machines: Machine[];
}