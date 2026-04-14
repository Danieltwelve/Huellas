import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  ArticuloFlujo,
  ArticulosService,
} from '../../../core/articulos/articulos.service';
import { normalizarNombreArchivo } from '../../../core/utils/filename.utils';

interface DocumentoArticulo {
  nombre: string;
  path: string;
}

interface DocumentoRubrica {
  titulo: string;
  descripcion: string;
  archivo: string;
}

type SeccionDetalle = 'info' | 'rubricas' | 'documentos' | 'decision';

@Component({
  selector: 'app-articulo-comite',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './articulo-comite.component.html',
  styleUrl: './articulo-comite.component.css',
})
export class ArticuloComiteComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly articulosService = inject(ArticulosService);

  articulo: ArticuloFlujo | null = null;
  loading = true;
  error: string | null = null;
  mensajeOk: string | null = null;
  mensajeError: string | null = null;

  decision: 'aceptar' | 'rechazar' = 'aceptar';
  observacion = '';
  archivoComite: File | null = null;
  nombreArchivoComite = '';
  guardandoEvaluacion = false;
  modalConfirmarDescarte = false;

  seccionesAbiertas: Record<SeccionDetalle, boolean> = {
    info: true,
    rubricas: true,
    documentos: true,
    decision: true,
  };

  readonly documentosRubrica: DocumentoRubrica[] = [
    {
      titulo: 'Plantilla de rúbrica de evaluación (PDF)',
      descripcion: 'Formato oficial para evaluación del artículo por criterio.',
      archivo: '/rubricas/plantilla-rubrica-evaluacion.pdf',
    },
    {
      titulo: 'Guía de aplicación de rúbrica (Word)',
      descripcion: 'Instrucciones para diligenciar la rúbrica de evaluación.',
      archivo: '/rubricas/guia-rubrica-evaluacion.doc',
    },
  ];

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      const id = Number(params['id']);

      if (!id) {
        this.error = 'No se encontró el artículo solicitado.';
        this.loading = false;
        return;
      }

      this.cargarArticulo(id);
    });
  }

  cargarArticulo(id: number): void {
    this.loading = true;
    this.error = null;

    this.articulosService.getArticuloFlujo(id).subscribe({
      next: (articulo) => {
        this.articulo = articulo;
        this.loading = false;
      },
      error: (err) => {
        this.error = err?.error?.message ?? 'No fue posible cargar el artículo.';
        this.loading = false;
      },
    });
  }

  volverListado(): void {
    this.router.navigate(['/panel-comite-editorial/articulos']);
  }

  onArchivoComiteSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files.length > 0 ? input.files[0] : null;

    this.archivoComite = file;
    this.nombreArchivoComite = file?.name ?? '';
  }

  evaluarArticulo(forzarEnvio = false): void {
    if (!this.articulo || this.guardandoEvaluacion) {
      return;
    }

    if (this.decision === 'rechazar' && !forzarEnvio) {
      this.modalConfirmarDescarte = true;
      return;
    }

    if (this.decision === 'rechazar' && !this.observacion.trim()) {
      this.mensajeError = 'Debes agregar una observación para rechazar el artículo.';
      this.mensajeOk = null;
      this.modalConfirmarDescarte = false;
      return;
    }

    this.guardandoEvaluacion = true;
    this.mensajeError = null;
    this.mensajeOk = null;

    this.articulosService
      .evaluarComite(this.articulo.id, {
        decision: this.decision,
        observacion: this.observacion.trim() || undefined,
        archivo: this.archivoComite,
      })
      .subscribe({
        next: (respuesta) => {
          this.guardandoEvaluacion = false;
          this.modalConfirmarDescarte = false;
          this.observacion = '';
          this.archivoComite = null;
          this.nombreArchivoComite = '';
          this.mensajeOk = respuesta.message;
          this.cargarArticulo(this.articulo!.id);
        },
        error: (err) => {
          this.guardandoEvaluacion = false;
          this.modalConfirmarDescarte = false;
          this.mensajeError =
            err?.error?.message ?? 'No se pudo guardar la evaluación del comité.';
        },
      });
  }

  toggleSeccion(seccion: SeccionDetalle): void {
    this.seccionesAbiertas[seccion] = !this.seccionesAbiertas[seccion];
  }

  cancelarDescarte(): void {
    this.modalConfirmarDescarte = false;
  }

  confirmarDescarte(): void {
    this.modalConfirmarDescarte = false;
    this.evaluarArticulo(true);
  }

  descargarDocumentoArticulo(path: string, nombreOriginal: string): void {
    const filename = path.split(/[\\/]/).pop() || '';

    if (!filename) {
      this.mensajeError = 'No se pudo resolver el documento seleccionado.';
      this.mensajeOk = null;
      return;
    }

    this.articulosService.descargarArchivo(filename).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = normalizarNombreArchivo(nombreOriginal);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: () => {
        this.mensajeError = 'No se pudo descargar el documento.';
        this.mensajeOk = null;
      },
    });
  }

  get documentosArticulo(): DocumentoArticulo[] {
    if (!this.articulo) {
      return [];
    }

    const vistos = new Set<string>();

    return (this.articulo.observaciones ?? [])
      .flatMap((obs) =>
        obs.archivos.map((archivo) => ({
          nombre: normalizarNombreArchivo(archivo.archivoNombreOriginal),
          path: archivo.archivoPath,
        })),
      )
      .filter((archivo) => {
        const extension = archivo.nombre.split('.').pop()?.toLowerCase() ?? '';
        const esDocumentoRubrica = ['pdf', 'doc', 'docx'].includes(extension);

        if (!esDocumentoRubrica || vistos.has(archivo.path)) {
          return false;
        }

        vistos.add(archivo.path);
        return true;
      });
  }

  get autoresTexto(): string {
    const autores = this.articulo?.autores ?? [];
    return autores.length ? autores.map((autor) => autor.nombre).join(', ') : 'Sin autores';
  }

  get temasTexto(): string {
    const temas = this.articulo?.temas ?? [];
    return temas.length ? temas.join(', ') : 'Sin temas';
  }

  get palabrasClaveTexto(): string {
    const palabrasClave = this.articulo?.palabrasClave ?? [];
    return palabrasClave.length ? palabrasClave.join(', ') : 'Sin palabras clave';
  }
}
