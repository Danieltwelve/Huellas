import { IsOptional, IsString, MaxLength } from 'class-validator';

export class AceptarCorreccionDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comentarios?: string;
}