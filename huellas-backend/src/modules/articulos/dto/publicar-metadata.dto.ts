import { IsInt, IsOptional, IsString, IsBoolean } from 'class-validator';

export class PublicarMetadataDto {
  @IsInt()
  edicionId!: number;

  @IsString()
  @IsOptional()
  doi?: string;

  @IsString()
  @IsOptional()
  issn?: string;

  @IsString()
  @IsOptional()
  paginas?: string;

  @IsBoolean()
  @IsOptional()
  publicar?: boolean;
}
