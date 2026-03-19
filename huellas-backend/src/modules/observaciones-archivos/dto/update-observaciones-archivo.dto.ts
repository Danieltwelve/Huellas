import { PartialType } from '@nestjs/swagger';
import { CreateEnvioArchivosDto } from './create-archivos.dto';

export class UpdateObservacionesArchivoDto extends PartialType(
  CreateEnvioArchivosDto,
) {}
