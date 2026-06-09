import { IsNotEmpty, IsObject } from 'class-validator';

export class GuardarChecklistDto {
  @IsObject()
  @IsNotEmpty()
  checklist!: Record<string, boolean>;
}
