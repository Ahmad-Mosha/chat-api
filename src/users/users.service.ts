import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserStatus } from '../entities/user.entity';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const user = this.userRepository.create(createUserDto);
    return this.userRepository.save(user);
  }

  async findAll(): Promise<User[]> {
    return this.userRepository.find({
      select: [
        'id',
        'username',
        'email',
        'firstName',
        'lastName',
        'avatar',
        'status',
        'lastSeen',
        'createdAt',
      ],
    });
  }

  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      select: [
        'id',
        'username',
        'email',
        'firstName',
        'lastName',
        'avatar',
        'status',
        'lastSeen',
        'createdAt',
      ],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async findByEmailOrUsername(
    email: string,
    username: string,
  ): Promise<User | null> {
    return this.userRepository.findOne({
      where: [{ email }, { username }],
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { username } });
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findById(id);
    Object.assign(user, updateUserDto);
    return this.userRepository.save(user);
  }

  async updateStatus(id: string, status: UserStatus): Promise<void> {
    await this.userRepository.update(id, {
      status,
      lastSeen: new Date(),
    });
  }

  async searchUsers(query: string, excludeUserId?: string): Promise<User[]> {
    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .select([
        'user.id',
        'user.username',
        'user.email',
        'user.firstName',
        'user.lastName',
        'user.avatar',
        'user.status',
      ])
      .where(
        'user.username ILIKE :query OR user.firstName ILIKE :query OR user.lastName ILIKE :query',
        { query: `%${query}%` },
      );

    if (excludeUserId) {
      queryBuilder.andWhere('user.id != :excludeUserId', { excludeUserId });
    }

    return queryBuilder.getMany();
  }

  async addFriend(userId: string, friendId: string): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['friends'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const friend = await this.findById(friendId);

    if (!user.friends.some((f) => f.id === friendId)) {
      user.friends.push(friend);
      await this.userRepository.save(user);
    }
  }

  async removeFriend(userId: string, friendId: string): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['friends'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.friends = user.friends.filter((f) => f.id !== friendId);
    await this.userRepository.save(user);
  }

  async getFriends(userId: string): Promise<User[]> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['friends'],
    });

    return user?.friends || [];
  }

  async blockUser(userId: string, blockUserId: string): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['blocked'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const userToBlock = await this.findById(blockUserId);

    if (!user.blocked.some((u) => u.id === blockUserId)) {
      user.blocked.push(userToBlock);
      await this.userRepository.save(user);
    }
  }

  async unblockUser(userId: string, unblockUserId: string): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['blocked'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.blocked = user.blocked.filter((u) => u.id !== unblockUserId);
    await this.userRepository.save(user);
  }

  async getBlockedUsers(userId: string): Promise<User[]> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['blocked'],
    });

    return user?.blocked || [];
  }
}
