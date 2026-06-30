import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { RequisitosRevistaService } from './requisitos-revista.service';
import { CreateRequisitosRevistaDto } from './dto/create-requisitos-revista.dto';
import { UpdateRequisitosRevistaDto } from './dto/update-requisitos-revista.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';

@Controller('requisitos-revista')
export class RequisitosRevistaController {
  constructor(
    private readonly requisitosRevistaService: RequisitosRevistaService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'comite-editorial')
  create(@Body() createRequisitosRevistaDto: CreateRequisitosRevistaDto) {
    return this.requisitosRevistaService.create(createRequisitosRevistaDto);
  }

  @Get()
  findAll(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.requisitosRevistaService.findAll(page, limit);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.requisitosRevistaService.findOne(+id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'comite-editorial')
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'comite-editorial')
  remove(@Param('id') id: string) {
    return this.requisitosRevistaService.remove(+id);
  }
}
