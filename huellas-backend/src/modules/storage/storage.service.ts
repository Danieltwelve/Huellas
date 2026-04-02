/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable, Logger } from '@nestjs/common';
import { promises as fs } from 'fs';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  async eliminarArchivo(ruta: string): Promise<boolean> {
    if (!ruta) return false;

    try {
      await fs.unlink(ruta);
      this.logger.log(`Archivo eliminado con éxito: ${ruta}`);
      return true;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        this.logger.warn(
          `Se intentó borrar un archivo inexistente (ignorado): ${ruta}`,
        );
        return true;
      }

      this.logger.error(
        `Fallo crítico al borrar el archivo en ${ruta}`,
        error.stack,
      );
      return false;
    }
  }
}
