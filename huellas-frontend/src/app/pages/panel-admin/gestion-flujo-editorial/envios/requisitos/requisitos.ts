import { Component, EventEmitter, OnInit, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { RequisitoRevista, RequisitosRevistaService, RequisitosPageResponse } from '../../../../../core/requisitos-revista/requisitos-revista.service';
import { ModalEliminarRequisito } from './modal-eliminar-requisito/modal-eliminar-requisito';
import { ModalCrearRequisito } from './modal-crear-requisito/modal-crear-requisito';

@Component({
  selector: 'app-requisitos',
  standalone: true,
  imports: [CommonModule, ModalEliminarRequisito, ModalCrearRequisito],
  templateUrl: './requisitos.html',
  styleUrl: './requisitos.css',
})
export class Requisitos implements OnInit {
  @Output() guardar = new EventEmitter<void>();

  // ViewChild reference to modals if needed, or just use template variable in HTML

  private requisitosService = inject(RequisitosRevistaService);
  requisitos$!: Observable<RequisitosPageResponse>;
  currentPage = 1;
  pageSize = 10;

  ngOnInit(): void {
    this.refreshList();
  }

  refreshList(page = this.currentPage): void {
    this.currentPage = page;
    this.requisitos$ = this.requisitosService.findAll({
      page: this.currentPage,
      limit: this.pageSize,
    });
  }

  crear(modal: ModalCrearRequisito) {
    modal.openModal();
  }

  previousPage(): void {
    if (this.currentPage <= 1) {
      return;
    }

    this.refreshList(this.currentPage - 1);
  }

  nextPage(totalPages: number): void {
    if (this.currentPage >= totalPages) {
      return;
    }

    this.refreshList(this.currentPage + 1);
  }
}

