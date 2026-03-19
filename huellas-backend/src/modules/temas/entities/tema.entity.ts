import { Articulo } from 'src/modules/articulos/entities/articulo.entity';
import { Entity, PrimaryGeneratedColumn, Column, ManyToMany } from 'typeorm';

@Entity('temas')
export class Tema {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar' })
  nombre!: string;

  @Column({ type: 'text', nullable: true })
  descripcion!: string;

  // Relación inversa ManyToMany
  @ManyToMany(() => Articulo, (articulo) => articulo.temas)
  articulos!: Articulo[];
}
