/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common';
import { CreateArticuloCompletoDto } from '../dto/create-articulo-completo.dto';

interface RawArticuloInput {
  titulo?: string;
  resumen?: string;
  asunto?: string;
  comentarios?: string;
  tema_id?: string | number;
  palabras_clave?: string | string[];
  usuarios_ids?: string | number[];
}

@Injectable()
export class ParseArticuloDataPipe implements PipeTransform {
  transform(
    value: RawArticuloInput,
    _metadata: ArgumentMetadata,
  ): CreateArticuloCompletoDto {
    if (!value) return value as any;

    const dto = new CreateArticuloCompletoDto();

    dto.titulo = value.titulo ?? '';
    dto.resumen = value.resumen ?? '';
    dto.asunto = value.asunto ?? '';
    dto.comentarios = value.comentarios ?? '';

    if (value.tema_id !== undefined) {
      dto.tema_id = Number(value.tema_id);
      if (isNaN(dto.tema_id)) {
        throw new BadRequestException('El tema_id debe ser un número válido');
      }
    }

    if (value.palabras_clave) {
      dto.palabras_clave =
        typeof value.palabras_clave === 'string'
          ? value.palabras_clave
              .split(',')
              .map((s) => s.trim())
              .filter((s) => s !== '')
          : value.palabras_clave;
    }

    if (value.usuarios_ids !== undefined && value.usuarios_ids !== '') {
      const ids =
        typeof value.usuarios_ids === 'string'
          ? value.usuarios_ids.split(',').map((id) => Number(id.trim()))
          : value.usuarios_ids;

      if (Array.isArray(ids) && ids.some((id) => isNaN(id))) {
        throw new BadRequestException(
          'Los usuarios_ids deben ser números válidos',
        );
      }
      dto.usuarios_ids = ids;
    }

    return dto;
  }
}
