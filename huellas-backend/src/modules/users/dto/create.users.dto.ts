import { IsString, IsEmail, IsBoolean, IsOptional } from 'class-validator';

export class CreateUserDto {
  @IsString()
  nombre!: string;

  @IsString()
  apellido!: string;

  @IsEmail()
  correo!: string;

  @IsBoolean()
  @IsOptional()
  estado_cuenta?: boolean;

  @IsBoolean()
  @IsOptional()
  correo_verificado?: boolean;
}
