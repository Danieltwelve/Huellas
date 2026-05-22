import {
  ChangeDetectorRef,
  ElementRef,
  Component,
  HostListener,
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
import { ArticulosService, TemaCatalogoBackend } from '../../../core/articulos/articulos.service';
import { AuthService, AccessClaims } from '../../../core/auth/auth.service';
import { Observable } from 'rxjs';

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
  private elementRef = inject(ElementRef<HTMLElement>);

  temas: TemaCatalogoBackend[] = [];
  temaMenuAbierto = false;
  form!: FormGroup;
  archivoSeleccionado: File | null = null;
  archivoError = '';
  archivoTocado = false;
  keywordInput = '';
  enviando = false;
  showConfirmationModal = false;
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

    this.cargarTemas();
    this.cargarEstadoEnvios();
  }

  private cargarTemas(): void {
    this.articulosService.getTemasCatalogo().subscribe({
      next: (temas) => {
        this.temas = temas;
      },
      error: () => {
        this.temas = [];
      },
    });
  }

  abrirCerrarTemaMenu(): void {
    this.temaMenuAbierto = !this.temaMenuAbierto;
  }

  cerrarTemaMenu(): void {
    this.temaMenuAbierto = false;
  }

  @HostListener('document:click', ['$event'])
  cerrarMenuAlHacerClickFuera(event: MouseEvent): void {
    if (!this.temaMenuAbierto) {
      return;
    }

    const target = event.target as Node | null;
    if (target && !this.elementRef.nativeElement.contains(target)) {
      this.temaMenuAbierto = false;
    }
  }

  seleccionarTema(id: number): void {
    this.form.get('tema_id')?.setValue(id);
    this.form.get('tema_id')?.markAsTouched();
    this.temaMenuAbierto = false;
  }

  get temaSeleccionado(): TemaCatalogoBackend | null {
    const temaId = Number(this.form.get('tema_id')?.value);
    return this.temas.find((tema) => tema.id === temaId) ?? null;
  }

  get temaSeleccionadoTexto(): string {
    return this.temaSeleccionado?.nombre ?? '— Seleccione un tema —';
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

  private getGrupoTema(nombre: string): string {
    const normalized = nombre.toLowerCase();

    if (
      ['ciencias de la computación', 'ingeniería de sistemas', 'inteligencia artificial', 'redes y telecomunicaciones', 'seguridad informática', 'bases de datos', 'desarrollo de software', 'tecnología'].some((item) => normalized.includes(item))
    ) {
      return 'Tecnología y computación';
    }

    if (['educación', 'pedagogía', 'didáctica'].some((item) => normalized.includes(item))) {
      return 'Educación y pedagogía';
    }

    if (['lingüística', 'lengua', 'literatura', 'comunicación'].some((item) => normalized.includes(item))) {
      return 'Lengua y comunicación';
    }

    if (['ciencias naturales', 'salud', 'medio ambiente', 'bioinformática'].some((item) => normalized.includes(item))) {
      return 'Ciencias naturales y salud';
    }

    if (['matemáticas'].some((item) => normalized.includes(item))) {
      return 'Matemáticas y análisis';
    }

    if (['ciencias sociales', 'cultura'].some((item) => normalized.includes(item))) {
      return 'Ciencias sociales y humanidades';
    }

    return 'Otros';
  }

  get temasAgrupados(): Array<{ grupo: string; temas: TemaCatalogoBackend[] }> {
    const prioridad = [
      'Tecnología y computación',
      'Educación y pedagogía',
      'Lengua y comunicación',
      'Ciencias naturales y salud',
      'Matemáticas y análisis',
      'Ciencias sociales y humanidades',
      'Otros',
    ];

    const grupos = new Map<string, TemaCatalogoBackend[]>();

    for (const tema of this.temas) {
      const grupo = this.getGrupoTema(tema.nombre);
      const items = grupos.get(grupo) ?? [];
      items.push(tema);
      grupos.set(grupo, items);
    }

    return prioridad
      .filter((grupo) => grupos.has(grupo))
      .map((grupo) => ({ grupo, temas: grupos.get(grupo) ?? [] }));
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
    this.archivoTocado = true;
    const file = input.files?.[0];
    if (!file) {
      this.archivoSeleccionado = null;
      this.archivoError = 'El archivo es requerido';
      return;
    }
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!['pdf', 'docx'].includes(ext)) {
      this.archivoError = 'Solo se permiten archivos .pdf o .docx';
      input.value = '';
      this.archivoSeleccionado = null;
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      this.archivoError = 'El archivo no debe superar 10 MB';
      input.value = '';
      this.archivoSeleccionado = null;
      return;
    }
    this.archivoSeleccionado = file;
  }

  clearArchivo(input: HTMLInputElement): void {
    input.value = '';
    this.archivoSeleccionado = null;
    this.archivoError = '';
    this.archivoTocado = true;
  }

  submit(): void {
    if (!this.envioHabilitado) {
      this.errorEnvio = 'El envío de artículos está deshabilitado temporalmente.';
      return;
    }

    if (this.form.invalid || !this.archivoSeleccionado) {
      this.form.markAllAsTouched();
      this.archivoTocado = true;
      if (!this.archivoSeleccionado) this.archivoError = 'El archivo es requerido';
      return;
    }

    if (!this.usuarioActualId) {
      this.errorEnvio = 'No se pudo obtener tu ID de usuario. Intenta refrescar la página.';
      return;
    }

    this.showConfirmationModal = true;
  }

  cancelarConfirmacion(): void {
    if (this.enviando) {
      return;
    }

    this.showConfirmationModal = false;
  }

  confirmarEnvio(): void {
    if (this.enviando) {
      return;
    }

    if (!this.envioHabilitado) {
      this.showConfirmationModal = false;
      this.errorEnvio = 'El envío de artículos está deshabilitado temporalmente.';
      return;
    }

    if (this.form.invalid || !this.archivoSeleccionado || !this.usuarioActualId) {
      this.showConfirmationModal = false;
      this.form.markAllAsTouched();
      this.archivoTocado = true;
      if (!this.archivoSeleccionado) this.archivoError = 'El archivo es requerido';
      if (!this.usuarioActualId) {
        this.errorEnvio = 'No se pudo obtener tu ID de usuario. Intenta refrescar la página.';
      }
      return;
    }

    this.enviando = true;
    this.errorEnvio = '';
    this.showConfirmationModal = false;
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

  get resumenEnvio(): Array<{ label: string; value: string }> {
    const value = this.form.value;
    const autores = [
      this.usuarioActualId ? `Autor principal: ID ${this.usuarioActualId}` : 'Autor principal no disponible',
      ...this.usuariosIds.controls
        .map((control) => Number(control.get('usuario_id')?.value))
        .filter((id) => Number.isInteger(id) && id > 0)
        .map((id) => `Co-autor ID ${id}`),
    ];

    return [
      { label: 'Título', value: value.titulo || 'Sin título' },
      { label: 'Tema', value: this.temas.find((tema) => String(tema.id) === String(value.tema_id))?.nombre ?? 'Sin tema' },
      { label: 'Palabras clave', value: this.palabrasClave.length > 0 ? this.palabrasClave.join(', ') : 'Sin palabras clave' },
      { label: 'Archivo', value: this.archivoSeleccionado?.name ?? 'Sin archivo' },
      { label: 'Autores', value: autores.join(' · ') },
    ];
  }
}
