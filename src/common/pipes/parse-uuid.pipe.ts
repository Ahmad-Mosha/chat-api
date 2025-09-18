import {
  Injectable,
  PipeTransform,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';
import { validate } from 'uuid';

@Injectable()
export class ParseUUIDPipe implements PipeTransform<string> {
  transform(value: string, metadata: ArgumentMetadata): string {
    if (!validate(value)) {
      throw new BadRequestException('Invalid UUID format');
    }
    return value;
  }
}
