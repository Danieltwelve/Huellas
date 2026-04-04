import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

export const OBSERVACIONES_MAX_TOTAL_FILES_BYTES = 20 * 1024 * 1024;

@Injectable()
export class MaxTotalFilesSizePipe implements PipeTransform<
  Express.Multer.File[] | undefined
> {
  transform(files: Express.Multer.File[] | undefined) {
    if (!files?.length) {
      return files;
    }

    const totalBytes = files.reduce((sum, file) => sum + (file.size ?? 0), 0);

    if (totalBytes > OBSERVACIONES_MAX_TOTAL_FILES_BYTES) {
      throw new BadRequestException(
        'El total de archivos adjuntos no puede superar 20MB por peticion',
      );
    }

    return files;
  }
}
