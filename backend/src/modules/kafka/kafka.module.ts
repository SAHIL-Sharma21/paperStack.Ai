/**
 * Kafka Module - message publishing
 * @author: Sahil Sharma
 */

import { Module, Global } from '@nestjs/common';
import { KafkaService } from './kafka.service';

@Global()
@Module({
  providers: [KafkaService],
  exports: [KafkaService],
})
export class KafkaModule {}
