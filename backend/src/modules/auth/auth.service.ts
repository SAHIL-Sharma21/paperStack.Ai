/**
 * Auth Service - signup, login, JWT
 * @author: Sahil Sharma
 */

import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.services';
import { SignupDto } from './dtos/signup.dto';
import { LoginDto } from './dtos/login.dto';
import { UserDocument } from '../users/user.schema';
import { hashPassword, comparePassword } from '../../utils/password.util';
import { normalizeLoginPayload, normalizeSignupPayload } from './helper';

export interface JwtPayload {
  sub: string;
  email: string;
}

export interface AuthResponse {
  access_token: string;
  message: string;
  user: {
    id: string;
    email: string;
    username: string;
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async signup(signupDto: SignupDto): Promise<AuthResponse> {
    try {
      //normalize the data before passing to the database
      const { email, username } = normalizeSignupPayload(signupDto);

      const existingEmail = await this.usersService.getUserByEmail(email);
      if (existingEmail) {
        throw new ConflictException('Email already registered');
      }

      const existingUsername =
        await this.usersService.getUserByUsername(username);
      if (existingUsername) {
        throw new ConflictException('Username already taken');
      }

      const hashedPassword = await hashPassword(signupDto.password);
      const user = await this.usersService.createUser({
        email,
        password: hashedPassword,
        username,
      });

      return this.buildAuthResponse(user, 'User created successfully');
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      if (error instanceof BadRequestException) {
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
      throw new InternalServerErrorException(
        'An error occurred while signing up',
        { cause: error },
      );
    }
  }

  async login(loginDto: LoginDto): Promise<AuthResponse> {
    try {
      const { emailOrUsername, isEmail } = normalizeLoginPayload(loginDto);

      const user = isEmail
        ? await this.usersService.getUserByEmailWithPassword(emailOrUsername)
        : await this.usersService.getUserByUsernameWithPassword(
            emailOrUsername,
          );

      if (!user) {
        throw new UnauthorizedException('Invalid email/username or password');
      }

      const isPasswordValid = await comparePassword(
        loginDto.password,
        user.password,
      );
      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid email or password');
      }

      return this.buildAuthResponse(user, 'User logged in successfully');
    } catch (error) {
      if (
        error instanceof UnauthorizedException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        'An error occurred while logging in',
        { cause: error },
      );
    }
  }

  async validateUser(userId: string): Promise<UserDocument | null> {
    return this.usersService.getUserById(userId);
  }

  private buildAuthResponse(user: UserDocument, message: string): AuthResponse {
    const payload: JwtPayload = { sub: user._id.toString(), email: user.email };
    const access_token = this.jwtService.sign(payload);

    return {
      access_token,
      message,
      user: {
        id: user._id.toString(),
        email: user.email,
        username: user.username,
      },
    };
  }
}
