import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet } from '@angular/router';
import { FooterComponent } from './core/components/footer/footer.component';
import { NavbarComponent } from './core/components/navbar/navbar.component';
import { SideBar } from './core/components/side-bar/side-bar';
import { AuthService } from './core/auth/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    NavbarComponent,
    FooterComponent,
    SideBar
],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class AppComponent {
  private readonly authService = inject(AuthService);

  user$ = this.authService.user$;
  sidebarCollapsed = false;

  constructor(private readonly router: Router) {}

  onSidebarCollapsed(collapsed: boolean): void {
    this.sidebarCollapsed = collapsed;
  }

  get showFooter(): boolean {
    const currentPath = this.router.url.split('?')[0];
    return !['/login', '/register'].includes(currentPath);
  }
}
