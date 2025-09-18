import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto, UpdateUserStatusDto } from './dto/user.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  async findAll() {
    return this.usersService.findAll();
  }

  @Get('search')
  @ApiOperation({ summary: 'Search users' })
  @ApiQuery({ name: 'q', description: 'Search query' })
  @ApiResponse({ status: 200, description: 'Search results' })
  async searchUsers(@Query('q') query: string, @Request() req) {
    return this.usersService.searchUsers(query, req.user.id);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile' })
  async getProfile(@Request() req) {
    return this.usersService.findById(req.user.id);
  }

  @Put('me')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  async updateProfile(@Request() req, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(req.user.id, updateUserDto);
  }

  @Put('me/status')
  @ApiOperation({ summary: 'Update user status' })
  @ApiResponse({ status: 200, description: 'Status updated successfully' })
  async updateStatus(@Request() req, @Body() statusDto: UpdateUserStatusDto) {
    await this.usersService.updateStatus(req.user.id, statusDto.status);
    return { message: 'Status updated successfully' };
  }

  @Get('friends')
  @ApiOperation({ summary: 'Get user friends' })
  @ApiResponse({ status: 200, description: 'Friends list' })
  async getFriends(@Request() req) {
    return this.usersService.getFriends(req.user.id);
  }

  @Post('friends/:friendId')
  @ApiOperation({ summary: 'Add friend' })
  @ApiResponse({ status: 201, description: 'Friend added successfully' })
  async addFriend(@Request() req, @Param('friendId') friendId: string) {
    await this.usersService.addFriend(req.user.id, friendId);
    return { message: 'Friend added successfully' };
  }

  @Delete('friends/:friendId')
  @ApiOperation({ summary: 'Remove friend' })
  @ApiResponse({ status: 200, description: 'Friend removed successfully' })
  async removeFriend(@Request() req, @Param('friendId') friendId: string) {
    await this.usersService.removeFriend(req.user.id, friendId);
    return { message: 'Friend removed successfully' };
  }

  @Get('blocked')
  @ApiOperation({ summary: 'Get blocked users' })
  @ApiResponse({ status: 200, description: 'Blocked users list' })
  async getBlockedUsers(@Request() req) {
    return this.usersService.getBlockedUsers(req.user.id);
  }

  @Post('block/:userId')
  @ApiOperation({ summary: 'Block user' })
  @ApiResponse({ status: 201, description: 'User blocked successfully' })
  async blockUser(@Request() req, @Param('userId') userId: string) {
    await this.usersService.blockUser(req.user.id, userId);
    return { message: 'User blocked successfully' };
  }

  @Delete('block/:userId')
  @ApiOperation({ summary: 'Unblock user' })
  @ApiResponse({ status: 200, description: 'User unblocked successfully' })
  async unblockUser(@Request() req, @Param('userId') userId: string) {
    await this.usersService.unblockUser(req.user.id, userId);
    return { message: 'User unblocked successfully' };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, description: 'User found' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findById(@Param('id') id: string) {
    return this.usersService.findById(id);
  }
}