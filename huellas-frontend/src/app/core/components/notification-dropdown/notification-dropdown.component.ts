import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, HostListener, Input, Output, ViewChild, inject } from '@angular/core';

export interface NotificationDropdownItem {
  id: string;
  articuloId: number;
  codigoArticulo: string;
  titulo: string;
  detalle: string;
  fecha: Date;
  enlace: string;
  leida: boolean;
}

@Component({
  selector: 'app-notification-dropdown',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification-dropdown.component.html',
  styleUrls: ['./notification-dropdown.component.css'],
})
export class NotificationDropdownComponent {
  @Input() items: NotificationDropdownItem[] = [];
  @Input() loading = false;
  @Input() error: string | null = null;
  @Input() title = 'Notificaciones';
  @Input() eyebrow = 'Alertas';
  @Input() emptyMessage = 'No hay notificaciones para mostrar.';
  @Input() centerLabel = 'Ver bandeja completa';

  @Output() itemSelected = new EventEmitter<NotificationDropdownItem>();
  @Output() centerSelected = new EventEmitter<void>();

  @ViewChild('triggerButton') triggerButton?: ElementRef<HTMLButtonElement>;
  @ViewChild('menuPanel') menuPanel?: ElementRef<HTMLDivElement>;

  private readonly hostRef = inject(ElementRef<HTMLElement>);
  open = false;
  menuStyle: Record<string, string> = {};

  get unreadCount(): number {
    return this.items.filter((item) => !item.leida).length;
  }

  toggle(): void {
    this.open = !this.open;

    if (this.open) {
      this.scheduleRecalculate();
    }
  }

  close(): void {
    this.open = false;
  }

  selectItem(item: NotificationDropdownItem): void {
    this.itemSelected.emit(item);
    this.close();
  }

  selectCenter(): void {
    this.centerSelected.emit();
    this.close();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.open) {
      return;
    }

    const target = event.target as HTMLElement | null;
    if (target && this.hostRef.nativeElement.contains(target)) {
      return;
    }

    this.close();
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    if (this.open) {
      this.scheduleRecalculate();
    }
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    if (this.open) {
      this.scheduleRecalculate();
    }
  }

  private scheduleRecalculate(): void {
    window.requestAnimationFrame(() => this.recalculatePosition());
  }

  private recalculatePosition(): void {
    const menu = this.menuPanel?.nativeElement;
    if (!menu) {
      return;
    }

    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const menuRect = menu.getBoundingClientRect();
    
    // Detectar si cabe abajo o debe abrirse arriba
    const spaceBelow = viewportHeight - menuRect.top;
    const spaceAbove = menuRect.top - 44; // 44px es altura aproximada del botón
    
    let top = 'auto';
    let bottom = 'auto';

    if (spaceBelow < 300 && spaceAbove > spaceBelow) {
      // Abrir arriba
      top = 'auto';
      bottom = 'calc(100% + 12px)';
    } else {
      // Abrir abajo (por defecto)
      top = 'calc(100% + 12px)';
      bottom = 'auto';
    }

    // Ajuste horizontal si se sale del viewport
    let right = '0';
    let left = 'auto';
    
    if (menuRect.right > viewportWidth - 12) {
      // Se sale por la derecha, alineado a la derecha del wrapper
      right = '0';
      left = 'auto';
    }

    this.menuStyle = {
      top,
      bottom,
      right,
      left,
    };
  }
}
