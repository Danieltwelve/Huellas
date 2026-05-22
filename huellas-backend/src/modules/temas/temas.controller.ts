import { Controller, Get } from '@nestjs/common';
import { TemasService } from './temas.service';
import { Tema } from './entities/tema.entity';

@Controller('temas')
export class TemasController {
  constructor(private readonly temasService: TemasService) {}

  @Get()
  async findAll(): Promise<Tema[]> {
    return this.temasService.findAll();
  }
}
