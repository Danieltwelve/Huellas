import { Articulo } from 'src/modules/articulos/entities/articulo.entity';
import { Observacion } from 'src/modules/observaciones/entities/observacione.entity';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

@Entity('etapas_articulo')
export class EtapaArticulo {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 255 })
  nombre!: string;

  @Column({ type: 'text' })
  descripcion!: string;

  @OneToMany(() => Articulo, (articulo) => articulo.etapaActual)
  articulos!: Articulo[];

  @OneToMany(() => Observacion, (obs) => obs.etapa)
  observaciones!: Observacion[];
}
