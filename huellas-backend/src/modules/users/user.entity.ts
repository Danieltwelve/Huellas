import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Role } from '../roles/roles.entity';

@Entity('usuarios')
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar' })
  nombre!: string;

  @Column({ type: 'varchar', unique: true })
  correo!: string;

  @Column({ type: 'varchar', nullable: true })
  telefono!: string;

  @Column({ type: 'boolean', default: true })
  estado_cuenta!: boolean;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at!: Date;

  @CreateDateColumn({ name: 'created_at' })
  created_at!: Date;

  @ManyToMany(() => Role, (role) => role.usuarios, { cascade: true })
  @JoinTable({
    name: 'rol_usuarios',
    joinColumn: { name: 'usuario_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'rol_id', referencedColumnName: 'id' },
  })
  roles!: Role[];
}
