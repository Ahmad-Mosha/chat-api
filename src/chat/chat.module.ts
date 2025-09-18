import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import {
  Conversation,
  ConversationAdmin,
} from '../entities/conversation.entity';
import {
  Message,
  MessageReaction,
  MessageRead,
} from '../entities/message.entity';
import { User } from '../entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Conversation,
      ConversationAdmin,
      Message,
      MessageReaction,
      MessageRead,
      User,
    ]),
  ],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
