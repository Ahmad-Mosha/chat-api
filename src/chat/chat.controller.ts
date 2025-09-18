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
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { ChatService } from './chat.service';
import {
  CreateConversationDto,
  UpdateConversationDto,
  SendMessageDto,
  AddParticipantDto,
  ReactToMessageDto,
} from './dto/chat.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Chat')
@Controller('chat')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Post('conversations')
  @ApiOperation({ summary: 'Create a new conversation' })
  @ApiResponse({
    status: 201,
    description: 'Conversation created successfully',
  })
  async createConversation(
    @Request() req,
    @Body() createConversationDto: CreateConversationDto,
  ) {
    const conversation = await this.chatService.createConversation(
      req.user.id,
      createConversationDto,
    );
    return {
      message: 'Conversation created successfully',
      conversation,
    };
  }

  @Get('conversations')
  @ApiOperation({ summary: 'Get user conversations' })
  @ApiResponse({
    status: 200,
    description: 'Conversations retrieved successfully',
  })
  async getUserConversations(@Request() req) {
    return this.chatService.getUserConversations(req.user.id);
  }

  @Get('conversations/:id')
  @ApiOperation({ summary: 'Get conversation by ID' })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  @ApiResponse({
    status: 200,
    description: 'Conversation retrieved successfully',
  })
  async getConversation(@Request() req, @Param('id') conversationId: string) {
    return this.chatService.getConversationById(conversationId, req.user.id);
  }

  @Put('conversations/:id')
  @ApiOperation({ summary: 'Update conversation' })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  @ApiResponse({
    status: 200,
    description: 'Conversation updated successfully',
  })
  async updateConversation(
    @Request() req,
    @Param('id') conversationId: string,
    @Body() updateConversationDto: UpdateConversationDto,
  ) {
    const conversation = await this.chatService.updateConversation(
      conversationId,
      req.user.id,
      updateConversationDto,
    );
    return {
      message: 'Conversation updated successfully',
      conversation,
    };
  }

  @Post('conversations/:id/messages')
  @ApiOperation({ summary: 'Send a message' })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  @ApiResponse({ status: 201, description: 'Message sent successfully' })
  async sendMessage(
    @Request() req,
    @Param('id') conversationId: string,
    @Body() sendMessageDto: SendMessageDto,
  ) {
    const message = await this.chatService.sendMessage(
      conversationId,
      req.user.id,
      sendMessageDto,
    );
    return {
      message: 'Message sent successfully',
      data: message,
    };
  }

  @Get('conversations/:id/messages')
  @ApiOperation({ summary: 'Get conversation messages' })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page',
  })
  @ApiResponse({ status: 200, description: 'Messages retrieved successfully' })
  async getMessages(
    @Request() req,
    @Param('id') conversationId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    return this.chatService.getMessages(
      conversationId,
      req.user.id,
      page,
      limit,
    );
  }

  @Get('conversations/:id/messages/search')
  @ApiOperation({ summary: 'Search messages in conversation' })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  @ApiQuery({ name: 'q', description: 'Search query' })
  @ApiResponse({ status: 200, description: 'Search results' })
  async searchMessages(
    @Request() req,
    @Param('id') conversationId: string,
    @Query('q') query: string,
  ) {
    return this.chatService.searchMessages(conversationId, req.user.id, query);
  }

  @Put('messages/:id')
  @ApiOperation({ summary: 'Edit a message' })
  @ApiParam({ name: 'id', description: 'Message ID' })
  @ApiResponse({ status: 200, description: 'Message edited successfully' })
  async editMessage(
    @Request() req,
    @Param('id') messageId: string,
    @Body('content') content: string,
  ) {
    const message = await this.chatService.editMessage(
      messageId,
      req.user.id,
      content,
    );
    return {
      message: 'Message edited successfully',
      data: message,
    };
  }

  @Delete('messages/:id')
  @ApiOperation({ summary: 'Delete a message' })
  @ApiParam({ name: 'id', description: 'Message ID' })
  @ApiResponse({ status: 200, description: 'Message deleted successfully' })
  async deleteMessage(@Request() req, @Param('id') messageId: string) {
    await this.chatService.deleteMessage(messageId, req.user.id);
    return { message: 'Message deleted successfully' };
  }

  @Post('messages/:id/reactions')
  @ApiOperation({ summary: 'React to a message' })
  @ApiParam({ name: 'id', description: 'Message ID' })
  @ApiResponse({
    status: 201,
    description: 'Reaction added/removed successfully',
  })
  async reactToMessage(
    @Request() req,
    @Param('id') messageId: string,
    @Body() reactDto: ReactToMessageDto,
  ) {
    const reaction = await this.chatService.reactToMessage(
      messageId,
      req.user.id,
      reactDto,
    );
    return {
      message: reaction
        ? 'Reaction added successfully'
        : 'Reaction removed successfully',
      reaction,
    };
  }

  @Post('conversations/:id/read')
  @ApiOperation({ summary: 'Mark conversation as read' })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  @ApiResponse({ status: 200, description: 'Conversation marked as read' })
  async markAsRead(@Request() req, @Param('id') conversationId: string) {
    await this.chatService.markAsRead(conversationId, req.user.id);
    return { message: 'Conversation marked as read' };
  }

  @Post('conversations/:id/participants')
  @ApiOperation({ summary: 'Add participant to conversation' })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  @ApiResponse({ status: 201, description: 'Participant added successfully' })
  async addParticipant(
    @Request() req,
    @Param('id') conversationId: string,
    @Body() addParticipantDto: AddParticipantDto,
  ) {
    await this.chatService.addParticipant(
      conversationId,
      req.user.id,
      addParticipantDto,
    );
    return { message: 'Participant added successfully' };
  }

  @Delete('conversations/:id/participants/:userId')
  @ApiOperation({ summary: 'Remove participant from conversation' })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  @ApiParam({ name: 'userId', description: 'User ID to remove' })
  @ApiResponse({ status: 200, description: 'Participant removed successfully' })
  async removeParticipant(
    @Request() req,
    @Param('id') conversationId: string,
    @Param('userId') participantId: string,
  ) {
    await this.chatService.removeParticipant(
      conversationId,
      req.user.id,
      participantId,
    );
    return { message: 'Participant removed successfully' };
  }
}
