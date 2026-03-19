import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { EdicionRevista } from '../edicion-revista.entity';

@Entity('estados_edicion_revista')
export class EstadoEdicionRevista {
  @PrimaryGeneratedColumn()
  id?: number;

  @Column({ type: 'varchar', length: 100 })
  estado?: string;

  // Relación 1:M - Un estado puede estar en muchas ediciones
  @OneToMany(() => EdicionRevista, (edicion) => edicion.estado_id)
  ediciones?: EdicionRevista[];
}
