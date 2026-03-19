import {
  IsString,
  IsNotEmpty,
  IsInt,
  IsPositive,
  IsOptional,
  ArrayNotEmpty,
  IsArray,
  ArrayMaxSize,
} from 'class-validator';

export class CreateArticuloCompletoDto {
  // --- PASO 2: Datos del Artículo ---
  @IsString()
  @IsNotEmpty({ message: 'El título es obligatorio' })
  titulo?: string;

  @IsString()
  @IsNotEmpty({ message: 'El resumen es obligatorio' })
  resumen?: string;

  @IsArray({ message: 'Las palabras clave deben enviarse como una lista' })
  @ArrayNotEmpty({ message: 'Debe proporcionar al menos una palabra clave' })
  @IsString({
    each: true,
    message: 'Cada palabra clave debe ser de tipo texto',
  })
  palabras_clave?: string[];

  // --- PASO 3: Temas
  @IsInt({ message: 'El tema debe ser un número entero' })
  @IsPositive()
  @IsNotEmpty()
  tema_id?: number;

  // --- PASO 4: Autor ---
  @IsArray({ message: 'Debe proporcionar una lista de autores' })
  @ArrayNotEmpty({ message: 'El artículo debe tener al menos un autor' })
  @ArrayMaxSize(3, { message: 'Se permiten máximo 3 autores por artículo' }) // <-- Nuevo límite
  @IsInt({ each: true })
  @IsPositive({ each: true })
  usuarios_ids!: number[];

  // --- PASO 5: Observaciones (Primer envío) ---
  @IsString()
  @IsOptional()
  asunto?: string;

  @IsString()
  @IsOptional()
  comentarios?: string;
}
