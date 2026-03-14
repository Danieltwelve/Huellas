import { IsString, IsEmail, IsBoolean, IsOptional } from 'class-validator';

export class CreateUserDto {
  @IsString()
  nombre!: string;

  @IsEmail()
  correo!: string;

  @IsString()
  @IsOptional()
  telefono?: string;

  @IsBoolean()
  @IsOptional()
  correo_verificado?: boolean;

  @IsBoolean()
  @IsOptional()
  estado_cuenta?: boolean;
}
