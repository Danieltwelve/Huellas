/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ArticulosService } from './articulos.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { extname } from 'path';
import { CreateArticuloCompletoDto } from './dto/create-articulo-completo.dto';
import { diskStorage } from 'multer';
import { validateOrReject, ValidationError } from 'class-validator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';

@Controller('articulos')
export class ArticulosController {
  constructor(private readonly articulosService: ArticulosService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('resumen')
  async getResumenArticulos() {
    return await this.articulosService.getResumenArticulos();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('envio')
  @UseInterceptors(
    FileInterceptor('archivo', {
      storage: diskStorage({
        destination: './uploads/articulos',
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `${uniqueSuffix}${ext}`);
        },
      }),
    }),
  )
  async crearEnvio(
    @Body() body: any,
    @UploadedFile() archivo: Express.Multer.File,
  ) {
    if (!archivo) {
      throw new BadRequestException(
        'Es obligatorio adjuntar el archivo del artículo',
      );
    }

    const dto = new CreateArticuloCompletoDto();
    dto.titulo = body.titulo;
    dto.resumen = body.resumen;
    dto.asunto = body.asunto;
    dto.comentarios = body.comentarios;

    dto.tema_id = Number(body.tema_id);

    dto.palabras_clave =
      typeof body.palabras_clave === 'string'
        ? body.palabras_clave.split(',').map((s) => s.trim())
        : body.palabras_clave;

    if (body.usuarios_ids !== undefined && body.usuarios_ids !== '') {
      dto.usuarios_ids =
        typeof body.usuarios_ids === 'string'
          ? body.usuarios_ids.split(',').map((id) => Number(id.trim()))
          : body.usuarios_ids;

      if (dto.usuarios_ids.some((id) => isNaN(id))) {
        throw new BadRequestException(
          'Los usuarios_ids deben ser números válidos',
        );
      }
    }

    try {
      await validateOrReject(dto);
    } catch (errors) {
      const validationErrors = errors as ValidationError[];
      throw new BadRequestException({
        message: 'Error en la validación de los datos',
        errors: validationErrors.map((err) => err.constraints),
      });
    }

    const usuarioEmisorId = dto.usuarios_ids[0];

    return await this.articulosService.crearEnvioArticulo(
      dto,
      archivo.path,
      usuarioEmisorId,
    );
  }
}
