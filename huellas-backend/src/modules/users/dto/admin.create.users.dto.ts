import {
  IsEmail,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class AdminCreateUserDto {
  @IsString()
  nombre!: string;

  @IsEmail()
  correo!: string;

  @IsString()
  @MinLength(6)
  contraseña!: string;

  @IsString()
  @IsOptional()
  telefono?: string;

  @IsNumber()
  rolId!: number;
}
