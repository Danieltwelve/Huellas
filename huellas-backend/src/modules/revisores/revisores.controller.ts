import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { RevisoresService } from './revisores.service';
import { CreateRevisoreDto } from './dto/create-revisore.dto';
import { UpdateRevisoreDto } from './dto/update-revisore.dto';

@Controller('revisores')
export class RevisoresController {
  constructor(private readonly revisoresService: RevisoresService) {}

  @Post()
  create(@Body() createRevisoreDto: CreateRevisoreDto) {
    return this.revisoresService.create(createRevisoreDto);
  }

  @Get()
  findAll() {
    return this.revisoresService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.revisoresService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateRevisoreDto: UpdateRevisoreDto,
  ) {
    return this.revisoresService.update(+id, updateRevisoreDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.revisoresService.remove(+id);
  }
}
