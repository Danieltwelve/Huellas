import {
  IsArray,
  IsInt,
  IsPositive,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';

export class PublicarEdicionRevistaDto {
  @IsInt()
  @IsPositive()
  edicionId!: number;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @IsInt({ each: true })
  articuloIds!: number[];
}
