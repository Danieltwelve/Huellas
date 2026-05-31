import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, inject } from '@angular/core';
import {
  RevisoresService,
  RevisorDto,
  RelevanciaResponse,
} from '../../../../../core/revisores/revisores.service';
import { firstValueFrom } from 'rxjs';

interface RevisorPares {
  id: number;
  nombre: string;
  correo: string;
  iniciales: string;
  relevancia: 'ALTA' | 'MEDIA' | 'BAJA';
  cargaActual: number;
  descripcion: string;
  destacado?: boolean;
  recomendacion?: string;
  deshabilitado?: boolean;
}

@Component({
  selector: 'app-revision-pares',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './revision-pares.html',
  styleUrls: ['./revision-pares.css'],
})
export class RevisionPares implements OnInit {
  revisores: RevisorPares[] = [];
  private allRevisores: RevisorPares[] = [];
  searchTerm = '';
  @Input() articuloId: number | null = null;
  @Input() set revisorAsignado(value: RevisorDto | null) {
    this.revisorAsignadoInput = value;
    this.sincronizarRevisorAsignado();
  }
  generandoPuntajes = false;
  relevanciasGeneradas = false;
  mostrandoModal = false;
  revisorSeleccionado: RevisorPares | null = null;
  mostrandoModalRevocar = false;
  revocandoAsignacion = false;
  private revisorAsignadoInput: RevisorDto | null = null;
  private revisorAsignadoLocal: RevisorPares | null = null;
  private modalRevocarTimeoutId: ReturnType<typeof setTimeout> | null = null;

  private revisoresService = inject(RevisoresService);

  async ngOnInit(): Promise<void> {
    try {
      const data = await firstValueFrom(this.revisoresService.getRevisores());
      this.revisores = (data || []).map((r: RevisorDto) => ({
        id: r.id,
        nombre: r.nombre ?? '',
        correo: r.correo ?? '',
        iniciales: this.getIniciales(r.nombre ?? ''),
        relevancia: 'BAJA',
        cargaActual: r.cargaActual ?? 0,
        descripcion: r.perfil ?? '',
      }));
      this.allRevisores = [...this.revisores];
      this.sincronizarRevisorAsignado();
    } catch (err) {
      console.error('Error cargando revisores', err);
    }
  }

  async onGenerarPuntaje(): Promise<void> {
    if (this.tieneRevisorAsignado) {
      return;
    }

    if (!this.articuloId) {
      console.error('No se encontro el ID del articulo para generar puntajes.');
      return;
    }

    try {
      this.generandoPuntajes = true;
      const relevancias = await firstValueFrom(
        this.revisoresService.generarPuntaje(this.articuloId),
      );
      this.actualizarRelevancias(relevancias);
      this.relevanciasGeneradas = true;
    } catch (error) {
      console.error('Error al generar puntajes:', error);
    } finally {
      this.generandoPuntajes = false;
    }
  }

  onSearch(value: string) {
    if (this.tieneRevisorAsignado) {
      return;
    }

    this.searchTerm = (value || '').toLowerCase();
    if (!this.searchTerm) {
      this.revisores = [...this.allRevisores];
      return;
    }

    this.revisores = this.allRevisores.filter((r) => {
      const nombre = (r.nombre || '').toLowerCase();
      const correo = (r.correo || '').toLowerCase();
      return nombre.includes(this.searchTerm) || correo.includes(this.searchTerm);
    });
  }

  private actualizarRelevancias(relevancias: RelevanciaResponse[]): void {
    const orden: Record<string, number> = {
      ALTA: 3,
      MEDIA: 2,
      BAJA: 1,
    };

    const actualizadas = this.allRevisores
      .map((revisor) => {
        const relevanciaEncontrada = relevancias.find((p) => p.id === revisor.id);
        return {
          ...revisor,
          relevancia: relevanciaEncontrada?.relevancia ?? revisor.relevancia,
        };
      })
      .sort((a, b) => {
        const aOrden = orden[a.relevancia] ?? 0;
        const bOrden = orden[b.relevancia] ?? 0;
        return bOrden - aOrden;
      });

    this.allRevisores = actualizadas;

    if (!this.searchTerm) {
      this.revisores = [...actualizadas];
      return;
    }

    this.revisores = actualizadas.filter((r) => {
      const nombre = (r.nombre || '').toLowerCase();
      const correo = (r.correo || '').toLowerCase();
      return nombre.includes(this.searchTerm) || correo.includes(this.searchTerm);
    });
  }

  getRelevanciaClase(relevancia: 'ALTA' | 'MEDIA' | 'BAJA'): string {
    if (relevancia === 'ALTA') {
      return 'score--alto';
    }

    if (relevancia === 'MEDIA') {
      return 'score--medio';
    }

    return 'score--bajo';
  }

  getRelevanciaLabel(relevancia: 'ALTA' | 'MEDIA' | 'BAJA'): string {
    if (relevancia === 'ALTA') {
      return 'Alta';
    }

    if (relevancia === 'MEDIA') {
      return 'Media';
    }

    return 'Baja';
  }

