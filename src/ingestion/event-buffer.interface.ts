import {
  CanonicalEvent,
  IEventBufferService as IEventBufferServiceInterface,
} from './ingestion.types';

export interface IEventBufferService extends IEventBufferServiceInterface {
  push(event: CanonicalEvent): Promise<boolean>;
}
