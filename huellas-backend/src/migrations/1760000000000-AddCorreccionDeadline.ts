import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCorreccionDeadline1760000000000 implements MigrationInterface {
  name = 'AddCorreccionDeadline1760000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "articulos" ADD COLUMN "fecha_vencimiento_correccion" timestamp`,
    );
    await queryRunner.query(
      `ALTER TABLE "articulos" ADD COLUMN "solicitud_prorroga_correccion_pendiente" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "articulos" DROP COLUMN "solicitud_prorroga_correccion_pendiente"`,
    );
    await queryRunner.query(
      `ALTER TABLE "articulos" DROP COLUMN "fecha_vencimiento_correccion"`,
    );
  }
}
