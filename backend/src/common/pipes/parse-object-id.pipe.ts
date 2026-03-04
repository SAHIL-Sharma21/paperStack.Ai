/**
 * Validates MongoDB ObjectId route params - throws BadRequestException on invalid input
 * @author: Sahil Sharma
 */

import {
  PipeTransform,
  Injectable,
  BadRequestException,
} from '@nestjs/common';
import { Types } from 'mongoose';

@Injectable()
export class ParseObjectIdPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!Types.ObjectId.isValid(value)) {
      throw new BadRequestException('Invalid MongoDb ObjectId');
    }
    // Stricter check: ObjectId must be 24 hex characters
    if (value.length !== 24 || !/^[a-fA-F0-9]+$/.test(value)) {
      throw new BadRequestException('Invalid MongoDb ObjectId');
    }
    return value;
  }
}
