import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { Message } from './message.entity';
import { Conversation } from './conversation.entity';

export enum UserStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  AWAY = 'away',
  BUSY = 'busy',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  username: string;

  @Column({ unique: true })
  email: string;

  @Column()
  @Exclude()
  password: string;

  @Column({ nullable: true })
  firstName?: string;

  @Column({ nullable: true })
  lastName?: string;

  @Column({ nullable: true })
  avatar?: string;

  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.OFFLINE })
  status: UserStatus;

  @Column({ type: 'timestamp', nullable: true })
  lastSeen?: Date;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Message, (message) => message.sender)
  messages: Message[];

  @ManyToMany(() => Conversation, (conversation) => conversation.participants)
  conversations: Conversation[];

  // Blocked users
  @ManyToMany(() => User, (user) => user.blockedBy)
  @JoinTable({
    name: 'user_blocks',
    joinColumn: { name: 'blocker_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'blocked_id', referencedColumnName: 'id' },
  })
  blocked: User[];

  @ManyToMany(() => User, (user) => user.blocked)
  blockedBy: User[];

  // Friends
  @ManyToMany(() => User, (user) => user.friendOf)
  @JoinTable({
    name: 'user_friends',
    joinColumn: { name: 'user_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'friend_id', referencedColumnName: 'id' },
  })
  friends: User[];

  @ManyToMany(() => User, (user) => user.friends)
  friendOf: User[];
}
