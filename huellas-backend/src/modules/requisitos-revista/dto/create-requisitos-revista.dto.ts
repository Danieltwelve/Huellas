import { IsNotEmpty, IsString } from 'class-validator';

export class CreateRequisitosRevistaDto {
  @IsString()
  @IsNotEmpty({ message: 'El requisito no puede estar vacío' })
  requisito!: string;
}
