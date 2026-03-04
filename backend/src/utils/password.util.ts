/**
 * Password hashing and comparison utilities
 * @author: Sahil Sharma
 */

import * as bcrypt from 'bcrypt';
import { SALT_ROUNDS } from './constant';



export async function hashPassword(plainPassword: string): Promise<string> {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

export async function comparePassword(
  plainPassword: string,
  hashedPassword: string,
): Promise<boolean> {
  return bcrypt.compare(plainPassword, hashedPassword);
}
