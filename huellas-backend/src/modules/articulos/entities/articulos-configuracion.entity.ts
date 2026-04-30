import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('articulos_configuracion')
export class ArticulosConfiguracion {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index({ unique: true })
  @Column({ name: 'clave', type: 'varchar', length: 120 })
  clave!: string;

  @Column({ name: 'valor_booleano', type: 'boolean', default: true })
  valorBooleano!: boolean;

  @Column({
    name: 'updated_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  updatedAt!: Date;
}