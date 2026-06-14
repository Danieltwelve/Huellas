import { PartialType } from '@nestjs/swagger';
import { CreateAvisoDto } from './create-aviso.dto';

export class UpdateAvisoDto extends PartialType(CreateAvisoDto) {}
