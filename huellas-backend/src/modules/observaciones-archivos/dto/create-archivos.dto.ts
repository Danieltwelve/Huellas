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
}
