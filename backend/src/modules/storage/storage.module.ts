/**
 * Storage Module - file storage abstraction
 * @author: Sahil Sharma
 */

import { Module } from '@nestjs/common';
import { StorageService } from './storage.service';

@Module({
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
