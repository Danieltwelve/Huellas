import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { RequisitosRevistaService } from './requisitos-revista.service';
import { CreateRequisitosRevistaDto } from './dto/create-requisitos-revista.dto';
import { UpdateRequisitosRevistaDto } from './dto/update-requisitos-revista.dto';

@Controller('requisitos-revista')
export class RequisitosRevistaController {
  constructor(
    private readonly requisitosRevistaService: RequisitosRevistaService,
  ) {}

  @Post()
  create(@Body() createRequisitosRevistaDto: CreateRequisitosRevistaDto) {
    return this.requisitosRevistaService.create(createRequisitosRevistaDto);
  }

  @Get()
  findAll() {
    return this.requisitosRevistaService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.requisitosRevistaService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateRequisitosRevistaDto: UpdateRequisitosRevistaDto,
  ) {
    return this.requisitosRevistaService.update(
      +id,
      updateRequisitosRevistaDto,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.requisitosRevistaService.remove(+id);
  }
}
