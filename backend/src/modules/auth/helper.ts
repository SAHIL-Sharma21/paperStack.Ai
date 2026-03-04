import { BadRequestException } from '@nestjs/common';
import { SignupDto } from './dtos/signup.dto';
import { LoginDto } from './dtos/login.dto';

export const normalizeSignupPayload = (signupDto: SignupDto) => {
  const { email, username } = signupDto;
  if (!email || !username) {
    throw new BadRequestException('Email and username are required');
  }

  return {
    email: email.trim().toLowerCase(),
    username: username.trim().toLowerCase(),
  };
};

export const normalizeLoginPayload = (loginDto: LoginDto) => {
  const { emailOrUsername, password } = loginDto;

  if (!emailOrUsername || !password) {
    throw new BadRequestException(
      'Email or username and password are required',
    );
  }

  const trimmed = emailOrUsername.trim().toLowerCase();
  const isEmail = trimmed.includes('@');

  return {
    emailOrUsername: trimmed,
    isEmail,
  };
};
