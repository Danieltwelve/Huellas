import { PartialType } from '@nestjs/swagger';
import { CreateRequisitosRevistaDto } from './create-requisitos-revista.dto';

export class UpdateRequisitosRevistaDto extends PartialType(
  CreateRequisitosRevistaDto,
) {}
