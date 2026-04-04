import { Type } from '@nestjs/class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { CreateEnvioObservacionesDto } from './create-observaciones.dto';

export class ArchivoObservacionInputDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  archivo_path?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  archivo_nombre_original?: string;
}

export class CreateEnvioObservacionesConArchivosDto extends CreateEnvioObservacionesDto {
  @IsOptional()
  @IsArray({ message: 'archivos debe ser un arreglo' })
  @ValidateNested({ each: true })
  @Type(() => ArchivoObservacionInputDto)
  archivos?: ArchivoObservacionInputDto[];
}
