import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { EstadoEdicionRevista } from './estados/estado-edicion-revista.entity';
import { Articulo } from '../articulos/entities/articulo.entity';

@Entity('ediciones_revista')
export class EdicionRevista {
  @PrimaryGeneratedColumn()
  id?: number;

  @Column({ type: 'varchar', length: 255 })
  titulo?: string;

  @Column({ type: 'int' })
  volumen?: number;

  @Column({ type: 'int' })
  numero?: number;

  @Column({ name: 'año', type: 'int' })
  anio?: number;

  @Column({ name: 'fecha_estado', type: 'date' })
  fecha_estado?: Date;

  @OneToMany(() => Articulo, (articulo) => articulo.edicion)
  articulos!: Articulo[];

  // Relación M:1 - Muchas ediciones tienen un solo estado
  @ManyToOne(() => EstadoEdicionRevista, (estado) => estado.ediciones, {
    nullable: false,
  })
  @JoinColumn({ name: 'estado_id' })
  estado_id?: EstadoEdicionRevista;
}
