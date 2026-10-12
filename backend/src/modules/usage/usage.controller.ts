/**
 * Usage Controller - current user's free-plan usage
 * @author: Sahil Sharma
 */

import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { UserDocument } from '../users/user.schema';
import { UsageService } from './usage.service';
import type { UsageResponseDto } from './dto/usage-response.dto';

@Controller('usage')
@UseGuards(JwtAuthGuard)
export class UsageController {
  constructor(private readonly usageService: UsageService) {}

  @Get()
  getUsage(
    @CurrentUser() user: UserDocument & { _id: { toString(): string } },
  ): Promise<UsageResponseDto> {
    return this.usageService.getUsage(user._id.toString());
  }
}
