import { PartialType } from '@nestjs/swagger';
import { CreateHistorialDto } from './create-historial.dto';

export class UpdateArticulosHistorialEtapaDto extends PartialType(
  CreateHistorialDto,
) {}
