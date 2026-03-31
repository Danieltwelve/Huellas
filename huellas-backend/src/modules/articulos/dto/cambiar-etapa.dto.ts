import { IsInt, Min } from 'class-validator';

export class CambiarEtapaDto {
  @IsInt()
  @Min(1)
  etapaId!: number;
}
