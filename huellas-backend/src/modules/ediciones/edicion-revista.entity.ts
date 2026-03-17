import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { EstadoEdicionRevista } from './estados/estado-edicion-revista.entity';

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
  fechaEstado?: Date;

  // Relación M:1 - Muchas ediciones tienen un solo estado
  @ManyToOne(() => EstadoEdicionRevista, (estado) => estado.ediciones, {
    nullable: false,
  })
  @JoinColumn({ name: 'estado_id' })
  estado?: EstadoEdicionRevista;
}
