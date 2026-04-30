import {
  ChangeDetectorRef,
  Component,
  inject,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ArticulosService } from '../../../core/articulos/articulos.service';
import { AuthService, AccessClaims } from '../../../core/auth/auth.service';
import { Observable } from 'rxjs';

// Mapeo de temas: área -> tema_id
const TEMAS = [
  { id: 1, nombre: 'Ciencias de la Computación' },
  { id: 2, nombre: 'Ingeniería de Sistemas' },
  { id: 3, nombre: 'Inteligencia Artificial' },
  { id: 4, nombre: 'Redes y Telecomunicaciones' },
  { id: 5, nombre: 'Seguridad Informática' },
  { id: 6, nombre: 'Bases de Datos' },
  { id: 7, nombre: 'Desarrollo de Software' },
  { id: 8, nombre: 'Bioinformática' },
  { id: 9, nombre: 'Matemáticas Aplicadas' },
  { id: 10, nombre: 'Otra' },
];

function resumenLengthValidator(
  control: AbstractControl
): ValidationErrors | null {
  const val: string = control.value ?? '';
  if (val.length < 100) return { minlength: { requiredLength: 100, actualLength: val.length } };
  if (val.length > 1000) return { maxlength: { requiredLength: 1000, actualLength: val.length } };
  return null;
}

function palabrasClaveValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  if (!Array.isArray(value) || value.length === 0) {
    return { required: true };
  }
  return null;
}

@Component({
  selector: 'app-nuevo-articulo',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './nuevo-articulo.component.html',
  styleUrl: './nuevo-articulo.component.css',
})
export class NuevoArticuloComponent implements OnInit {
  private fb = inject(FormBuilder);
  private articulosService = inject(ArticulosService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  temas = TEMAS;
  form!: FormGroup;
  archivoSeleccionado: File | null = null;
  archivoError = '';
  keywordInput = '';
  enviando = false;
  errorEnvio = '';
  exito = false;
  usuarioActualId: number | null = null;
  envioHabilitado = true;
  estadoEnvioCargando = true;

  claims$: Observable<AccessClaims> = this.authService.claims$;

  private getUserIdFromExternalUid(externalUid: string | undefined): number | null {
    if (!externalUid) {
      return null;
    }

    const match = externalUid.match(/(\d+)$/);
    if (!match) {
      return null;
    }

    const parsed = Number(match[1]);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }

  ngOnInit(): void {
    // Obtener el ID del usuario actual desde las claims (formato: huellas-db-{id})
    this.authService.claims$.subscribe((claims) => {
      this.usuarioActualId = this.getUserIdFromExternalUid(
        claims?.externalSystemUid as string | undefined,
      );

      if (this.usuarioActualId) {
        console.log('✅ ID de usuario obtenido:', this.usuarioActualId);
      }
    });

    this.form = this.fb.group({
      titulo: ['', [Validators.required, Validators.maxLength(255)]],
      tema_id: ['', Validators.required],
      resumen: ['', [Validators.required, resumenLengthValidator]],
      palabras_clave: [[], palabrasClaveValidator],
      asunto: ['', Validators.required],
      comentarios: [''],
      usuarios_ids: this.fb.array([]),
    });

    this.cargarEstadoEnvios();
  }

  private cargarEstadoEnvios(): void {
    this.estadoEnvioCargando = true;

    this.articulosService.getEstadoEnviosArticulos().subscribe({
      next: (estado) => {
        this.envioHabilitado = estado.habilitado;
        this.estadoEnvioCargando = false;
      },
      error: () => {
        this.envioHabilitado = true;
        this.estadoEnvioCargando = false;
      },
    });
  }

  get palabrasClave(): string[] {
    return (this.form.get('palabras_clave')?.value as string[]) ?? [];
  }

  onKeywordInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.keywordInput = input.value;
  }

  onKeywordKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      this.addKeywordFromInput();
    }
  }

  onKeywordPaste(event: ClipboardEvent): void {
    const pastedText = event.clipboardData?.getData('text') ?? '';
    if (!/[\n,;]+/.test(pastedText)) {
      return;
    }

    event.preventDefault();
    this.appendKeywords(this.parseKeywords(pastedText));
    this.keywordInput = '';
  }

  private parseKeywords(raw: string): string[] {
    return raw
      .split(/[\n,;]+/)
      .map((token) => token.trim())
      .filter(Boolean);
  }

  private appendKeywords(newKeywords: string[]): void {
    if (newKeywords.length === 0) return;

    const existing = this.palabrasClave;
    const existingLower = new Set(existing.map((k) => k.toLowerCase()));
    const merged = [...existing];

    for (const keyword of newKeywords) {
      const key = keyword.toLowerCase();
      if (existingLower.has(key)) continue;
      existingLower.add(key);
      merged.push(keyword);
    }

    this.form.get('palabras_clave')?.setValue(merged);
    this.form.get('palabras_clave')?.markAsTouched();
  }

  addKeywordFromInput(): void {
    this.appendKeywords(this.parseKeywords(this.keywordInput));
    this.keywordInput = '';
  }

  removeKeyword(index: number): void {
    const next = this.palabrasClave.filter((_, i) => i !== index);
    this.form.get('palabras_clave')?.setValue(next);
    this.form.get('palabras_clave')?.markAsTouched();
  }

  getKeywordClass(index: number): string {
    const palette = ['chip-a', 'chip-b', 'chip-c', 'chip-d', 'chip-e'];
    return palette[index % palette.length];
  }

  get usuariosIds(): FormArray {
    return this.form.get('usuarios_ids') as FormArray;
  }

  newCoautor(): FormGroup {
    return this.fb.group({
      usuario_id: ['', Validators.required],
      es_correspondiente: [false],
    });
  }

  addCoautor(): void {
    if (this.usuariosIds.length >= 2) {
      return;
    }

    this.usuariosIds.push(this.newCoautor());
  }

  removeCoautor(i: number): void {
    this.usuariosIds.removeAt(i);
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.archivoError = '';
    const file = input.files?.[0];
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!['pdf', 'docx'].includes(ext)) {
      this.archivoError = 'Solo se permiten archivos .pdf o .docx';
      input.value = '';
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      this.archivoError = 'El archivo no debe superar 10 MB';
      input.value = '';
      return;
    }
    this.archivoSeleccionado = file;
  }

  submit(): void {
    if (!this.envioHabilitado) {
      this.errorEnvio = 'El envío de artículos está deshabilitado temporalmente.';
      return;
    }

    if (this.form.invalid || !this.archivoSeleccionado) {
      this.form.markAllAsTouched();
      if (!this.archivoSeleccionado) this.archivoError = 'El archivo es requerido';
      return;
    }

    if (!this.usuarioActualId) {
      this.errorEnvio = 'No se pudo obtener tu ID de usuario. Intenta refrescar la página.';
      return;
    }

    this.enviando = true;
    this.errorEnvio = '';
    const v = this.form.value;
    const fd = new FormData();
    fd.append('titulo', v.titulo);
    fd.append('tema_id', String(v.tema_id));
    fd.append('resumen', v.resumen);
    fd.append('palabras_clave', (v.palabras_clave as string[]).join(','));
    fd.append('asunto', v.asunto);
    fd.append('comentarios', v.comentarios || '');
    
    // Construir array de usuarios_ids: usuario actual + co-autores
    const usuariosIds = [this.usuarioActualId];
    if (this.usuariosIds.length > 0) {
      const idsCoautores = this.usuariosIds.value
        .map((c: any) => parseInt(c.usuario_id, 10))
        .filter((id: number) => !isNaN(id));
      usuariosIds.push(...idsCoautores);
    }

    if (usuariosIds.length > 3) {
      this.enviando = false;
      this.errorEnvio = 'Se permiten máximo 3 autores por artículo (incluyéndote).';
      return;
    }

    fd.append('usuarios_ids', usuariosIds.join(','));
    fd.append('archivo', this.archivoSeleccionado, this.archivoSeleccionado.name);

    console.log('📤 Enviando artículo:', {
      titulo: v.titulo,
      tema_id: v.tema_id,
      asunto: v.asunto,
      usuarios_ids: usuariosIds,
    });

    this.articulosService.crearArticulo(fd).subscribe({
      next: (response) => {
        console.log('✅ Artículo enviado correctamente:', response);
        this.enviando = false;
        this.exito = true;
        this.cdr.detectChanges();
        setTimeout(() => this.router.navigate(['/panel-autor']), 2000);
      },
      error: (err: any) => {
        console.error('❌ Error al enviar artículo:', err);
        this.enviando = false;
        this.errorEnvio =
          err?.error?.message ?? err?.message ?? 'Ocurrió un error al enviar el artículo.';
        this.cdr.detectChanges();
      },
    });
  }

  volver(): void {
    this.router.navigate(['/panel-autor']);
  }

  fieldInvalid(name: string): boolean {
    const ctrl = this.form.get(name);
    return !!(ctrl && ctrl.invalid && ctrl.touched);
  }
}
