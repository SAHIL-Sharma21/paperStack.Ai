/**
 * Users Controller for the users collection
 * @author: Sahil Sharma
 */

import { Controller, Post, Body, Delete, Param, Get, Patch } from "@nestjs/common";
import { UsersService } from "./users.services";
import { CreateUserDto } from "./dtos/createUser.dto";
import { UpdateUserDto } from "./dtos/updateUser.dto";
import { UserDocument } from "./user.schema";

@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) {}

    @Post()
    async createUser(@Body() createUserDto: CreateUserDto): Promise<UserDocument>{
        return this.usersService.createUser(createUserDto);
    }

    @Patch(':id')
    async updateUser(@Param('id') userId: string, @Body() updateUserDto: UpdateUserDto): Promise<UserDocument | null>{
        return this.usersService.updateUser(userId, updateUserDto);
    }

    @Delete(':id')
    async deleteUser(@Param('id') userId: string): Promise<UserDocument | null>{
        return this.usersService.deleteUser(userId);
    }

    @Get(':id')
    async getUserById(@Param('id') userId: string): Promise<UserDocument | null>{
        return this.usersService.getUserById(userId);
    }
    
    @Get()
    async getAllUsers(): Promise<UserDocument[]>{
        return this.usersService.getAllUsers();
    }
}