import {
  IsInt,
  IsPositive,
  IsString,
  IsNotEmpty,
  MaxLength,
} from 'class-validator';

export class CreateEnvioArchivosDto {
  @IsInt()
  @IsPositive()
  @IsNotEmpty()
  observaciones_id?: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  archivo_path?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  archivo_nombre_original?: string;
}
