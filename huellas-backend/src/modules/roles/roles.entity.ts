import { Column, Entity, ManyToMany, PrimaryGeneratedColumn } from 'typeorm';
import { User } from '../users/user.entity';

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar' })
  rol!: string;

  @ManyToMany(() => User, (user) => user.roles)
  usuarios!: User[];
}
