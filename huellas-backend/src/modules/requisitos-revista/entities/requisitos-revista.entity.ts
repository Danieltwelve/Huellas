import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('requisitos_revista')
export class RequisitoRevista {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'text' })
  requisito!: string;
}
