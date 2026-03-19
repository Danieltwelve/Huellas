/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Transform } from '@nestjs/class-transformer';
import {
  IsInt,
  IsPositive,
  IsOptional,
  IsDateString,
  IsString,
  Min,
} from 'class-validator';

export class CreateEnvioObservacionesDto {
  @IsInt()
  @IsPositive()
  articulo_id?: number;

  @IsInt()
  @IsPositive()
  @IsOptional()
  usuario_id?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  @Transform(({ value }) => (value === undefined ? 1 : value))
  etapa_id?: number;

  @IsDateString()
  @IsOptional()
  fecha_subida?: string;

  @IsString()
  @IsOptional()
  asunto?: string;

  @IsString()
  @IsOptional()
  comentarios?: string;
}
