import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class GenerarPuntajeDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  articuloId!: number;
}
