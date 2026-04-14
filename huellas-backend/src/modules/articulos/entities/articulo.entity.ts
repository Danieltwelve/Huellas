import { ArticuloHistorialEtapa } from 'src/modules/articulos-historial-etapas/entities/articulos-historial-etapa.entity';
import { EdicionRevista } from 'src/modules/ediciones/edicion-revista.entity';
import { EtapaArticulo } from 'src/modules/etapas-articulo/entities/etapa_articulo.entity';
import { Observacion } from 'src/modules/observaciones/entities/observacione.entity';
import { Tema } from 'src/modules/temas/entities/tema.entity';
import { User } from 'src/modules/users/user.entity';
import {
  Column,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('articulos')
export class Articulo {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'codigo_numero', type: 'int' })
  codigoNumero!: number;

  @Column({ name: 'codigo', type: 'varchar' })
  codigo!: string;

  @Column({ type: 'varchar' })
  titulo!: string;

  @Column({ type: 'text' })
  resumen!: string;

  @Column({ name: 'palabras_clave', type: 'text' })
  palabrasClave!: string;

  @Column({ type: 'varchar', nullable: true })
  doi!: string;

  @Column({ type: 'varchar', nullable: true })
  issn!: string;

  @Column({ name: 'etapa_actual_id' })
  etapaActualId!: number;

  @Column({ name: 'edicion_id' })
  edicionId!: number;

  @Column({ name: 'comite_editorial_id', nullable: true })
  comiteEditorialId!: number | null;

  // Relaciones
  @ManyToOne(() => EtapaArticulo, (etapa) => etapa.articulos)
  @JoinColumn({ name: 'etapa_actual_id' })
  etapaActual!: EtapaArticulo;

  @ManyToOne(() => EdicionRevista, (edicion) => edicion.articulos)
  @JoinColumn({ name: 'edicion_id' })
  edicion!: EdicionRevista;

  @ManyToMany(() => Tema, (tema) => tema.articulos)
  @JoinTable({
    name: 'articulo_temas',
    joinColumn: {
      name: 'articulo_id',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'categoria_id',
      referencedColumnName: 'id',
    },
  })
  temas!: Tema[];

  @ManyToMany(() => User, (user) => user.articulos)
  @JoinTable({
    name: 'articulo_autores',
    joinColumn: {
      name: 'articulo_id',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'usuario_id',
      referencedColumnName: 'id',
    },
  })
  autores!: User[];

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'comite_editorial_id' })
  comiteEditorial!: User | null;

  @OneToMany(() => ArticuloHistorialEtapa, (historial) => historial.articulo)
  historialEtapas!: ArticuloHistorialEtapa[];

  @OneToMany(() => Observacion, (obs) => obs.articulo)
  observaciones!: Observacion[];
}
