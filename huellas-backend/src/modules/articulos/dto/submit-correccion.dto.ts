import { IsOptional, IsString, MaxLength } from 'class-validator';

export class SubmitCorreccionDto {
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  comentarios?: string;
}
