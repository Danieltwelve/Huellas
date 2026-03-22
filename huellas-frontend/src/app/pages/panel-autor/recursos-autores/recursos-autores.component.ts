import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-recursos-autores',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './recursos-autores.component.html',
  styleUrls: ['./recursos-autores.component.css']
})
export class RecursosAutoresComponent {
  faqOpen: number | null = null;

  toggleFaq(index: number): void {
    this.faqOpen = this.faqOpen === index ? null : index;
  }
}
