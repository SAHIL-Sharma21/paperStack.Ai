/**
 * Users Controller for the users collection
 * All routes require JWT auth. updateUser/deleteUser enforce ownership.
 * @author: Sahil Sharma
 */

import {
  Controller,
  Delete,
  Param,
  Get,
  Patch,
  Body,
  UseGuards,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { UsersService } from './users.services';
import { UpdateUserDto } from './dtos/updateUser.dto';
import { UserResponseDto } from './dtos/user-response.dto';
import type { UserDocument } from './user.schema';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async getAllUsers(): Promise<UserResponseDto[]> {
    const users = await this.usersService.getAllUsers();
    return users.map((u) => this.toUserResponseDto(u));
  }

  @Get(':id')
  async getUserById(
    @Param('id', ParseObjectIdPipe) userId: string,
  ): Promise<UserResponseDto> {
    const user = await this.usersService.getUserById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.toUserResponseDto(user);
  }

  @Patch(':id')
  async updateUser(
    @Param('id', ParseObjectIdPipe) userId: string,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() user: UserDocument & { _id: { toString(): string } },
  ): Promise<UserResponseDto> {
    this.assertOwnership(userId, user);
    const updated = await this.usersService.updateUser(userId, updateUserDto);
    if (!updated) {
      throw new NotFoundException('User not found');
    }
    return this.toUserResponseDto(updated);
  }

  @Delete(':id')
  async deleteUser(
    @Param('id', ParseObjectIdPipe) userId: string,
    @CurrentUser() user: UserDocument & { _id: { toString(): string } },
  ): Promise<{ message: string }> {
    this.assertOwnership(userId, user);
    const deleted = await this.usersService.deleteUser(userId);
    if (!deleted) {
      throw new NotFoundException('User not found');
    }
    return { message: 'User deleted successfully' };
  }

  private assertOwnership(
    userId: string,
    currentUser: UserDocument & { _id: { toString(): string } },
  ): void {
    if (currentUser._id.toString() !== userId) {
      throw new ForbiddenException('You can only modify your own profile');
    }
  }

  private toUserResponseDto(doc: UserDocument): UserResponseDto {
    const dto = new UserResponseDto();
    dto.id = doc._id.toString();
    dto.email = doc.email;
    dto.username = doc.username;
    const docWithTimestamps = doc as UserDocument & {
      createdAt?: Date;
      updatedAt?: Date;
    };
    if (docWithTimestamps.createdAt)
      dto.createdAt = docWithTimestamps.createdAt;
    if (docWithTimestamps.updatedAt)
      dto.updatedAt = docWithTimestamps.updatedAt;
    return dto;
  }
}
