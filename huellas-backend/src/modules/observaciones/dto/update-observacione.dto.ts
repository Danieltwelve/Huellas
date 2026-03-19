import { PartialType } from '@nestjs/swagger';
import { CreateEnvioObservacionesDto } from './create-observaciones.dto';

export class UpdateObservacioneDto extends PartialType(
  CreateEnvioObservacionesDto,
) {}
