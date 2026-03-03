import { Injectable, Logger } from '@nestjs/common';
import { OpcServerService } from '../opc-server/opc-server.service';

/**
 * Пример использования OPC сервера с регистрацией типа объекта для станка
 */
@Injectable()
export class CncDeviceService {
  private readonly logger = new Logger(CncDeviceService.name);

  constructor(private readonly opcServerService: OpcServerService) {
    // Регистрируем тип объекта после инициализации сервиса
    this.init();
  }

  /**
   * Инициализация с ожиданием запуска сервера
   */
  private async init(): Promise<void> {
    try {
      this.logger.log('Инициализация CncDeviceService...');
      // Ждем запуска сервера и регистрируем тип
      await this.registerCncDeviceType();
    } catch (error) {
      this.logger.error('Ошибка при инициализации CncDeviceService', error);
    }
  }

  /**
   * Регистрация типа объекта CNC станка
   */
  private async registerCncDeviceType(): Promise<void> {
    try {
      await this.opcServerService.registerType({
        typeName: 'CncDeviceType',
        folderName: 'CncDevices',
        variables: [
          {
            name: 'DeviceId',
            dataType: 'String',
            initialValue: '',
            accessibleLevel: 'CurrentRead',
          },
          {
            name: 'DeviceName',
            dataType: 'String',
            initialValue: '',
            accessibleLevel: 'CurrentRead',
          },
          {
            name: 'IsConnected',
            dataType: 'Boolean',
            initialValue: false,
            accessibleLevel: 'CurrentRead',
          },
          {
            name: 'Status',
            dataType: 'String',
            initialValue: 'Unknown',
            accessibleLevel: 'CurrentRead',
          },
          {
            name: 'CurrentProgram',
            dataType: 'String',
            initialValue: '',
            accessibleLevel: 'CurrentReadOrWrite',
          },
          {
            name: 'SpindleSpeed',
            dataType: 'Double',
            initialValue: 0,
            accessibleLevel: 'CurrentReadOrWrite',
          },
          {
            name: 'FeedRate',
            dataType: 'Double',
            initialValue: 0,
            accessibleLevel: 'CurrentReadOrWrite',
          },
          {
            name: 'ToolNumber',
            dataType: 'UInt32',
            initialValue: 0,
            accessibleLevel: 'CurrentRead',
          },
          {
            name: 'PositionX',
            dataType: 'Double',
            initialValue: 0,
            accessibleLevel: 'CurrentRead',
          },
          {
            name: 'PositionY',
            dataType: 'Double',
            initialValue: 0,
            accessibleLevel: 'CurrentRead',
          },
          {
            name: 'PositionZ',
            dataType: 'Double',
            initialValue: 0,
            accessibleLevel: 'CurrentRead',
          },
          {
            name: 'Temperature',
            dataType: 'Double',
            initialValue: 0,
            accessibleLevel: 'CurrentRead',
          },
          {
            name: 'Error',
            dataType: 'String',
            initialValue: '',
            accessibleLevel: 'CurrentRead',
          },
        ],
        methods: [
          {
            name: 'StartProgram',
            inputArguments: [
              {
                name: 'programName',
                dataType: 'String',
              },
            ],
            outputArguments: [
              {
                name: 'success',
                dataType: 'Boolean',
              },
              {
                name: 'message',
                dataType: 'String',
              },
            ],
            handler: async (input) => {
              const programName = input['programName'] as string;
              this.logger.log(`Запуск программы: ${programName}`);
              
              // Здесь должна быть логика запуска программы
              return {
                success: true,
                message: `Программа ${programName} запущена`,
              };
            },
          },
          {
            name: 'StopProgram',
            inputArguments: [],
            outputArguments: [
              {
                name: 'success',
                dataType: 'Boolean',
              },
              {
                name: 'message',
                dataType: 'String',
              },
            ],
            handler: async () => {
              this.logger.log('Остановка программы');
              
              // Здесь должна быть логика остановки
              return {
                success: true,
                message: 'Программа остановлена',
              };
            },
          },
          {
            name: 'Reset',
            inputArguments: [],
            outputArguments: [
              {
                name: 'success',
                dataType: 'Boolean',
              },
            ],
            handler: async () => {
              this.logger.log('Сброс станка');
              
              // Здесь должна быть логика сброса
              return {
                success: true,
              };
            },
          },
          {
            name: 'SetSpindleSpeed',
            inputArguments: [
              {
                name: 'speed',
                dataType: 'Double',
              },
            ],
            outputArguments: [
              {
                name: 'success',
                dataType: 'Boolean',
              },
            ],
            handler: async (input) => {
              const speed = input['speed'] as number;
              this.logger.log(`Установка скорости шпинделя: ${speed}`);
              
              // Здесь должна быть логика установки скорости
              return {
                success: true,
              };
            },
          },
        ],
      });

      this.logger.log('Тип объекта CncDeviceType успешно зарегистрирован');
    } catch (error) {
      this.logger.error('Ошибка при регистрации типа CncDeviceType', error);
    }
  }
}
