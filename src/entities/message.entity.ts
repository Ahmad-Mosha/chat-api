import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Conversation } from './conversation.entity';

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  FILE = 'file',
  SYSTEM = 'system',
}

export enum MessageStatus {
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed',
}

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text')
  content: string;

  @Column({ type: 'enum', enum: MessageType, default: MessageType.TEXT })
  type: MessageType;

  @Column({ type: 'enum', enum: MessageStatus, default: MessageStatus.SENT })
  status: MessageStatus;

  @Column('uuid')
  senderId: string;

  @Column('uuid')
  conversationId: string;

  @Column('uuid', { nullable: true })
  replyToId?: string;

  @Column({ default: false })
  isEdited: boolean;

  @Column({ type: 'timestamp', nullable: true })
  editedAt?: Date;

  @Column({ default: false })
  isDeleted: boolean;

  @Column({ type: 'timestamp', nullable: true })
  deletedAt?: Date;

  @Column('json', { nullable: true })
  metadata?: any; // For file info, dimensions, etc.

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, (user) => user.messages)
  @JoinColumn({ name: 'senderId' })
  sender: User;

  @ManyToOne(() => Conversation, (conversation) => conversation.messages)
  @JoinColumn({ name: 'conversationId' })
  conversation: Conversation;

  @ManyToOne(() => Message, (message) => message.replies)
  @JoinColumn({ name: 'replyToId' })
  replyTo?: Message;

  @OneToMany(() => Message, (message) => message.replyTo)
  replies: Message[];

  @OneToMany(() => MessageReaction, (reaction) => reaction.message)
  reactions: MessageReaction[];

  @OneToMany(() => MessageRead, (read) => read.message)
  readBy: MessageRead[];
}

@Entity('message_reactions')
export class MessageReaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  messageId: string;

  @Column('uuid')
  userId: string;

  @Column()
  emoji: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Message, (message) => message.reactions)
  @JoinColumn({ name: 'messageId' })
  message: Message;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;
}

@Entity('message_reads')
export class MessageRead {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  messageId: string;

  @Column('uuid')
  userId: string;

  @CreateDateColumn()
  readAt: Date;

  @ManyToOne(() => Message, (message) => message.readBy)
  @JoinColumn({ name: 'messageId' })
  message: Message;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;
}
