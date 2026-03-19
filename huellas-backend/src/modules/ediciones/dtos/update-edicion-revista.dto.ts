import {
  IsInt,
  IsString,
  IsOptional,
  Min,
  Max,
  IsPositive,
} from 'class-validator';

export class UpdateEdicionRevistaDto {
  @IsString()
  @IsOptional()
  titulo?: string;

  @IsInt()
  @IsPositive()
  @IsOptional()
  volumen?: number;

  @IsInt()
  @IsPositive()
  @IsOptional()
  numero?: number;

  @IsInt()
  @Min(1900)
  @Max(2100)
  @IsOptional()
  anio?: number;

  @IsInt()
  @IsPositive()
  @IsOptional()
  estado_id?: number;
}
