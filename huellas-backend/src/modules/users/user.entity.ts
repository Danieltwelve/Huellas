import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

export enum UserRole {
  ADMIN = 'admin',
  EDITOR = 'editor',
  AUTHOR = 'author',
  REVIEWER = 'reviewer',
  USER = 'user',
}

@Entity('users')
export class User {
  @ApiProperty({
    description: 'Unique identifier',
    example: 1,
  })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({
    description: 'User email',
    example: 'user@example.com',
  })
  @Column({ unique: true, type: 'varchar', length: 255 })
  email: string;

  @ApiProperty({
    description: 'User password hash',
  })
  @Column({ type: 'varchar', length: 255 })
  password: string;

  @ApiProperty({
    description: 'First name',
    example: 'Juan',
  })
  @Column({ type: 'varchar', length: 100, nullable: true })
  firstName: string;

  @ApiProperty({
    description: 'Last name',
    example: 'Pérez',
  })
  @Column({ type: 'varchar', length: 100, nullable: true })
  lastName: string;

  @ApiProperty({
    description: 'User roles stored as JSONB',
    example: ['user', 'author'],
    isArray: true,
  })
  @Column({
    type: 'jsonb',
    default: [UserRole.USER],
    array: false,
  })
  roles: UserRole[];

  @ApiProperty({
    description: 'User is active',
    example: true,
  })
  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @ApiProperty({
    description: 'Email verified',
    example: false,
  })
  @Column({ type: 'boolean', default: false })
  emailVerified: boolean;

  @ApiProperty({
    description: 'User profile as JSONB',
    example: { bio: 'My bio', avatar: 'url' },
  })
  @Column({
    type: 'jsonb',
    nullable: true,
  })
  profile: Record<string, any>;

  @ApiProperty({
    description: 'Account created date',
  })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({
    description: 'Account last updated date',
  })
  @UpdateDateColumn()
  updatedAt: Date;
}
