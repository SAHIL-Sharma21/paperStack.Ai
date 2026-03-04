/**
 * Users Services for the users collection
 * @author: Sahil Sharma
 */

import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { User, UserDocument } from "./user.schema";
import { CreateUserDto } from "./dtos/createUser.dto";
import { UpdateUserDto } from "./dtos/updateUser.dto";

@Injectable()
export class UsersService {
    constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

    async createUser(createUserDto: CreateUserDto): Promise<UserDocument>{
        const newUser = new this.userModel(createUserDto);
        return newUser.save();
    }

    async updateUser(userId: string, updateUserDto: UpdateUserDto): Promise<UserDocument | null> {
        return this.userModel.findByIdAndUpdate(userId, updateUserDto, { new: true });
    }

    async deleteUser(userId: string): Promise<UserDocument | null> {
        return this.userModel.findByIdAndDelete(userId);
    }

    async getUserById(userId: string): Promise<UserDocument | null> {
        return this.userModel.findById(userId);
    }

    async getUserByEmail(email: string): Promise<UserDocument | null> {
        return this.userModel.findOne({ email });
    }

    async getUserByUsername(username: string): Promise<UserDocument | null> {
        return this.userModel.findOne({ username });
    }
    
    async getAllUsers(): Promise<UserDocument[]>{
        return this.userModel.find();
    }

    async getUserCount(): Promise<number>{
        return this.userModel.countDocuments();
    }
}
