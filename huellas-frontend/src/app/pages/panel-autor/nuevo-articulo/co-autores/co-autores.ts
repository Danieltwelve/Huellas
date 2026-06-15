import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormGroup, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { UsersService } from '../../../../core/users/users.service';

interface Autor {
  id: number;
  nombre: string;
}

@Component({
  selector: 'app-co-autores',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './co-autores.html',
  styleUrl: './co-autores.css',
})
export class CoAutoresComponent implements OnInit {
  private usersService = inject(UsersService);

  @Input() coautoresFormArray!: FormArray;
  @Input() maxCoautores = 2;
  @Input() autorPrincipalId: number | null = null;

  @Output() autoresCargados = new EventEmitter<Autor[]>();

  showSelector = false;
  searchTerm = '';
  autores: Autor[] = [];
  autoresFiltrados: Autor[] = [];

  ngOnInit(): void {
    this.cargarAutores();
  }

  cargarAutores(): void {
    this.usersService.getAutoresLista().subscribe({
      next: (lista) => {
        this.autores = lista;
        this.filtrarAutores();
        this.autoresCargados.emit(lista);
      },
      error: (err) => {
        console.error('Error al cargar autores:', err);
        this.autores = [];
        this.autoresFiltrados = [];
      },
    });
  }

  private filtrarAutores(): void {
    const idsSeleccionados = this.coautoresFormArray.value.map((c: any) => c.usuario_id);
    const term = this.searchTerm.trim().toLowerCase();

    this.autoresFiltrados = this.autores.filter(
      (autor) =>
        autor.id !== this.autorPrincipalId &&
        !idsSeleccionados.includes(autor.id) &&
        (term === '' || autor.nombre.toLowerCase().includes(term)),
    );
  }

  onSearchChange(term: string): void {
    this.searchTerm = term;
    this.filtrarAutores();
  }

  seleccionarAutor(autorId: number): void {
    if (this.coautoresFormArray.length >= this.maxCoautores) {
      return;
    }
    const yaSeleccionado = this.coautoresFormArray.value.some((c: any) => c.usuario_id === autorId);
    if (yaSeleccionado) return;

    const nuevoGrupo = new FormGroup({
      usuario_id: new FormControl(autorId, Validators.required),
      es_correspondiente: new FormControl(false),
    });
    this.coautoresFormArray.push(nuevoGrupo);
    this.cerrarSelector();
  }

  eliminarCoAutor(index: number): void {
    this.coautoresFormArray.removeAt(index);
  }

  toggleCorrespondiente(index: number): void {
    const control = this.coautoresFormArray.at(index).get('es_correspondiente');
    if (control) control.setValue(!control.value);
  }

  obtenerNombreAutor(usuarioId: number): string {
    const autor = this.autores.find((a) => a.id === usuarioId);
    return autor ? autor.nombre : `ID ${usuarioId}`;
  }

  abrirSelector(): void {
    if (this.coautoresFormArray.length >= this.maxCoautores) return;
    this.searchTerm = '';
    this.filtrarAutores();
    this.showSelector = true;
  }

  cerrarSelector(): void {
    this.showSelector = false;
  }

  get canAdd(): boolean {
    return this.coautoresFormArray.length < this.maxCoautores;
  }
}
