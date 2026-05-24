import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEstadoCorreccion1683700000000 implements MigrationInterface {
  name = 'AddEstadoCorreccion1683700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "observaciones" ADD COLUMN "estado_correccion" character varying(32)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "observaciones" DROP COLUMN "estado_correccion"`,
    );
  }
}
