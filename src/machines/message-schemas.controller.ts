import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    ParseIntPipe,
    HttpStatus,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiParam,
    ApiBody,
    ApiResponse,
    ApiBearerAuth,
} from '@nestjs/swagger';
import { MachinesService } from './machines.service';
import { CreateMessageSchemaDto } from './dto/create-message-schema.dto';
import { UpdateMessageSchemaDto } from './dto/update-message-schema.dto';

@ApiTags('Message Schemas')
@ApiBearerAuth()
@Controller('message-schemas')
export class MessageSchemasController {
    constructor(private readonly machinesService: MachinesService) {}

    @Post()
    @ApiOperation({ summary: 'Создать новую схему сообщений' })
    @ApiBody({ type: CreateMessageSchemaDto })
    @ApiResponse({ status: HttpStatus.CREATED, description: 'Схема сообщений успешно создана' })
    @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Некорректные данные запроса' })
    createMessageSchema(@Body() createMessageSchemaDto: CreateMessageSchemaDto) {
        return this.machinesService.createMessageSchema(createMessageSchemaDto);
    }

    @Get()
    @ApiOperation({ summary: 'Получить список всех схем сообщений' })
    @ApiResponse({ status: HttpStatus.OK, description: 'Список схем сообщений возвращён успешно' })
    findAllMessageSchemas() {
        return this.machinesService.findAllMessageSchemas();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Получить схему сообщений по ID' })
    @ApiParam({ name: 'id', type: Number, description: 'ID схемы сообщений' })
    @ApiResponse({ status: HttpStatus.OK, description: 'Схема сообщений найдена' })
    @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Схема сообщений не найдена' })
    findOneMessageSchema(@Param('id', ParseIntPipe) id: number) {
        return this.machinesService.findOneMessageSchema(id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Обновить схему сообщений' })
    @ApiParam({ name: 'id', type: Number, description: 'ID схемы сообщений' })
    @ApiBody({ type: UpdateMessageSchemaDto })
    @ApiResponse({ status: HttpStatus.OK, description: 'Схема сообщений успешно обновлена' })
    @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Схема сообщений не найдена' })
    updateMessageSchema(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateMessageSchemaDto: UpdateMessageSchemaDto,
    ) {
        return this.machinesService.updateMessageSchema(id, updateMessageSchemaDto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Удалить схему сообщений (мягкое удаление)' })
    @ApiParam({ name: 'id', type: Number, description: 'ID схемы сообщений' })
    @ApiResponse({ status: HttpStatus.OK, description: 'Схема сообщений успешно удалена' })
    @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Схема сообщений не найдена' })
    removeMessageSchema(@Param('id', ParseIntPipe) id: number) {
        return this.machinesService.removeMessageSchema(id);
    }

    @Post(':id/restore')
    @ApiOperation({ summary: 'Восстановить удалённую схему сообщений' })
    @ApiParam({ name: 'id', type: Number, description: 'ID схемы сообщений' })
    @ApiResponse({ status: HttpStatus.OK, description: 'Схема сообщений успешно восстановлена' })
    @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Схема сообщений не найдена' })
    restoreMessageSchema(@Param('id', ParseIntPipe) id: number) {
        return this.machinesService.restoreMessageSchema(id);
    }
}
