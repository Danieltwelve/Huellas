import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../auth/auth.service';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss',
})
export class FooterComponent {
  isContactPanelOpen = false;
  currentYear = new Date().getFullYear();

  toggleContactPanel(): void {
    this.isContactPanelOpen = !this.isContactPanelOpen;
  }

  closeContactPanel(): void {
    this.isContactPanelOpen = false;
  }
}
