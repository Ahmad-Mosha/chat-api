import { IsString, IsOptional, IsEnum, IsArray, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ConversationType } from '../../entities/conversation.entity';
import { MessageType } from '../../entities/message.entity';

export class CreateConversationDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ enum: ConversationType, default: ConversationType.DIRECT })
  @IsEnum(ConversationType)
  type: ConversationType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsUUID(4, { each: true })
  participantIds: string[];

  @ApiProperty({ default: false })
  @IsOptional()
  isPrivate?: boolean;
}

export class UpdateConversationDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  avatar?: string;
}

export class SendMessageDto {
  @ApiProperty()
  @IsString()
  content: string;

  @ApiProperty({ enum: MessageType, default: MessageType.TEXT })
  @IsEnum(MessageType)
  type: MessageType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  replyToId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  metadata?: any;
}

export class AddParticipantDto {
  @ApiProperty()
  @IsUUID()
  userId: string;
}

export class ReactToMessageDto {
  @ApiProperty()
  @IsString()
  emoji: string;
}
