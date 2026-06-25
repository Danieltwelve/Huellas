import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateCertificadoDto {
  @IsString()
  @IsOptional()
  @IsIn(['evaluacion', 'publicacion', 'aceptacion', 'envio', 'revision', 'otro'])
  tipo?: 'evaluacion' | 'publicacion' | 'aceptacion' | 'envio' | 'revision' | 'otro';

  @IsString()
  @IsOptional()
  @MaxLength(180)
  titulo?: string;

  @IsString()
  @IsOptional()
  @IsIn(['autor', 'comite-editorial', 'editorial', 'revisor'])
  contextoRequerimiento?: 'autor' | 'comite-editorial' | 'editorial' | 'revisor';

  @IsString()
  @IsOptional()
  @MaxLength(120)
  etapaReferencia?: string;
}
