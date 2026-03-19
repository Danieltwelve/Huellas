import { PartialType } from '@nestjs/swagger';
import { CreateArticuloCompletoDto } from './create-articulo-completo.dto';

export class UpdateArticuloDto extends PartialType(CreateArticuloCompletoDto) {}
