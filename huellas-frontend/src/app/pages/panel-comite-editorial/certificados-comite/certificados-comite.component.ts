import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import {
  ArticulosService,
  CertificadoArticuloBackend,
} from '../../../core/articulos/articulos.service';

@Component({
  selector: 'app-certificados-comite',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './certificados-comite.component.html',
  styleUrl: './certificados-comite.component.css',
})
export class CertificadosComiteComponent {
  private articulosService = inject(ArticulosService);

  loading = true;
  error: string | null = null;
  certificados: CertificadoArticuloBackend[] = [];

  ngOnInit(): void {
    this.cargarCertificados();
  }

  private cargarCertificados(): void {
    this.loading = true;
    this.error = null;

    this.articulosService.listarCertificados().subscribe({
      next: (data) => {
        this.certificados = data;
        this.loading = false;
      },
      error: () => {
        this.certificados = [];
        this.error = 'No se pudieron cargar los certificados asignados.';
        this.loading = false;
      },
    });
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
        this.error = 'No se pudo descargar el certificado.';
      },
    });
  }
}
