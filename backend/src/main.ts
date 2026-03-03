import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: true,
    logger: ['error', 'warn', 'log'],
    bodyParser: true,
    bufferLogs: true,
    abortOnError: true,
  });
  app.setGlobalPrefix('api/v1');
  app.enableShutdownHooks();
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
