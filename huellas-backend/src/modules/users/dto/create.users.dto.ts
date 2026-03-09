import { IsString, IsEmail, IsBoolean, IsOptional } from 'class-validator';

export class CreateUserDto {
  @IsString()
  nombre!: string;

  @IsEmail()
  correo!: string;

  @IsBoolean()
  @IsOptional()
  estado_cuenta?: boolean;
}
