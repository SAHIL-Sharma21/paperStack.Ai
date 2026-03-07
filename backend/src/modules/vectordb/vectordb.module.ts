import { Module } from '@nestjs/common';
import { VectordbService } from './vectordb.service';

@Module({
  providers: [VectordbService],
  exports: [VectordbService],
})
export class VectordbModule {}
