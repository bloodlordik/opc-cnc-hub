import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateMessageSchemaDto {
    @IsString()
    name: string;

    @IsString()
    @IsOptional()
    description?: string | null;
}
