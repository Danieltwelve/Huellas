import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class UploadCertificadoDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['evaluacion', 'publicacion', 'aceptacion', 'envio', 'revision', 'otro'])
  tipo!: 'evaluacion' | 'publicacion' | 'aceptacion' | 'envio' | 'revision' | 'otro';

  @IsString()
  @IsOptional()
  @MaxLength(180)
  titulo?: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(['autor', 'comite-editorial', 'editorial'])
  contextoRequerimiento!: 'autor' | 'comite-editorial' | 'editorial';

  @IsString()
  @IsOptional()
  @MaxLength(120)
  etapaReferencia?: string;
}
