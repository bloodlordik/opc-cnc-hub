import { Module } from '@nestjs/common';
import { ApiIngestorService } from './api-ingestor.service';
import { IngestionController } from './ingestion.controller';
import { IngestionSchemaRegistry } from './schema-registry.service';

@Module({
  controllers: [IngestionController],
  providers: [ApiIngestorService, IngestionSchemaRegistry],
  exports: [ApiIngestorService, IngestionSchemaRegistry],
})
export class IngestionModule {}
