import { NestFactory } from '@nestjs/core';
import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { DevConsoleService } from './common/logger/dev-console.service';
import { LoggerService } from './common/logger/logger.service';
import { JobUpdatesService } from './modules/contract-analyzer/job-updates.service';

const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:4000',
  'http://127.0.0.1:4000',
];

function parseListEnv(value?: string): string[] {
  return value
    ?.split(',')
    .map((entry) => entry.trim())
    .filter(Boolean) ?? [];
}

function getAllowedOrigins(): string[] {
  const configured = parseListEnv(process.env.ALLOWED_ORIGINS);
  return configured.length ? configured : DEFAULT_ALLOWED_ORIGINS;
}

function getAllowedOriginPatterns(logger: LoggerService): RegExp[] {
  return parseListEnv(process.env.ALLOWED_ORIGIN_REGEXES)
    .map((pattern) => {
      try {
        return new RegExp(pattern, 'i');
      } catch (error) {
        logger.logWithContext('Bootstrap', 'Ignoring invalid CORS regex pattern', 'warn', {
          pattern,
          error: (error as Error).message,
          type: 'cors',
        });
        return null;
      }
    })
    .filter((pattern): pattern is RegExp => pattern !== null);
}

function isAllowedOrigin(origin: string, allowedOrigins: string[], allowedOriginPatterns: RegExp[]): boolean {
  if (allowedOrigins.includes(origin)) {
    return true;
  }

  return allowedOriginPatterns.some((pattern) => pattern.test(origin));
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));
  const logger = app.get(LoggerService);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.setGlobalPrefix('api/v1', {
    exclude: [
      { path: '', method: RequestMethod.GET },
      { path: 'health', method: RequestMethod.GET },
    ],
  });

  const allowedOrigins = getAllowedOrigins();
  const allowedOriginPatterns = getAllowedOriginPatterns(logger);

  logger.logWithContext('Bootstrap', 'Resolved CORS configuration', 'info', {
    allowedOrigins,
    allowedOriginPatterns: allowedOriginPatterns.map((pattern) => pattern.source),
    type: 'cors',
  });

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      const allowed = isAllowedOrigin(origin, allowedOrigins, allowedOriginPatterns);
      if (!allowed) {
        logger.logWithContext('Bootstrap', 'Blocked CORS origin', 'warn', {
          origin,
          allowedOrigins,
          allowedOriginPatterns: allowedOriginPatterns.map((pattern) => pattern.source),
          type: 'cors',
        });
      }

      callback(null, allowed);
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    optionsSuccessStatus: 204,
  });

  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('AI Web3 Security Platform API')
      .setDescription('API documentation for AI-powered Web3 security platform')
      .setVersion('1.0')
      .addTag('security')
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  app.get(JobUpdatesService).attachServer(app.getHttpServer());
  app.get(DevConsoleService).attachServer(app.getHttpServer());

  const port = process.env.PORT || 3000;
  await app.listen(port);

  logger.logWithContext('Bootstrap', 'Application started', 'info', {
    port,
    nodeEnv: process.env.NODE_ENV || 'development',
    type: 'bootstrap',
  });
}

bootstrap();
