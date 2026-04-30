import { Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-success-modal',
  standalone: true,
  templateUrl: './success-modal.component.html',
  styleUrls: ['./success-modal.component.css']
})
export class SuccessModalComponent {
  @Output() closed = new EventEmitter<void>();

  close() {
    this.closed.emit();
  }
}
