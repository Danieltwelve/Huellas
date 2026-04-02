import { IsInt, IsOptional, IsString, Min, MaxLength } from 'class-validator';

export class AddObservacionDto {
  @IsString()
  @MaxLength(255)
  asunto!: string;

  @IsString()
  @IsOptional()
  comentarios?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  etapaId?: number;
}
