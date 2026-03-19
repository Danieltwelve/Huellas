import { Articulo } from 'src/modules/articulos/entities/articulo.entity';
import { EtapaArticulo } from 'src/modules/etapas-articulo/entities/etapa_articulo.entity';
import { User } from 'src/modules/users/user.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

@Entity('articulos_historial_etapas')
export class ArticuloHistorialEtapa {
  @PrimaryGeneratedColumn()
  id!: number;

  // Claves foráneas explícitas (útiles para inserciones/actualizaciones)
  @Column({ name: 'articulo_id' })
  articuloId!: number;

  @Column({ name: 'etapa_id' })
  etapaId!: number;

  @Column({ name: 'fecha_inicio', type: 'timestamp' })
  fechaInicio!: Date;

  @Column({ name: 'fecha_fin', type: 'timestamp', nullable: true })
  fechaFin!: Date;

  @Column({ name: 'usuario_id', nullable: true })
  usuarioId!: number;

  // Relaciones ManyToOne
  @ManyToOne(() => Articulo, (articulo) => articulo.historialEtapas)
  @JoinColumn({ name: 'articulo_id' })
  articulo!: Articulo;

  @ManyToOne(() => EtapaArticulo)
  @JoinColumn({ name: 'etapa_id' })
  etapa!: EtapaArticulo;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'usuario_id' })
  usuario!: User;
}
