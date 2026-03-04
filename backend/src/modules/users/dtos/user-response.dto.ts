/**
 * User response DTO - omits password and sensitive fields
 * @author: Sahil Sharma
 */

export class UserResponseDto {
  id: string;
  email: string;
  username: string;
  createdAt?: Date;
  updatedAt?: Date;
}
