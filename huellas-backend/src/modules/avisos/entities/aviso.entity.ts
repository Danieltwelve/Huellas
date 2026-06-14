import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('avisos')
export class Aviso {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 50, nullable: false })
  tipo!: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  titulo!: string;

  @Column({ type: 'text', nullable: false })
  mensaje!: string;

  @Column({ type: 'date', nullable: false })
  fecha!: string;
}
