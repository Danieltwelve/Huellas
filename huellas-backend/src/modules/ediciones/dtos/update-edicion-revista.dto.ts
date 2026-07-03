import {
  IsInt,
  IsString,
  IsOptional,
  Min,
  Max,
  IsPositive,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateEdicionRevistaDto {
  @IsString()
  @IsOptional()
  titulo?: string;

  @Transform(({ value }) => (value !== undefined && value !== null ? Number(value) : value))
  @IsInt()
  @IsPositive()
  @IsOptional()
  volumen?: number;

  @Transform(({ value }) => (value !== undefined && value !== null ? Number(value) : value))
  @IsInt()
  @IsPositive()
  @IsOptional()
  numero?: number;

  @Transform(({ value }) => (value !== undefined && value !== null ? Number(value) : value))
  @IsInt()
  @Min(1900)
  @Max(2100)
  @IsOptional()
  anio?: number;

  @Transform(({ value }) => (value !== undefined && value !== null ? Number(value) : value))
  @IsInt()
  @IsPositive()
  @IsOptional()
  estado_id?: number;

  @IsOptional()
  @IsString()
  portada?: string;
}
