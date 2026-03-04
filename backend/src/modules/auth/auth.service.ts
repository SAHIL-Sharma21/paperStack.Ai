/**
 * Auth Service - signup, login, JWT
 * @author: Sahil Sharma
 */

import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.services';
import { SignupDto } from './dtos/signup.dto';
import { LoginDto } from './dtos/login.dto';
import { UserDocument } from '../users/user.schema';
import { hashPassword, comparePassword } from '../../utils/password.util';

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
    const existingEmail = await this.usersService.getUserByEmail(
      signupDto.email,
    );
    if (existingEmail) {
      throw new ConflictException('Email already registered');
    }

    const existingUsername = await this.usersService.getUserByUsername(
      signupDto.username,
    );
    if (existingUsername) {
      throw new ConflictException('Username already taken');
    }

    const hashedPassword = await hashPassword(signupDto.password);
    const user = await this.usersService.createUser({
      email: signupDto.email,
      password: hashedPassword,
      username: signupDto.username,
    });

    return this.buildAuthResponse(user, 'User created successfully');
  }

  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const user = await this.usersService.getUserByEmailWithPassword(
      loginDto.email,
    );
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await comparePassword(
      loginDto.password,
      user.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.buildAuthResponse(user, 'User logged in successfully');
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
