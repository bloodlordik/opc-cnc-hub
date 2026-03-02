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
import { CreateMachineDto } from './dto/create-machine.dto';
import { UpdateMachineDto } from './dto/update-machine.dto';

@ApiTags('Machines')
@ApiBearerAuth()
@Controller('machines')
export class MachinesController {
    constructor(private readonly machinesService: MachinesService) {}

    @Post()
    @ApiOperation({ summary: 'Создать новую машину' })
    @ApiBody({ type: CreateMachineDto })
    @ApiResponse({ status: HttpStatus.CREATED, description: 'Машина успешно создана' })
    @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Некорректные данные запроса' })
    createMachine(@Body() createMachineDto: CreateMachineDto) {
        return this.machinesService.createMachine(createMachineDto);
    }

    @Get()
    @ApiOperation({ summary: 'Получить список всех машин' })
    @ApiResponse({ status: HttpStatus.OK, description: 'Список машин возвращён успешно' })
    findAllMachines() {
        return this.machinesService.findAllMachines();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Получить машину по ID' })
    @ApiParam({ name: 'id', type: Number, description: 'ID машины' })
    @ApiResponse({ status: HttpStatus.OK, description: 'Машина найдена' })
    @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Машина не найдена' })
    findOneMachine(@Param('id', ParseIntPipe) id: number) {
        return this.machinesService.findOneMachine(id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Обновить машину' })
    @ApiParam({ name: 'id', type: Number, description: 'ID машины' })
    @ApiBody({ type: UpdateMachineDto })
    @ApiResponse({ status: HttpStatus.OK, description: 'Машина успешно обновлена' })
    @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Машина не найдена' })
    updateMachine(@Param('id', ParseIntPipe) id: number, @Body() updateMachineDto: UpdateMachineDto) {
        return this.machinesService.updateMachine(id, updateMachineDto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Удалить машину (мягкое удаление)' })
    @ApiParam({ name: 'id', type: Number, description: 'ID машины' })
    @ApiResponse({ status: HttpStatus.OK, description: 'Машина успешно удалена' })
    @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Машина не найдена' })
    removeMachine(@Param('id', ParseIntPipe) id: number) {
        return this.machinesService.removeMachine(id);
    }

    @Post(':id/restore')
    @ApiOperation({ summary: 'Восстановить удалённую машину' })
    @ApiParam({ name: 'id', type: Number, description: 'ID машины' })
    @ApiResponse({ status: HttpStatus.OK, description: 'Машина успешно восстановлена' })
    @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Машина не найдена' })
    restoreMachine(@Param('id', ParseIntPipe) id: number) {
        return this.machinesService.restoreMachine(id);
    }
}
