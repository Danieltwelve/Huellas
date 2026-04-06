import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-panel-revisor-layout',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './panel-revisor-layout.component.html',
  styleUrls: ['./panel-revisor-layout.component.css'],
})
export class PanelRevisorLayoutComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  collapsed = false;

  toggleSidebar(): void {
    this.collapsed = !this.collapsed;
  }

  async logout(): Promise<void> {
    await this.authService.logout();
    this.router.navigate(['/login']);
  }
}
