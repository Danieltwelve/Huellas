import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ArticulosAutorService, ArticuloAutor } from '../../../core/articulos/articulos-autor.service';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-mi-panel',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './mi-panel.component.html',
  styleUrls: ['./mi-panel.component.css']
})
export class MiPanelComponent implements OnInit {
  private articulosService = inject(ArticulosAutorService);

  articulos: ArticuloAutor[] = [];
  loading = true;

  get totalArticulos() { return this.articulos.length; }
  get enRevision() { return this.articulos.filter(a => a.etapa_nombre !== 'Publicado' && a.etapa_nombre !== 'Correcciones pendientes').length; }
  get correccionPendiente() { return this.articulos.filter(a => a.etapa_nombre === 'Correcciones pendientes').length; }
  get publicados() { return this.articulos.filter(a => a.etapa_nombre === 'Publicado').length; }

  ngOnInit() {
    this.articulosService.getMisArticulos().subscribe({
      next: (data) => {
        this.articulos = data;
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
      }
    });
  }
}
