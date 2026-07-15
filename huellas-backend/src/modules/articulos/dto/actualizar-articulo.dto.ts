import { IsOptional, IsString, MinLength } from 'class-validator';

export class ActualizarArticuloDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  codigo?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  titulo?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  resumen?: string;

  @IsOptional()
  @IsString()
  palabrasClave?: string;
}
