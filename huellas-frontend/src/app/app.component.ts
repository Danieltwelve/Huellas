import { Component } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { NavbarComponent } from './core/components/navbar/navbar.component';
import { CommonModule } from '@angular/common';
import { FooterComponent } from './core/components/footer/footer.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent, FooterComponent, CommonModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  constructor(private readonly router: Router) {}

  title = 'HUELLAS';

  get showFooter(): boolean {
    const currentPath = this.router.url.split('?')[0];
    return !['/login', '/register'].includes(currentPath);
  }
}
