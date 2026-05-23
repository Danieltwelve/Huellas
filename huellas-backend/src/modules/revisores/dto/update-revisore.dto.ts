import { PartialType } from '@nestjs/swagger';
import { CreateRevisoreDto } from './create-revisore.dto';

export class UpdateRevisoreDto extends PartialType(CreateRevisoreDto) {}
