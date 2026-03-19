/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Transform } from '@nestjs/class-transformer';
import {
  IsInt,
  IsPositive,
  IsOptional,
  IsDateString,
  IsNotEmpty,
  Min,
} from 'class-validator';

export class CreateHistorialDto {
  @IsInt()
  @IsPositive()
  @IsNotEmpty()
  articulo_id?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  @Transform(({ value }) => (value === undefined ? 1 : value))
  etapa_id?: number;

  @IsDateString()
  @IsNotEmpty()
  fecha_inicio?: string;

  @IsInt()
  @IsPositive()
  @IsOptional()
  usuario_id?: number;
}
