import { PartialType } from '@nestjs/swagger';
import { CreateMessageSchemaDto } from './create-message-schema.dto';

export class UpdateMessageSchemaDto extends PartialType(CreateMessageSchemaDto) {}
