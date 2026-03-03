import { IsString } from 'class-validator';

export class CreateRoleDto {
  @IsString()
  rol!: string;
}
