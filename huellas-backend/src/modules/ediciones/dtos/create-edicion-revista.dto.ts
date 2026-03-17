import {
  IsInt,
  IsString,
  Min,
  Max,
  IsDateString,
  IsNotEmpty,
} from 'class-validator';

export class CreateEdicionRevistaDto {
  @IsString()
  @IsNotEmpty({ message: 'El título es obligatorio' })
  titulo?: string;

  @IsInt()
  @Min(1, { message: 'El volumen debe ser un número positivo' })
  volumen?: number;

  @IsInt()
  @Min(1, { message: 'El número debe ser un número positivo' })
  numero?: number;

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
  fechaEstado?: string;
}
