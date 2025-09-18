import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import {
  Conversation,
  ConversationType,
  ConversationAdmin,
} from '../entities/conversation.entity';
import {
  Message,
  MessageReaction,
  MessageRead,
  MessageStatus,
} from '../entities/message.entity';
import { User } from '../entities/user.entity';
import {
  CreateConversationDto,
  UpdateConversationDto,
  SendMessageDto,
  AddParticipantDto,
  ReactToMessageDto,
} from './dto/chat.dto';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Conversation)
    private conversationRepository: Repository<Conversation>,
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
    @InjectRepository(MessageReaction)
    private reactionRepository: Repository<MessageReaction>,
    @InjectRepository(MessageRead)
    private readRepository: Repository<MessageRead>,
    @InjectRepository(ConversationAdmin)
    private adminRepository: Repository<ConversationAdmin>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async createConversation(
    userId: string,
    createConversationDto: CreateConversationDto,
  ): Promise<Conversation> {
    const { participantIds, ...conversationData } = createConversationDto;

    // Include the creator in participants
    const allParticipantIds = [...new Set([userId, ...participantIds])];

    // Validate participants exist
    const participants = await this.userRepository.findBy({
      id: In(allParticipantIds),
    });
    if (participants.length !== allParticipantIds.length) {
      throw new NotFoundException('One or more participants not found');
    }

    // For direct conversations, check if one already exists
    if (
      createConversationDto.type === ConversationType.DIRECT &&
      allParticipantIds.length === 2
    ) {
      const existingConversation = await this.findDirectConversation(
        allParticipantIds[0],
        allParticipantIds[1],
      );
      if (existingConversation) {
        return existingConversation;
      }
    }

    const conversation = this.conversationRepository.create({
      ...conversationData,
      createdBy: userId,
      participants,
      lastActivity: new Date(),
    });

    const savedConversation =
      await this.conversationRepository.save(conversation);

    // Make creator admin for group conversations
    if (createConversationDto.type !== ConversationType.DIRECT) {
      await this.adminRepository.save({
        conversationId: savedConversation.id,
        userId,
      });
    }

    return savedConversation;
  }

  async findDirectConversation(
    userId1: string,
    userId2: string,
  ): Promise<Conversation | null> {
    return this.conversationRepository
      .createQueryBuilder('conversation')
      .leftJoin('conversation.participants', 'participant')
      .where('conversation.type = :type', { type: ConversationType.DIRECT })
      .andWhere('participant.id IN (:...userIds)', {
        userIds: [userId1, userId2],
      })
      .groupBy('conversation.id')
      .having('COUNT(participant.id) = 2')
      .getOne();
  }

  async getUserConversations(userId: string): Promise<Conversation[]> {
    return this.conversationRepository
      .createQueryBuilder('conversation')
      .leftJoinAndSelect('conversation.participants', 'participant')
      .leftJoin('conversation.messages', 'message')
      .addSelect(['message.id', 'message.content', 'message.createdAt'])
      .where('participant.id = :userId', { userId })
      .orderBy('conversation.lastActivity', 'DESC')
      .getMany();
  }

  async getConversationById(
    conversationId: string,
    userId: string,
  ): Promise<Conversation> {
    const conversation = await this.conversationRepository
      .createQueryBuilder('conversation')
      .leftJoinAndSelect('conversation.participants', 'participant')
      .where('conversation.id = :conversationId', { conversationId })
      .andWhere('participant.id = :userId', { userId })
      .getOne();

    if (!conversation) {
      throw new NotFoundException('Conversation not found or access denied');
    }

    return conversation;
  }

  async updateConversation(
    conversationId: string,
    userId: string,
    updateDto: UpdateConversationDto,
  ): Promise<Conversation> {
    const conversation = await this.getConversationById(conversationId, userId);

    // Check if user is admin for group conversations
    if (conversation.type !== ConversationType.DIRECT) {
      const isAdmin = await this.isUserAdmin(conversationId, userId);
      if (!isAdmin) {
        throw new ForbiddenException(
          'Only admins can update conversation details',
        );
      }
    }

    Object.assign(conversation, updateDto);
    return this.conversationRepository.save(conversation);
  }

  async sendMessage(
    conversationId: string,
    userId: string,
    sendMessageDto: SendMessageDto,
  ): Promise<Message> {
    // Verify user is participant
    await this.getConversationById(conversationId, userId);

    const message = this.messageRepository.create({
      ...sendMessageDto,
      senderId: userId,
      conversationId,
      status: MessageStatus.SENT,
    });

    const savedMessage = await this.messageRepository.save(message);

    // Update conversation last activity
    await this.conversationRepository.update(conversationId, {
      lastActivity: new Date(),
    });

    return this.messageRepository.findOne({
      where: { id: savedMessage.id },
      relations: ['sender'],
    }) as Promise<Message>;
  }

  async getMessages(
    conversationId: string,
    userId: string,
    page: number = 1,
    limit: number = 50,
  ): Promise<{ messages: Message[]; total: number }> {
    // Verify user is participant
    await this.getConversationById(conversationId, userId);

    const [messages, total] = await this.messageRepository.findAndCount({
      where: { conversationId, isDeleted: false },
      relations: ['sender', 'replyTo', 'reactions', 'reactions.user'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { messages: messages.reverse(), total };
  }

  async deleteMessage(messageId: string, userId: string): Promise<void> {
    const message = await this.messageRepository.findOne({
      where: { id: messageId },
      relations: ['conversation', 'conversation.participants'],
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    // Check if user is sender or admin
    const isOwner = message.senderId === userId;
    const isAdmin = await this.isUserAdmin(message.conversationId, userId);

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('You can only delete your own messages');
    }

    await this.messageRepository.update(messageId, {
      isDeleted: true,
      deletedAt: new Date(),
    });
  }

  async editMessage(
    messageId: string,
    userId: string,
    content: string,
  ): Promise<Message> {
    const message = await this.messageRepository.findOne({
      where: { id: messageId, senderId: userId },
    });

    if (!message) {
      throw new NotFoundException('Message not found or access denied');
    }

    await this.messageRepository.update(messageId, {
      content,
      isEdited: true,
      editedAt: new Date(),
    });

    return this.messageRepository.findOne({
      where: { id: messageId },
      relations: ['sender'],
    }) as Promise<Message>;
  }

  async reactToMessage(
    messageId: string,
    userId: string,
    reactDto: ReactToMessageDto,
  ): Promise<MessageReaction> {
    const message = await this.messageRepository.findOne({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    // Check if reaction already exists
    const existingReaction = await this.reactionRepository.findOne({
      where: { messageId, userId, emoji: reactDto.emoji },
    });

    if (existingReaction) {
      // Remove reaction if it exists
      await this.reactionRepository.remove(existingReaction);
      return null as any;
    }

    // Add new reaction
    const reaction = this.reactionRepository.create({
      messageId,
      userId,
      emoji: reactDto.emoji,
    });

    return this.reactionRepository.save(reaction);
  }

  async markAsRead(conversationId: string, userId: string): Promise<void> {
    // Get all unread messages in conversation
    const messages = await this.messageRepository.find({
      where: { conversationId },
      order: { createdAt: 'DESC' },
    });

    const readPromises = messages.map(async (message) => {
      const existingRead = await this.readRepository.findOne({
        where: { messageId: message.id, userId },
      });

      if (!existingRead) {
        return this.readRepository.save({
          messageId: message.id,
          userId,
        });
      }
    });

    await Promise.all(readPromises);
  }

  async addParticipant(
    conversationId: string,
    userId: string,
    addParticipantDto: AddParticipantDto,
  ): Promise<void> {
    const conversation = await this.getConversationById(conversationId, userId);

    if (conversation.type === ConversationType.DIRECT) {
      throw new ForbiddenException(
        'Cannot add participants to direct conversations',
      );
    }

    // Check if user is admin
    const isAdmin = await this.isUserAdmin(conversationId, userId);
    if (!isAdmin) {
      throw new ForbiddenException('Only admins can add participants');
    }

    const newParticipant = await this.userRepository.findOne({
      where: { id: addParticipantDto.userId },
    });

    if (!newParticipant) {
      throw new NotFoundException('User not found');
    }

    conversation.participants.push(newParticipant);
    await this.conversationRepository.save(conversation);
  }

  async removeParticipant(
    conversationId: string,
    userId: string,
    participantId: string,
  ): Promise<void> {
    const conversation = await this.getConversationById(conversationId, userId);

    if (conversation.type === ConversationType.DIRECT) {
      throw new ForbiddenException(
        'Cannot remove participants from direct conversations',
      );
    }

    const isAdmin = await this.isUserAdmin(conversationId, userId);
    const isRemovingSelf = userId === participantId;

    if (!isAdmin && !isRemovingSelf) {
      throw new ForbiddenException('Only admins can remove other participants');
    }

    conversation.participants = conversation.participants.filter(
      (p) => p.id !== participantId,
    );
    await this.conversationRepository.save(conversation);

    // Remove admin role if removing admin
    await this.adminRepository.delete({
      conversationId,
      userId: participantId,
    });
  }

  private async isUserAdmin(
    conversationId: string,
    userId: string,
  ): Promise<boolean> {
    const admin = await this.adminRepository.findOne({
      where: { conversationId, userId },
    });
    return !!admin;
  }

  async searchMessages(
    conversationId: string,
    userId: string,
    query: string,
  ): Promise<Message[]> {
    // Verify user is participant
    await this.getConversationById(conversationId, userId);

    return this.messageRepository
      .createQueryBuilder('message')
      .leftJoinAndSelect('message.sender', 'sender')
      .where('message.conversationId = :conversationId', { conversationId })
      .andWhere('message.content ILIKE :query', { query: `%${query}%` })
      .andWhere('message.isDeleted = false')
      .orderBy('message.createdAt', 'DESC')
      .getMany();
  }
}
