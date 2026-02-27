import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('OPC CNC Hub API')
    .setDescription('API для управления станками и интеграции с OPC UA и MQTT')
    .setVersion('1.0')
    .addTag('machines', 'Операции со станками')
    .addTag('ingestion', 'Приём данных от OPC UA и MQTT')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);
}
