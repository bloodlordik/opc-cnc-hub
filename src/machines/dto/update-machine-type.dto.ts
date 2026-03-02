import { PartialType } from '@nestjs/swagger';
import { CreateMachineTypeDto } from './create-machine-type.dto';

export class UpdateMachineTypeDto extends PartialType(CreateMachineTypeDto) {}
