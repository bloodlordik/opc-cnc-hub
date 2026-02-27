import { Column, CreateDateColumn, DeleteDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn, VersionColumn } from 'typeorm';
import { Machine } from './machine.entity';

@Entity('message_schema')
export class MessageSchema {
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
    @OneToMany(() => Machine, (machine) => machine.messageSchema)
    machines: Machine[];
}