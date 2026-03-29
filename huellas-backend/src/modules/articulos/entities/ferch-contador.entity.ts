import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('ferch_contador')
export class FerchContador {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'ultimo_numero', type: 'int' })
  ultimoNumero!: number;

  @Column({
    name: 'updated_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  updatedAt!: Date;
}
