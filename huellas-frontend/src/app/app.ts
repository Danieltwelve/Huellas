import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet } from '@angular/router';
import { FooterComponent } from './core/components/footer/footer.component';
import { NavbarComponent } from './core/components/navbar/navbar.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    NavbarComponent,
    FooterComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class AppComponent {
  constructor(private readonly router: Router) {}

  get showFooter(): boolean {
    const currentPath = this.router.url.split('?')[0];
    return !['/login', '/register'].includes(currentPath);
  }
}
