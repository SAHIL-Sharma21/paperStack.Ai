/**
 * Kafka consumer bootstrap - runs the document processor (no HTTP server)
 * @author: Sahil Sharma
 */

import { NestFactory } from '@nestjs/core';
import { ConsumerModule } from './consumer.module';

async function bootstrap() {
  await NestFactory.createApplicationContext(ConsumerModule, {
    logger: ['error', 'warn', 'log'],
  });
  console.log(
    '[Consumer] Document processor is running. Press Ctrl+C to exit.',
  );
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
