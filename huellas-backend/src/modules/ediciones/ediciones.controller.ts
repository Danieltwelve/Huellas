import {
  BadRequestException,
  NotFoundException,
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
  Res,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
  Req,
} from '@nestjs/common';
import { CreateEdicionRevistaDto } from './dtos/create-edicion-revista.dto';
import { EdicionesService } from './ediciones.service';
import { Roles } from 'src/common/decorators/roles.decorator';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { UpdateEdicionRevistaDto } from './dtos/update-edicion-revista.dto';
import { PublicarEdicionRevistaDto } from './dtos/publicar-edicion-revista.dto';
import { FileInterceptor, FileFieldsInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, basename, join } from 'path';
import { promises as fs, existsSync, mkdirSync, createReadStream } from 'fs';

const portadaStorage = diskStorage({
  destination: './uploads/portadas',
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = extname(file.originalname);
    cb(null, `portada-${uniqueSuffix}${ext}`);
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
  @Roles('admin', 'director', 'monitor')
  @Post('publicar')
  @HttpCode(HttpStatus.CREATED)
  async publicar(@Body() body: PublicarEdicionRevistaDto) {
    return await this.edicionService.publicarEdicion(body);
  }

  @Delete(':id/with-message')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'director', 'monitor', 'comite-editorial')
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
  @Roles('admin', 'director', 'monitor')
  @Post('publicacion-rapida')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'portada', maxCount: 1 },
        { name: 'pdfCompleto', maxCount: 1 },
        { name: 'archivosArticulos', maxCount: 30 },
      ],
      {
        storage: diskStorage({
          destination: (req, file, cb) => {
            let dest = './uploads/ediciones/pdfs';
            if (file.fieldname === 'portada') {
              dest = './uploads/portadas';
            } else if (file.fieldname === 'archivosArticulos') {
              dest = './uploads/articulos';
            }
            if (!existsSync(dest)) {
              mkdirSync(dest, { recursive: true });
            }
            cb(null, dest);
          },
          filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
            const ext = extname(file.originalname).toLowerCase();
            cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
          },
        }),
      },
    ),
  )
  async publicacionRapida(
    @Body() body: any,
    @Req() req: any,
    @UploadedFiles()
    files: {
      portada?: Express.Multer.File[];
      pdfCompleto?: Express.Multer.File[];
      archivosArticulos?: Express.Multer.File[];
    },
  ) {
    if (!files.pdfCompleto || files.pdfCompleto.length === 0) {
      throw new BadRequestException('El PDF completo de la edición es obligatorio.');
    }
    if (!files.archivosArticulos || files.archivosArticulos.length < 10) {
      throw new BadRequestException('Se requieren al menos 10 artículos para la publicación.');
    }

    const titulo = body.titulo;
    const volumen = parseInt(body.volumen, 10);
    const numero = parseInt(body.numero, 10);
    const anio = parseInt(body.anio, 10);

    if (!titulo || isNaN(volumen) || isNaN(numero) || isNaN(anio)) {
      throw new BadRequestException('Los datos de la edición son inválidos.');
    }

    let articulosData: any[];
    try {
      articulosData = JSON.parse(body.articulos);
    } catch (e) {
      throw new BadRequestException('El formato de los artículos es inválido.');
    }

    if (!Array.isArray(articulosData) || articulosData.length < 10) {
      throw new BadRequestException('Se deben proporcionar al menos 10 artículos.');
    }

    if (articulosData.length !== files.archivosArticulos.length) {
      throw new BadRequestException('La cantidad de artículos y archivos de artículos no coincide.');
    }

    const user = req.user;
    if (!user || !user.userId) {
      throw new BadRequestException('No se pudo identificar al usuario que realiza la acción.');
    }

    return await this.edicionService.crearPublicacionRapida(
      {
        titulo,
        volumen,
        numero,
        anio,
        portadaPath: files.portada?.[0]?.path,
        pdfCompletoPath: files.pdfCompleto[0].path,
        articulos: articulosData,
        articuloFiles: files.archivosArticulos,
      },
      user.userId,
    );
  }

  @Get('pdf/:filename')
  async descargarPdf(
    @Param('filename') filename: string,
    @Res() res: any,
  ) {
    try {
      const safeName = basename(filename);
      const filePath = join(process.cwd(), 'uploads', 'ediciones', 'pdfs', safeName);
      if (!existsSync(filePath)) {
        throw new NotFoundException('Archivo no encontrado');
      }
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${safeName}"`);
      createReadStream(filePath).pipe(res);
    } catch (error) {
      res.status(HttpStatus.NOT_FOUND).json({ message: 'Archivo no encontrado' });
    }
  }
}
