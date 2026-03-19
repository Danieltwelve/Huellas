import { Articulo } from 'src/modules/articulos/entities/articulo.entity';
import { EtapaArticulo } from 'src/modules/etapas-articulo/entities/etapa_articulo.entity';
import { ObservacionArchivo } from 'src/modules/observaciones-archivos/entities/observaciones-archivo.entity';
import { User } from 'src/modules/users/user.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity('observaciones')
export class Observacion {
  @PrimaryGeneratedColumn()
  id!: number;

  // Claves foráneas explícitas
  @Column({ name: 'articulo_id' })
  articuloId!: number;

  @Column({ name: 'usuario_id', nullable: true })
  usuarioId!: number;

  @Column({ name: 'etapa_id' })
  etapaId!: number;

  // Fecha de subida con valor por defecto automático
  @CreateDateColumn({ name: 'fecha_subida', type: 'timestamp' })
  fechaSubida!: Date;

  @Column({ type: 'text', nullable: true })
  asunto!: string;

  @Column({ type: 'text', nullable: true })
  comentarios!: string;

  // Relaciones
  @ManyToOne(() => Articulo, (articulo) => articulo.observaciones)
  @JoinColumn({ name: 'articulo_id' })
  articulo!: Articulo;

  @ManyToOne(() => User, (user) => user.observaciones)
  @JoinColumn({ name: 'usuario_id' })
  usuario!: User;

  @ManyToOne(() => EtapaArticulo, (etapa) => etapa.observaciones)
  @JoinColumn({ name: 'etapa_id' })
  etapa!: EtapaArticulo;

  @OneToMany(() => ObservacionArchivo, (archivo) => archivo.observacion)
  archivos!: ObservacionArchivo[];
}
