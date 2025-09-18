import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { ChatService } from '../chat/chat.service';
import { UserStatus } from '../entities/user.entity';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  user?: any;
}

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);
  private connectedUsers = new Map<string, Set<string>>(); // userId -> Set of socketIds
  private typingUsers = new Map<string, Set<string>>(); // conversationId -> Set of userIds

  constructor(
    private jwtService: JwtService,
    private usersService: UsersService,
    private chatService: ChatService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token =
        client.handshake.auth.token ||
        client.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      const user = await this.usersService.findById(payload.sub);

      if (!user) {
        client.disconnect();
        return;
      }

      client.userId = user.id;
      client.user = user;

      // Track connected user
      if (!this.connectedUsers.has(user.id)) {
        this.connectedUsers.set(user.id, new Set());
      }
      this.connectedUsers.get(user.id)!.add(client.id);

      // Update user status to online
      await this.usersService.updateStatus(user.id, UserStatus.ONLINE);

      // Join user to their conversations
      const conversations = await this.chatService.getUserConversations(
        user.id,
      );
      conversations.forEach((conversation) => {
        client.join(`conversation:${conversation.id}`);
      });

      // Notify other users that this user is online
      client.broadcast.emit('user:online', { userId: user.id, user });

      this.logger.log(
        `User ${user.username} connected with socket ${client.id}`,
      );
    } catch (error) {
      this.logger.error('Connection error:', error);
      client.disconnect();
    }
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      const userSockets = this.connectedUsers.get(client.userId);
      if (userSockets) {
        userSockets.delete(client.id);

        // If no more sockets for this user, mark as offline
        if (userSockets.size === 0) {
          this.connectedUsers.delete(client.userId);
          await this.usersService.updateStatus(
            client.userId,
            UserStatus.OFFLINE,
          );

          // Notify other users that this user is offline
          client.broadcast.emit('user:offline', { userId: client.userId });
        }
      }

      this.logger.log(`User ${client.userId} disconnected socket ${client.id}`);
    }
  }

  @SubscribeMessage('join:conversation')
  async handleJoinConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    try {
      if (!client.userId) return;

      // Verify user is participant in conversation
      await this.chatService.getConversationById(
        data.conversationId,
        client.userId,
      );

      client.join(`conversation:${data.conversationId}`);

      this.logger.log(
        `User ${client.userId} joined conversation ${data.conversationId}`,
      );
    } catch (error) {
      client.emit('error', { message: 'Cannot join conversation' });
    }
  }

  @SubscribeMessage('leave:conversation')
  handleLeaveConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    client.leave(`conversation:${data.conversationId}`);
    this.logger.log(
      `User ${client.userId} left conversation ${data.conversationId}`,
    );
  }

  @SubscribeMessage('send:message')
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    data: {
      conversationId: string;
      content: string;
      type?: string;
      replyToId?: string;
      metadata?: any;
    },
  ) {
    try {
      if (!client.userId) return;

      const message = await this.chatService.sendMessage(
        data.conversationId,
        client.userId,
        {
          content: data.content,
          type: data.type as any,
          replyToId: data.replyToId,
          metadata: data.metadata,
        },
      );

      // Emit message to all participants in the conversation
      this.server
        .to(`conversation:${data.conversationId}`)
        .emit('message:new', {
          message,
          conversationId: data.conversationId,
        });

      // Send delivery confirmation to sender
      client.emit('message:sent', { messageId: message.id });
    } catch (error) {
      client.emit('error', { message: 'Failed to send message' });
    }
  }

  @SubscribeMessage('edit:message')
  async handleEditMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { messageId: string; content: string },
  ) {
    try {
      if (!client.userId) return;

      const message = await this.chatService.editMessage(
        data.messageId,
        client.userId,
        data.content,
      );

      // Emit edited message to all participants
      this.server
        .to(`conversation:${message.conversationId}`)
        .emit('message:edited', {
          message,
        });
    } catch (error) {
      client.emit('error', { message: 'Failed to edit message' });
    }
  }

  @SubscribeMessage('delete:message')
  async handleDeleteMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { messageId: string },
  ) {
    try {
      if (!client.userId) return;

      // For now, we'll just delete and notify. In a real app, you'd get the conversation ID first
      await this.chatService.deleteMessage(data.messageId, client.userId);

      // Emit deletion to all connected users (can be optimized to specific conversation)
      this.server.emit('message:deleted', {
        messageId: data.messageId,
      });
    } catch (error) {
      client.emit('error', { message: 'Failed to delete message' });
    }
  }

  @SubscribeMessage('react:message')
  async handleReactToMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { messageId: string; emoji: string },
  ) {
    try {
      if (!client.userId) return;

      const reaction = await this.chatService.reactToMessage(
        data.messageId,
        client.userId,
        { emoji: data.emoji },
      );

      // Find the conversation for this message
      // Note: In a real implementation, you might want to store conversationId with message
      // For now, we'll emit to all connected users - this can be optimized
      this.server.emit('message:reaction', {
        messageId: data.messageId,
        reaction,
        action: reaction ? 'added' : 'removed',
      });
    } catch (error) {
      client.emit('error', { message: 'Failed to react to message' });
    }
  }

  @SubscribeMessage('typing:start')
  handleTypingStart(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    if (!client.userId) return;

    if (!this.typingUsers.has(data.conversationId)) {
      this.typingUsers.set(data.conversationId, new Set());
    }

    this.typingUsers.get(data.conversationId)!.add(client.userId);

    // Emit to other participants in the conversation
    client.to(`conversation:${data.conversationId}`).emit('typing:start', {
      userId: client.userId,
      user: client.user,
      conversationId: data.conversationId,
    });
  }

  @SubscribeMessage('typing:stop')
  handleTypingStop(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    if (!client.userId) return;

    const typingSet = this.typingUsers.get(data.conversationId);
    if (typingSet) {
      typingSet.delete(client.userId);
      if (typingSet.size === 0) {
        this.typingUsers.delete(data.conversationId);
      }
    }

    // Emit to other participants in the conversation
    client.to(`conversation:${data.conversationId}`).emit('typing:stop', {
      userId: client.userId,
      conversationId: data.conversationId,
    });
  }

  @SubscribeMessage('read:conversation')
  async handleMarkAsRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    try {
      if (!client.userId) return;

      await this.chatService.markAsRead(data.conversationId, client.userId);

      // Emit to other participants that this user has read the conversation
      client
        .to(`conversation:${data.conversationId}`)
        .emit('conversation:read', {
          userId: client.userId,
          conversationId: data.conversationId,
          readAt: new Date(),
        });
    } catch (error) {
      client.emit('error', { message: 'Failed to mark as read' });
    }
  }

  @SubscribeMessage('update:status')
  async handleUpdateStatus(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { status: UserStatus },
  ) {
    try {
      if (!client.userId) return;

      await this.usersService.updateStatus(client.userId, data.status);

      // Notify all connected users about status change
      this.server.emit('user:status', {
        userId: client.userId,
        status: data.status,
      });
    } catch (error) {
      client.emit('error', { message: 'Failed to update status' });
    }
  }

  // Utility method to emit to specific user across all their connections
  emitToUser(userId: string, event: string, data: any) {
    const userSockets = this.connectedUsers.get(userId);
    if (userSockets) {
      userSockets.forEach((socketId) => {
        this.server.to(socketId).emit(event, data);
      });
    }
  }

  // Get online users in a conversation
  getOnlineUsersInConversation(conversationId: string): string[] {
    const room = this.server.sockets.adapter.rooms.get(
      `conversation:${conversationId}`,
    );
    if (!room) return [];

    const onlineUsers: string[] = [];
    room.forEach((socketId) => {
      const socket = this.server.sockets.sockets.get(
        socketId,
      ) as AuthenticatedSocket;
      if (socket?.userId) {
        onlineUsers.push(socket.userId);
      }
    });

    return [...new Set(onlineUsers)]; // Remove duplicates
  }
}
