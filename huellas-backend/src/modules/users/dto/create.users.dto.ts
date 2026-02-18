/* eslint-disable @typescript-eslint/no-unsafe-call */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MinLength,
  IsArray,
} from 'class-validator';
import { UserRole } from '../user.entity';

export class CreateUserDto {
  @ApiProperty({
    description: 'User email',
    example: 'user@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email?: string;

  @ApiProperty({
    description: 'User password',
    minLength: 6,
    example: 'strongPassword123',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password?: string;

  @ApiPropertyOptional({
    description: 'First name',
    example: 'Juan',
  })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiPropertyOptional({
    description: 'Last name',
    example: 'Pérez',
  })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiPropertyOptional({
    description: 'User roles',
    enum: UserRole,
    isArray: true,
    example: [UserRole.USER],
  })
  @IsOptional()
  @IsArray()
  @IsEnum(UserRole, { each: true, message: 'Invalid role value' })
  roles?: UserRole[];

  @ApiPropertyOptional({
    description: 'User profile data',
    example: { bio: 'Hello world', website: 'https://...' },
  })
  @IsOptional()
  @IsObject()
  profile?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Set user as active explicitly',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
