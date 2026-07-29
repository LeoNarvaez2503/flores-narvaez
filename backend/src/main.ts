import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  const corsOrigins = config.get<string[]>('corsOrigins') ?? ['*'];
  app.enableCors({ origin: corsOrigins.includes('*') ? true : corsOrigins });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('CavaLocal API')
    .setDescription('Backend del marketplace de vinos CavaLocal')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  const port = config.get<number>('port') ?? 3001;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`CavaLocal backend en http://localhost:${port} — Swagger en /docs`);
}
bootstrap();
