import { IsNotEmpty, IsString, IsDateString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAvisoDto {
  @ApiProperty({ example: 'info' })
  @IsNotEmpty()
  @IsString()
  @Length(1, 50)
  tipo!: string;

  @ApiProperty({ example: 'Nueva funcionalidad' })
  @IsNotEmpty()
  @IsString()
  @Length(1, 255)
  titulo!: string;

  @ApiProperty({ example: 'Descripción del aviso...' })
  @IsNotEmpty()
  @IsString()
  mensaje!: string;

  @ApiProperty({ example: '2025-03-20T10:30:00.000Z' })
  @IsNotEmpty()
  @IsDateString()
  fecha!: string;
}
