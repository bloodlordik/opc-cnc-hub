import {
  OPCUAServer,
  AddressSpace,
  UAObjectType,
  UAFolder,
} from 'node-opcua';

/**
 * Конфигурация OPC сервера из ConfigService
 */
export interface OpcServerConfig {
  port: number;
  endpoint: string;
  security: {
    policy: 'None' | 'Sign' | 'SignAndEncrypt';
    mode: 'None' | 'Sign' | 'SignAndEncrypt';
  };
  server: {
    applicationName: string;
    applicationUri: string;
    productName: string;
    productUri: string;
  };
  options?: {
    resourcePath?: string;
    alternateHostname?: string;
    maxConnections?: number;
    maxSessionCount?: number;
    maxSubscriptionsCount?: number;
    maxNodesPerRead?: number;
    maxNodesPerWrite?: number;
    maxNodesPerMethodCall?: number;
    maxNodesPerBrowse?: number;
    maxNodesPerRegisterNodes?: number;
    maxNodesPerHistoryRead?: number;
    maxNodesPerHistoryUpdate?: number;
    maxNodesPerTranslateBrowsePathsToNodeIds?: number;
  };
}

/**
 * Результат регистрации типа объекта
 */
export interface RegisteredObjectType {
  typeName: string;
  objectType: UAObjectType;
  folder: UAFolder;
}

/**
 * Опции для регистрации типа объекта
 */
export interface RegisterTypeOptions {
  typeName: string;
  folderName?: string;
  variables?: VariableDefinition[];
  methods?: MethodDefinition[];
}

/**
 * Определение переменной для OPC типа
 */
export interface VariableDefinition {
  name: string;
  dataType: 'Boolean' | 'Byte' | 'Double' | 'Float' | 'Int16' | 'Int32' | 'Int64' | 'String' | 'UInt16' | 'UInt32' | 'UInt64';
  initialValue?: unknown;
  accessibleLevel?: 'CurrentRead' | 'CurrentWrite' | 'CurrentReadOrWrite';
}

/**
 * Определение метода для OPC типа
 */
export interface MethodDefinition {
  name: string;
  inputArguments?: ArgumentDefinition[];
  outputArguments?: ArgumentDefinition[];
  handler: (input: Record<string, unknown>) => Promise<Record<string, unknown>>;
}

/**
 * Определение аргумента метода
 */
export interface ArgumentDefinition {
  name: string;
  dataType: 'Boolean' | 'Byte' | 'Double' | 'Float' | 'Int16' | 'Int32' | 'Int64' | 'String' | 'UInt16' | 'UInt32' | 'UInt64';
}

/**
 * Интерфейс сервиса OPC сервера
 */
export interface IOpcServerService {
  /**
   * Запуск OPC сервера
   */
  startServer(): Promise<void>;

  /**
   * Остановка OPC сервера
   */
  stopServer(): Promise<void>;

  /**
   * Регистрация типа объекта в OPC сервере
   */
  registerType(options: RegisterTypeOptions): Promise<RegisteredObjectType>;

  /**
   * Проверка состояния сервера
   */
  isRunning(): boolean;

  /**
   * Получение address space
   */
  getAddressSpace(): AddressSpace | null;
}
