import { Observacion } from 'src/modules/observaciones/entities/observacione.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

@Entity('observaciones_archivos')
export class ObservacionArchivo {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'observaciones_id' })
  observacionesId!: number;

  @Column({ name: 'archivo_path', length: 500 })
  archivoPath!: string;

  @ManyToOne(() => Observacion, (observacion) => observacion.archivos)
  @JoinColumn({ name: 'observaciones_id' })
  observacion!: Observacion;
}