  private getIniciales(nombre: string) {
    if (!nombre) return '';
    return nombre
      .split(' ')
      .map((s) => s.charAt(0))
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  trackById(index: number, item: RevisorPares): number {
    return item.id;
  }

  get tieneRevisorAsignado(): boolean {
    return this.revisorAsignadoLocal !== null;
  }

  get revisorAsignadoNombre(): string {
    const nombre = this.revisorAsignadoLocal?.nombre?.trim();
    if (nombre) {
      return nombre;
    }

    const correo = this.revisorAsignadoLocal?.correo?.trim();
    if (correo) {
      return correo;
    }

    const nombreInput = this.revisorAsignadoInput?.nombre?.trim();
    if (nombreInput) {
      return nombreInput;
    }

    const correoInput = this.revisorAsignadoInput?.correo?.trim();
    if (correoInput) {
      return correoInput;
    }

    return 'este revisor';
  }

  abrirModal(revisor: RevisorPares): void {
    this.revisorSeleccionado = revisor;
    this.mostrandoModal = true;
  }

  cerrarModal(): void {
    this.mostrandoModal = false;
    this.revisorSeleccionado = null;
  }

  abrirModalRevocar(): void {
    if (!this.tieneRevisorAsignado) {
      return;
    }

    if (this.modalRevocarTimeoutId) {
      clearTimeout(this.modalRevocarTimeoutId);
    }

    this.modalRevocarTimeoutId = setTimeout(() => {
      this.mostrandoModalRevocar = true;
    }, 0);
  }

  cerrarModalRevocar(): void {
    this.mostrandoModalRevocar = false;

    if (this.modalRevocarTimeoutId) {
      clearTimeout(this.modalRevocarTimeoutId);
      this.modalRevocarTimeoutId = null;
    }
  }

  async confirmarAsignacion(): Promise<void> {
    if (!this.revisorSeleccionado || !this.articuloId) {
      console.error('No se encontro el articulo o revisor a asignar.');
      return;
    }

    try {
      await firstValueFrom(
        this.revisoresService.asignarRevisor(this.articuloId, this.revisorSeleccionado.id),
      );
    } catch (error) {
      console.error('Error al asignar revisor:', error);
      return;
    }

    this.revisorAsignadoInput = {
      id: this.revisorSeleccionado.id,
      nombre: this.revisorSeleccionado.nombre,
      correo: this.revisorSeleccionado.correo,
      perfil: this.revisorSeleccionado.descripcion,
      cargaActual: (this.revisorSeleccionado.cargaActual ?? 0) + 1,
    };
    this.sincronizarRevisorAsignado();

    this.cerrarModal();
    window.location.reload();
  }

  async revocarAsignacion(): Promise<void> {
    if (!this.articuloId || !this.tieneRevisorAsignado) {
      return;
    }

    this.revocandoAsignacion = true;

    try {
      await firstValueFrom(this.revisoresService.revocarRevisor(this.articuloId));
      this.revisorAsignadoInput = null;
      this.sincronizarRevisorAsignado();
      this.searchTerm = '';
    } catch (error) {
      console.error('Error al revocar revisor:', error);
    } finally {
      this.revocandoAsignacion = false;
    }
  }

  async confirmarRevocacion(): Promise<void> {
    if (this.revocandoAsignacion) {
      window.location.reload();
      return;
    }

    await this.revocarAsignacion();
    this.cerrarModalRevocar();
    window.location.reload();
  }

  private sincronizarRevisorAsignado(): void {
    if (!this.revisorAsignadoInput) {
      this.revisorAsignadoLocal = null;
      this.revisores = [...this.allRevisores];
      return;
    }

    const desdeLista = this.allRevisores.find(
      (revisor) => revisor.id === this.revisorAsignadoInput?.id,
    );

    const base = desdeLista ?? this.mapearRevisorDto(this.revisorAsignadoInput);

    this.revisorAsignadoLocal = {
      ...base,
      nombre: this.revisorAsignadoInput.nombre ?? base.nombre,
      correo: this.revisorAsignadoInput.correo ?? base.correo,
      descripcion: this.revisorAsignadoInput.perfil ?? base.descripcion,
      cargaActual: this.revisorAsignadoInput.cargaActual ?? base.cargaActual,
    };

    this.revisores = this.allRevisores.map((revisor) =>
      revisor.id === this.revisorAsignadoLocal?.id ? this.revisorAsignadoLocal! : revisor,
    );
  }

  esRevisorAsignado(revisor: RevisorPares): boolean {
    return this.revisorAsignadoLocal?.id === revisor.id;
  }

  private mapearRevisorDto(revisor: RevisorDto): RevisorPares {
    return {
      id: revisor.id,
      nombre: revisor.nombre ?? '',
      correo: revisor.correo ?? '',
      iniciales: this.getIniciales(revisor.nombre ?? ''),
      relevancia: 'BAJA',
      cargaActual: revisor.cargaActual ?? 0,
      descripcion: revisor.perfil ?? '',
    };
  }
}
