import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class EvaluarTurnitinDto {
  @IsNumber()
  @Min(0)
  @Max(100)
  porcentaje!: number;

  @IsString()
  @IsOptional()
  observacion?: string;
}