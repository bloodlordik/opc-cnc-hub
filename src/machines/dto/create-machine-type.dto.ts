import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateMachineTypeDto {
    @IsString()
    name: string;

    @IsString()
    @IsOptional()
    description?: string | null;
}
