import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class EvaluarComiteDto {
  @IsIn(['aceptar', 'rechazar'])
  decision!: 'aceptar' | 'rechazar';

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  observacion?: string;
}
