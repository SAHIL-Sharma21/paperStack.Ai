/**
 * User Schema for the users collection
 * @author: Sahil Sharma
 */

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({
  collection: 'users',
  timestamps: true,
})
export class User {
  @Prop({ required: true, unique: true, index: true })
  email: string;

  @Prop({ required: true, select: false })
  password: string;

  @Prop({ required: true, unique: true })
  username: string;

  /**More fields can be added based on the features of the application */
}

export const UserSchema = SchemaFactory.createForClass(User);
