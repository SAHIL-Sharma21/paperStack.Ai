/**
 * Users Services for the users collection
 * @author: Sahil Sharma
 */

import {
  Injectable,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './user.schema';
import { CreateUserDto } from './dtos/createUser.dto';
import { UpdateUserDto } from './dtos/updateUser.dto';
import { hashPassword } from '../../utils/password.util';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async createUser(createUserDto: CreateUserDto): Promise<UserDocument> {
    try {
      const newUser = new this.userModel(createUserDto);
      return await newUser.save();
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      const mongoError = error as { code?: number; name?: string };
      if (
        mongoError.code === 11000 ||
        mongoError.name === 'MongoError' ||
        mongoError.name === 'MongoServerError'
      ) {
        throw new ConflictException('Email or username already registered');
      }
      throw error;
    }
  }

  async updateUser(
    userId: string,
    updateUserDto: UpdateUserDto,
  ): Promise<UserDocument | null> {
    try {
      const payload = { ...updateUserDto };
      if (payload.password) {
        payload.password = await hashPassword(payload.password);
      }
      return await this.userModel.findByIdAndUpdate(userId, payload, {
        new: true,
        runValidators: true,
      });
    } catch (error) {
      this.handleMongooseError(error, 'User');
      throw error;
    }
  }

  async deleteUser(userId: string): Promise<UserDocument | null> {
    try {
      return await this.userModel.findByIdAndDelete(userId);
    } catch (error) {
      this.handleMongooseError(error, 'User');
      throw error;
    }
  }

  async getUserById(userId: string): Promise<UserDocument | null> {
    try {
      return await this.userModel.findById(userId);
    } catch (error) {
      this.handleMongooseError(error, 'User');
      throw error;
    }
  }

  private handleMongooseError(error: unknown, resource: string): void {
    const err = error as { name?: string };
    if (err.name === 'CastError') {
      throw new BadRequestException(`Invalid ${resource.toLowerCase()} ID`);
    }
  }

  async getUserByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email });
  }

  /** Use only for login validation - returns user WITH password */
  async getUserByEmailWithPassword(
    email: string,
  ): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).select('+password');
  }

  /** Use only for login validation - returns user WITH password */
  async getUserByUsernameWithPassword(
    username: string,
  ): Promise<UserDocument | null> {
    return this.userModel.findOne({ username }).select('+password');
  }

  async getUserByUsername(username: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ username });
  }

  async getAllUsers(): Promise<UserDocument[]> {
    return this.userModel.find();
  }

  async getUserCount(): Promise<number> {
    return this.userModel.countDocuments();
  }
}
