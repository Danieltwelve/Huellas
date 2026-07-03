import {
  IsInt,
  IsString,
  Min,
  Max,
  IsDateString,
  IsNotEmpty,
  IsOptional,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateEdicionRevistaDto {
  @IsString()
  @IsNotEmpty({ message: 'El título es obligatorio' })
  titulo?: string;

  @Transform(({ value }) => (value !== undefined && value !== null ? Number(value) : value))
  @IsInt()
  @Min(1, { message: 'El volumen debe ser un número positivo' })
  volumen?: number;

  @Transform(({ value }) => (value !== undefined && value !== null ? Number(value) : value))
  @IsInt()
  @Min(1, { message: 'El número debe ser un número positivo' })
  numero?: number;

  @Transform(({ value }) => (value !== undefined && value !== null ? Number(value) : value))
  @IsInt()
  @Min(1900, { message: 'El año debe ser mayor o igual a 1900' })
  @Max(2100, { message: 'El año debe ser menor o igual a 2100' })
  anio?: number;

  @IsDateString(
    {},
    {
      message:
        'La fecha de estado debe tener un formato ISO válido (YYYY-MM-DD)',
    },
  )
  @IsOptional()
  @IsString()
  portada?: string;
}
