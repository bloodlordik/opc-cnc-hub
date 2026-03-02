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
import { CreateMachineTypeDto } from './dto/create-machine-type.dto';
import { UpdateMachineTypeDto } from './dto/update-machine-type.dto';

@ApiTags('Machine Types')
@ApiBearerAuth()
@Controller('machine-types')
export class MachineTypesController {
    constructor(private readonly machinesService: MachinesService) {}

    @Post()
    @ApiOperation({ summary: 'Создать новый тип машины' })
    @ApiBody({ type: CreateMachineTypeDto })
    @ApiResponse({ status: HttpStatus.CREATED, description: 'Тип машины успешно создан' })
    @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Некорректные данные запроса' })
    createMachineType(@Body() createMachineTypeDto: CreateMachineTypeDto) {
        return this.machinesService.createMachineType(createMachineTypeDto);
    }

    @Get()
    @ApiOperation({ summary: 'Получить список всех типов машин' })
    @ApiResponse({ status: HttpStatus.OK, description: 'Список типов машин возвращён успешно' })
    findAllMachineTypes() {
        return this.machinesService.findAllMachineTypes();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Получить тип машины по ID' })
    @ApiParam({ name: 'id', type: Number, description: 'ID типа машины' })
    @ApiResponse({ status: HttpStatus.OK, description: 'Тип машины найден' })
    @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Тип машины не найден' })
    findOneMachineType(@Param('id', ParseIntPipe) id: number) {
        return this.machinesService.findOneMachineType(id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Обновить тип машины' })
    @ApiParam({ name: 'id', type: Number, description: 'ID типа машины' })
    @ApiBody({ type: UpdateMachineTypeDto })
    @ApiResponse({ status: HttpStatus.OK, description: 'Тип машины успешно обновлён' })
    @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Тип машины не найден' })
    updateMachineType(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateMachineTypeDto: UpdateMachineTypeDto,
    ) {
        return this.machinesService.updateMachineType(id, updateMachineTypeDto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Удалить тип машины (мягкое удаление)' })
    @ApiParam({ name: 'id', type: Number, description: 'ID типа машины' })
    @ApiResponse({ status: HttpStatus.OK, description: 'Тип машины успешно удалён' })
    @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Тип машины не найден' })
    removeMachineType(@Param('id', ParseIntPipe) id: number) {
        return this.machinesService.removeMachineType(id);
    }

    @Post(':id/restore')
    @ApiOperation({ summary: 'Восстановить удалённый тип машины' })
    @ApiParam({ name: 'id', type: Number, description: 'ID типа машины' })
    @ApiResponse({ status: HttpStatus.OK, description: 'Тип машины успешно восстановлен' })
    @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Тип машины не найден' })
    restoreMachineType(@Param('id', ParseIntPipe) id: number) {
        return this.machinesService.restoreMachineType(id);
    }
}
