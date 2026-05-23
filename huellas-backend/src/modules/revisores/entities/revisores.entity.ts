import { Articulo } from 'src/modules/articulos/entities/articulo.entity';
import { User } from 'src/modules/users/user.entity';
import {
  Column,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
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

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'usuario_id' })
  usuario!: User;

  @ManyToMany(() => Articulo, (articulo) => articulo.revisores)
  @JoinTable({
    name: 'articulos_revisores', // Nombre de la tabla intermedia
    joinColumn: {
      name: 'revisor_id',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'articulo_id',
      referencedColumnName: 'id',
    },
  })
  articulos!: Articulo[];
}
