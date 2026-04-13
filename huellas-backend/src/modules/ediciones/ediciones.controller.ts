import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { CreateEdicionRevistaDto } from './dtos/create-edicion-revista.dto';
import { EdicionesService } from './ediciones.service';
import { Roles } from 'src/common/decorators/roles.decorator';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { UpdateEdicionRevistaDto } from './dtos/update-edicion-revista.dto';

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

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'director', 'monitor', 'comite-editorial')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createEdicionDto: CreateEdicionRevistaDto) {
    const nuevaEdicion = await this.edicionService.create(createEdicionDto);

    return {
      message: 'Edición creada exitosamente',
      data: nuevaEdicion,
    };
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'director', 'monitor', 'comite-editorial')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateEdicionRevistaDto,
  ) {
    const edicionActualizada = await this.edicionService.update(id, updateDto);
    return {
      message: 'Edición actualizada exitosamente',
      data: edicionActualizada,
    };
  }

  @Get(':id/conteo-articulos')
  async getConteoArticulos(@Param('id', ParseIntPipe) id: number) {
    const data = await this.edicionService.getConteoArticulos(id);
    return {
      message: 'Conteo de artículos calculado correctamente',
      data,
    };
  }
}
