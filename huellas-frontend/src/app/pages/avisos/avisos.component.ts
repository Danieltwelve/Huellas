import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AvisosService, Aviso } from '../../core/avisos/avisos.service';

@Component({
  selector: 'app-avisos',
  templateUrl: './avisos.component.html',
  styleUrls: ['./avisos.component.css'],
  standalone: true,
  imports: [CommonModule],
})
export class AvisosComponent implements OnInit {
  private avisosService = inject(AvisosService);

  avisos: Aviso[] = [];
  loading = false;
  error: string | null = null;

  ngOnInit(): void {
    this.cargarAvisos();
  }

  cargarAvisos(): void {
    this.loading = true;
    this.error = null;
    this.avisosService.getAvisos().subscribe({
      next: (data) => {
        this.avisos = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al cargar avisos:', err);
        this.error = 'No se pudieron cargar los avisos. Intente de nuevo más tarde.';
        this.loading = false;
      },
    });
  }
}
