import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class PublicarEdicionRevistaDto {
  @IsString()
  @IsNotEmpty()
  titulo!: string;

  @IsInt()
  @Min(1)
  volumen!: number;

  @IsInt()
  @Min(1)
  numero!: number;

  @IsInt()
  @Min(1900)
  @Max(2100)
  anio!: number;

  @IsOptional()
  @IsString()
  fechaEstado?: string;

  @IsArray()
  @ArrayMinSize(10)
  @ArrayMaxSize(10)
  @IsInt({ each: true })
  articuloIds!: number[];
}
