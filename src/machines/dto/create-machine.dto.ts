import { IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateMachineDto {
    @IsString()
    name: string;

    @IsNumber()
    alias: number;

    @IsString()
    @IsOptional()
    description?: string | null;

    @IsString()
    @IsOptional()
    mqttSource?: string | null;

    @IsInt()
    @IsOptional()
    messageSchemaId?: number;

    @IsInt()
    @IsOptional()
    machineTypeId?: number;
}
