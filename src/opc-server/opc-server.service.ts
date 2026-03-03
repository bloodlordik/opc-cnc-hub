import { Injectable, Logger, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import {
  OPCUAServer,
  AddressSpace,
  UAObjectType,
  UAFolder,
  DataType,
  Variant,
  Namespace,
  resolveNodeId,
} from 'node-opcua';
import { ConfigService } from '../config/config.service';
import {
  OpcServerConfig,
  RegisteredObjectType,
  RegisterTypeOptions,
  VariableDefinition,
  MethodDefinition,
  IOpcServerService,
} from './opc-server.types';

@Injectable()
export class OpcServerService implements IOpcServerService {
  private readonly logger = new Logger(OpcServerService.name);
  private server: OPCUAServer | null = null;
  private addressSpace: AddressSpace | null = null;
  private namespace: Namespace | null = null;
  private isRunningFlag = false;
  private readonly config: OpcServerConfig;
  private serverReadyPromise: Promise<void> | null = null;

  constructor(private readonly configService: ConfigService) {
    this.config = this.configService.getConfig().opc;
  }

  /**
   * Запуск OPC сервера
   */
  async startServer(): Promise<void> {
    if (this.isRunningFlag) {
      this.logger.warn('OPC сервер уже запущен');
      return;
    }

    // Сохраняем промис запуска для ожидания в других методах
    if (!this.serverReadyPromise) {
      this.serverReadyPromise = this.startServerInternal();
    }
    
    await this.serverReadyPromise;
  }

  private async startServerInternal(): Promise<void> {
    if (this.isRunningFlag) {
      return;
    }

    try {
      this.logger.log('Запуск OPC сервера...');

      const serverOptions = {
        port: this.config.port,
        resourcePath: this.config.options?.resourcePath || '/opc/cnc-hub',
        // Настройки безопасности будут настроены после инициализации
        buildInfo: {
          productName: this.config.server.productName,
          buildNumber: '1',
          buildDate: new Date(),
        },
      };

      this.server = new OPCUAServer(serverOptions);

      await this.server.initialize();

      this.addressSpace = this.server.engine.addressSpace;

      if (!this.addressSpace) {
        throw new InternalServerErrorException('Не удалось получить AddressSpace');
      }

      // Получаем namespace для работы
      this.namespace = this.addressSpace.getOwnNamespace();

      await this.server.start();

      this.isRunningFlag = true;

      const endpointUrl = this.server.getEndpointUrl();
      this.logger.log(`OPC сервер запущен на ${endpointUrl}`);
      this.logger.log(`Port: ${this.config.port}`);
      this.logger.log(`Security Policy: ${this.config.security.policy}`);
      this.logger.log(`Security Mode: ${this.config.security.mode}`);
    } catch (error) {
      this.logger.error('Ошибка при запуске OPC сервера', error);
      throw new InternalServerErrorException(
        `Не удалось запустить OPC сервер: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Остановка OPC сервера
   */
  async stopServer(): Promise<void> {
    if (!this.isRunningFlag || !this.server) {
      this.logger.warn('OPC сервер не запущен');
      return;
    }

    try {
      this.logger.log('Остановка OPC сервера...');

      await this.server.shutdown();

      this.server = null;
      this.addressSpace = null;
      this.namespace = null;
      this.isRunningFlag = false;

      this.logger.log('OPC сервер остановлен');
    } catch (error) {
      this.logger.error('Ошибка при остановке OPC сервера', error);
      throw new InternalServerErrorException(
        `Не удалось остановить OPC сервер: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Регистрация типа объекта в OPC сервере
   */
  async registerType(options: RegisterTypeOptions): Promise<RegisteredObjectType> {
    // Ждем запуска сервера, если он еще не запущен
    if (this.serverReadyPromise && !this.isRunningFlag) {
      this.logger.log('Ожидание запуска OPC сервера перед регистрацией типа...');
      await this.serverReadyPromise;
    }

    if (!this.addressSpace || !this.namespace) {
      throw new BadRequestException('OPC сервер не запущен. Сначала вызовите startServer()');
    }

    try {
      const { typeName, folderName = 'Objects', variables = [], methods = [] } = options;

      // Получаем корневую папку объектов
      const rootFolder = this.addressSpace.rootFolder.objects;

      // Создаем или получаем папку для типа
      let folder: UAFolder;
      const existingFolder = rootFolder.getComponentByName(folderName);
      
      if (existingFolder) {
        folder = existingFolder as UAFolder;
      } else {
        folder = this.namespace.addFolder(rootFolder, {
          browseName: folderName,
        }) as UAFolder;
      }

      // Создаем тип объекта
      const objectType = this.namespace.addObjectType({
        browseName: typeName,
        organizedBy: folder,
      });

      // Регистрируем переменные
      for (const variable of variables) {
        this.createVariable(objectType, variable);
      }

      // Регистрируем методы
      for (const method of methods) {
        await this.createMethod(objectType, method);
      }

      this.logger.log(`Зарегистрирован тип объекта: ${typeName} в папке ${folderName}`);

      return {
        typeName,
        objectType,
        folder,
      };
    } catch (error) {
      this.logger.error(`Ошибка при регистрации типа ${options.typeName}`, error);
      throw new InternalServerErrorException(
        `Не удалось зарегистрировать тип объекта: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Проверка состояния сервера
   */
  isRunning(): boolean {
    return this.isRunningFlag;
  }

  /**
   * Получение address space
   */
  getAddressSpace(): AddressSpace | null {
    return this.addressSpace;
  }

  /**
   * Создание переменной в типе объекта
   */
  private createVariable(objectType: UAObjectType, variable: VariableDefinition): void {
    if (!this.namespace) {
      throw new InternalServerErrorException('Namespace не доступен');
    }

    const dataType = this.mapDataType(variable.dataType);
    const initialValue = variable.initialValue ?? this.getDefaultValue(dataType);

    this.namespace.addVariable({
      componentOf: objectType,
      browseName: variable.name,
      dataType,
      value: new Variant({
        dataType,
        value: initialValue,
      }),
    });
  }

  /**
   * Создание метода в типе объекта
   */
  private async createMethod(objectType: UAObjectType, method: MethodDefinition): Promise<void> {
    if (!this.namespace) {
      throw new InternalServerErrorException('Namespace не доступен');
    }

    const inputArguments: any[] = [];
    const outputArguments: any[] = [];

    // Создаем входные аргументы
    if (method.inputArguments) {
      for (const arg of method.inputArguments) {
        inputArguments.push({
          dataType: resolveNodeId(arg.dataType),
          name: arg.name,
          valueRank: -1,
          arrayDimensions: [],
          description: { text: `Input argument: ${arg.name}`, locale: 'en-US' },
        });
      }
    }

    // Создаем выходные аргументы
    if (method.outputArguments) {
      for (const arg of method.outputArguments) {
        outputArguments.push({
          dataType: resolveNodeId(arg.dataType),
          name: arg.name,
          valueRank: -1,
          arrayDimensions: [],
          description: { text: `Output argument: ${arg.name}`, locale: 'en-US' },
        });
      }
    }

    const methodNode = this.namespace.addMethod(objectType, {
      browseName: method.name,
      inputArguments,
      outputArguments,
      executable: true,
      userExecutable: true,
    });

    // Регистрируем обработчик метода
    methodNode.bindMethod(async (inputArguments, context) => {
      try {
        const input: Record<string, unknown> = {};
        for (let i = 0; i < inputArguments.length; i++) {
          const argDef = method.inputArguments?.[i];
          if (argDef) {
            input[argDef.name] = inputArguments[i].value;
          }
        }

        const result = await method.handler(input);

        const output: { statusCode: number; value: unknown }[] = [];
        for (const argDef of method.outputArguments || []) {
          output.push({
            statusCode: 0, // Good
            value: result[argDef.name],
          });
        }

        return {
          statusCode: 0, // Good
          outputArguments: output,
        };
      } catch (error) {
        this.logger.error(`Ошибка в методе ${method.name}`, error);
        return {
          statusCode: 0x80000000, // Bad
          outputArguments: [],
        };
      }
    });
  }

  /**
   * Маппинг типа данных из строки в DataType
   */
  private mapDataType(dataType: string): DataType {
    return DataType[dataType as keyof typeof DataType] || DataType.String;
  }

  /**
   * Получение значения по умолчанию для типа данных
   */
  private getDefaultValue(dataType: DataType): unknown {
    switch (dataType) {
      case DataType.Boolean:
        return false;
      case DataType.Byte:
      case DataType.UInt16:
      case DataType.UInt32:
      case DataType.UInt64:
      case DataType.Int16:
      case DataType.Int32:
      case DataType.Int64:
      case DataType.Float:
      case DataType.Double:
        return 0;
      case DataType.String:
        return '';
      default:
        return null;
    }
  }
}
