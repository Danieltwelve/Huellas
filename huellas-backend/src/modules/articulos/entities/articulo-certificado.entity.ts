import { Articulo } from './articulo.entity';
import { User } from '../../users/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('articulo_certificados')
export class ArticuloCertificado {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'articulo_id', type: 'int' })
  articuloId!: number;

  @Column({ name: 'subido_por_id', type: 'int' })
  subidoPorId!: number;

  @Column({ name: 'tipo', type: 'varchar', length: 40 })
  tipo!: string;

  @Column({ name: 'titulo', type: 'varchar', length: 180 })
  titulo!: string;

  @Column({
    name: 'contexto_requerimiento',
    type: 'varchar',
    length: 40,
    default: 'editorial',
  })
  contextoRequerimiento!: 'autor' | 'comite-editorial' | 'editorial' | 'revisor';

  @Column({ name: 'etapa_referencia', type: 'varchar', length: 120, nullable: true })
  etapaReferencia!: string | null;

  @Column({ name: 'archivo_path', type: 'varchar' })
  archivoPath!: string;

  @Column({ name: 'archivo_nombre_original', type: 'varchar' })
  archivoNombreOriginal!: string;

  @CreateDateColumn({ name: 'fecha_subida' })
  fechaSubida!: Date;

  @ManyToOne(() => Articulo, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'articulo_id' })
  articulo!: Articulo;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'subido_por_id' })
  subidoPor!: User;
}
