import { IsEmail, IsString } from 'class-validator';

export class EmailStatusDto {
  @IsString()
  @IsEmail()
  email!: string;
}

export class EmailStatusResponseDto {
  exists!: boolean;
  emailVerified!: boolean;
}
