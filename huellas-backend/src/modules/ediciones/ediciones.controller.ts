import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Req,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { CreateEdicionRevistaDto } from './dtos/create-edicion-revista.dto';
import { EdicionesService } from './ediciones.service';
import { Roles } from 'src/common/decorators/roles.decorator';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { UpdateEdicionRevistaDto } from './dtos/update-edicion-revista.dto';
import { PublicarEdicionRevistaDto } from './dtos/publicar-edicion-revista.dto';
import { FileFieldsInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { existsSync, mkdirSync, promises as fs } from 'fs';

const portadaStorage = diskStorage({
  destination: './uploads/portadas',
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = extname(file.originalname);
    cb(null, `portada-${uniqueSuffix}${ext}`);
  },
});

const rapidaStorage = diskStorage({
  destination: (req, file, cb) => {
    let dest = './uploads/observaciones-archivos';
    if (file.fieldname === 'portada') {
      dest = './uploads/portadas';
    } else if (file.fieldname === 'pdfCompleto') {
      dest = './uploads/ediciones-pdf';
    }
    if (!existsSync(dest)) {
      mkdirSync(dest, { recursive: true });
    }
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = extname(file.originalname).toLowerCase();
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

@Controller('ediciones')
export class EdicionesController {
  constructor(private readonly edicionService: EdicionesService) {}

  @Get()
  async findAll() {
    const ediciones = await this.edicionService.findAll();
    return {
      message: 'Listado de ediciones obtenido exitosamente',
      data: ediciones,
    };
  }

  @Get('publicadas')
  async findPublicadas() {
    const ediciones = await this.edicionService.findPublicadas();
    return {
      message: 'Listado de ediciones publicadas obtenido exitosamente',
      data: ediciones,
    };
  }

  @Post()
  @UseInterceptors(FileInterceptor('portada', { storage: portadaStorage }))
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createEdicionDto: CreateEdicionRevistaDto,
    @UploadedFile() portada?: Express.Multer.File,
  ) {
    let portadaPath: string | undefined;

    try {
      if (portada) {
        portadaPath = portada.path;
        createEdicionDto.portada = portadaPath;
      }
      const nuevaEdicion = await this.edicionService.create(createEdicionDto);
      return {
        message: 'Edición creada exitosamente',
        data: nuevaEdicion,
      };
    } catch (error) {
      if (portadaPath) {
        try {
          await fs.unlink(portadaPath);
        } catch (unlinkErr) {
          console.error(
            'No se pudo eliminar archivo huérfano:',
            portadaPath,
            unlinkErr,
          );
        }
      }
      throw error;
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('publicar')
  @HttpCode(HttpStatus.CREATED)
  async publicar(@Body() body: PublicarEdicionRevistaDto) {
    return await this.edicionService.publicarEdicion(body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'comite-editorial')
  @Post('publicacion-rapida')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'portada', maxCount: 1 },
        { name: 'pdfCompleto', maxCount: 1 },
        { name: 'archivosArticulos', maxCount: 50 },
      ],
      { storage: rapidaStorage },
    ),
  )
  async publicacionRapida(
    @Body() body: any,
    @UploadedFiles()
    files: {
      portada?: Express.Multer.File[];
      pdfCompleto?: Express.Multer.File[];
      archivosArticulos?: Express.Multer.File[];
    },
    @Req() req: any,
  ) {
    const portadaFile = files?.portada?.[0];
    const pdfCompletoFile = files?.pdfCompleto?.[0];
    const articuloFiles = files?.archivosArticulos ?? [];

    if (!pdfCompletoFile) {
      throw new BadRequestException(
        'El archivo PDF completo de la edición es obligatorio.',
      );
    }

    let articulosParsed: any[] = [];
    if (typeof body.articulos === 'string') {
      try {
        articulosParsed = JSON.parse(body.articulos);
      } catch {
        throw new BadRequestException('El formato de los artículos es inválido.');
      }
    } else if (Array.isArray(body.articulos)) {
      articulosParsed = body.articulos;
    }

    if (articulosParsed.length < 10) {
      throw new BadRequestException('Se requieren al menos 10 artículos.');
    }

    if (articuloFiles.length !== articulosParsed.length) {
      throw new BadRequestException(
        `Debes subir el archivo correspondiente para cada uno de los ${articulosParsed.length} artículos.`,
      );
    }

    const dto = {
      titulo: body.titulo,
      volumen: Number(body.volumen),
      numero: Number(body.numero),
      anio: Number(body.anio),
      portadaPath: portadaFile ? portadaFile.path : undefined,
      pdfCompletoPath: pdfCompletoFile.path,
      articulos: articulosParsed,
      articuloFiles,
    };

    return await this.edicionService.crearPublicacionRapida(
      dto,
      req.user.userId,
    );
  }

  @Delete(':id/with-message')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'comite-editorial')
  async removeWithMessage(@Param('id', ParseIntPipe) id: number) {
    await this.edicionService.remove(id);
    return {
      message: `Edición con ID ${id} eliminada exitosamente`,
    };
  }

  @Put(':id')
  @UseInterceptors(FileInterceptor('portada', { storage: portadaStorage }))
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateEdicionRevistaDto,
    @UploadedFile() portada?: Express.Multer.File,
  ) {
    let nuevaPortadaPath: string | undefined;

    try {
      if (portada) {
        nuevaPortadaPath = portada.path;
        updateDto.portada = nuevaPortadaPath;
      }
      const edicionActualizada = await this.edicionService.update(
        id,
        updateDto,
      );
      return {
        message: 'Edición actualizada exitosamente',
        data: edicionActualizada,
      };
    } catch (error) {
      if (nuevaPortadaPath) {
        try {
          await fs.unlink(nuevaPortadaPath);
        } catch (unlinkErr) {
          console.error(
            'No se pudo eliminar portada temporal:',
            nuevaPortadaPath,
            unlinkErr,
          );
        }
      }
      throw error;
    }
  }

  @Get(':id/conteo-articulos')
  async getConteoArticulos(@Param('id', ParseIntPipe) id: number) {
    const data = await this.edicionService.getConteoArticulos(id);
    return {
      message: 'Conteo de artículos calculado correctamente',
      data,
    };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Patch(':id/unpublish')
  async unpublish(@Param('id', ParseIntPipe) id: number) {
    return await this.edicionService.unpublishEdicion(id);
  }
}

