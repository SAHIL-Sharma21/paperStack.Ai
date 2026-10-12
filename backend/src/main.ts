import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import { AppModule } from './main/app.module';
import { ValidationPipe } from '@nestjs/common';

/** CORS_ORIGINS: comma-separated allowed origins. Unset = reflect any origin (local dev). */
function parseCorsOrigins(raw: string | undefined): string[] | true {
  const origins = (raw ?? '')
    .split(',')
    .map((s) => s.trim().replace(/\/$/, ''))
    .filter(Boolean);
  return origins.length > 0 ? origins : true;
}

/** TRUST_PROXY: "true", a hop count, or any Express trust proxy value. Defaults to 1 hop in production. */
function parseTrustProxy(
  raw: string | undefined,
  isProduction: boolean,
): boolean | number | string | undefined {
  const value = raw?.trim();
  if (!value) return isProduction ? 1 : undefined;
  if (value === 'true') return true;
  if (value === 'false') return false;
  const hops = Number.parseInt(value, 10);
  return Number.isFinite(hops) && String(hops) === value ? hops : value;
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'log'],
    bodyParser: true,
    bufferLogs: true,
    abortOnError: true,
  });
  const config = app.get(ConfigService);

  const trustProxy = parseTrustProxy(
    config.get<string>('TRUST_PROXY'),
    config.get<string>('NODE_ENV') === 'production',
  );
  if (trustProxy !== undefined) {
    app.set('trust proxy', trustProxy);
  }

  app.enableCors({
    origin: parseCorsOrigins(config.get<string>('CORS_ORIGINS')),
    credentials: true,
  });
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.setGlobalPrefix('api/v1');
  app.enableShutdownHooks();
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
