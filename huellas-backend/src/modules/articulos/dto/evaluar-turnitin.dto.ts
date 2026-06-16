import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class EvaluarTurnitinDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  porcentaje!: number;

  @IsString()
  @IsOptional()
  observacion?: string;

  @IsString()
  @IsOptional()
  decision?: string;
}
