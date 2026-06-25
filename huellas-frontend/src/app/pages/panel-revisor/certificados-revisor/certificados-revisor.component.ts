import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ArticulosService, CertificadoArticuloBackend } from '../../../core/articulos/articulos.service';

@Component({
  selector: 'app-certificados-revisor',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './certificados-revisor.component.html',
  styleUrls: ['./certificados-revisor.component.css']
})
export class CertificadosRevisorComponent implements OnInit {
  constructor(private readonly articulosService: ArticulosService) {}

  activeFilter = 'todos';
  loading = true;
  error: string | null = null;
  certificados: CertificadoArticuloBackend[] = [];

  ngOnInit(): void {
    this.cargarCertificados();
  }

  setFilter(filter: string): void {
    this.activeFilter = filter;
  }

  get certificadosFiltrados(): CertificadoArticuloBackend[] {
    if (this.activeFilter === 'todos') {
      return this.certificados;
    }

    return this.certificados.filter((item) => item.tipo === this.activeFilter);
  }

  get totalCertificados(): number {
    return this.certificados.length;
  }

  private cargarCertificados(): void {
    this.loading = true;
    this.error = null;

    this.articulosService.listarCertificados().subscribe({
      next: (data) => {
        this.certificados = data.map((c) => ({
          ...c,
          fechaSubidaDate: this.normalizeDate(c.fechaSubida as any),
        } as any));
        this.loading = false;
      },
      error: () => {
        this.certificados = [];
        this.error = 'No se pudieron cargar los certificados disponibles.';
        this.loading = false;
      },
    });
  }

  private normalizeDate(value: string | Date | null | undefined): Date | null {
    if (!value) return null;
    try {
      const s = typeof value === 'string' ? value : value.toString();
      const hasTZ = /[zZ]|[+\-]\d{2}:?\d{2}$/.test(s);
      return new Date(hasTZ ? s : `${s}Z`);
    } catch {
      return new Date(value as any);
    }
  }

  getFecha(certificado: CertificadoArticuloBackend): Date | null {
    const anyC = certificado as any;
    if (anyC && anyC.fechaSubidaDate) {
      return anyC.fechaSubidaDate instanceof Date ? anyC.fechaSubidaDate : this.normalizeDate(anyC.fechaSubidaDate);
    }
    return this.normalizeDate(anyC?.fechaSubida);
  }

  descargar(certificado: CertificadoArticuloBackend): void {
    this.articulosService.descargarCertificado(certificado.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = certificado.archivoNombreOriginal || `certificado-${certificado.id}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: () => {
        this.error = 'No se pudo descargar el certificado seleccionado.';
      },
    });
  }

  getTituloPorTipo(tipo: string): string {
    const mapa: Record<string, string> = {
      evaluacion: 'Certificado de Evaluación',
      publicacion: 'Certificado de Publicación',
      aceptacion: 'Certificado de Aceptación',
      envio: 'Certificado de Envío',
      revision: 'Constancia de Revisión',
      otro: 'Certificado Editorial',
    };

    return mapa[tipo] ?? 'Certificado';
  }
}
