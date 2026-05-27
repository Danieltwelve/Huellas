import { Articulo } from 'src/modules/articulos/entities/articulo.entity';
import { User } from 'src/modules/users/user.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('revisores')
export class Revisores {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'usuario_id' })
  usuarioId!: number;

  @Column({ name: 'perfil', type: 'text' })
  perfil!: string;

  @Column({ name: 'carga_actual', type: 'int' })
  cargaActual!: number;

  @Column({ name: 'institucion', type: 'varchar' })
  institucion!: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'usuario_id' })
  usuario!: User;

  @OneToMany(() => Articulo, (articulo) => articulo.revisor)
  articulos!: Articulo[];
}
