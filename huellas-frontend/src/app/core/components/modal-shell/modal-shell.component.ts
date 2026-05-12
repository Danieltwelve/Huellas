import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, EventEmitter, HostListener, Input, OnDestroy, Output, ViewChild } from '@angular/core';

@Component({
  selector: 'app-modal-shell',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './modal-shell.component.html',
  styleUrl: './modal-shell.component.css',
})
export class ModalShellComponent implements AfterViewInit, OnDestroy {
  @Input() title = '';
  @Input() ariaLabel = '';
  @Input() width = 'min(520px, 92vw)';
  @Input() panelClass = '';
  @Input() bodyClass = '';
  @Input() footerClass = '';
  @Input() showClose = true;

  @Output() closed = new EventEmitter<void>();

  @ViewChild('modalCard') modalCard?: ElementRef<HTMLElement>;
  private readonly restoreFocusTarget = typeof document !== 'undefined'
    ? (document.activeElement as HTMLElement | null)
    : null;

  private lastFocusedIndex = 0;

  close(): void {
    this.closed.emit();
  }

  onBackdropClick(): void {
    this.close();
  }

  ngAfterViewInit(): void {
    queueMicrotask(() => this.focusInitialElement());
  }

  ngOnDestroy(): void {
    this.restoreFocusTarget?.focus?.();
  }

  private focusInitialElement(): void {
    const card = this.modalCard?.nativeElement;
    if (!card) {
      return;
    }

    const focusableList = Array.from(
      card.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((el) => el.offsetParent !== null);

    if (focusableList.length > 0) {
      this.lastFocusedIndex = 0;
      focusableList[0].focus();
      return;
    }

    card.focus();
  }

  @HostListener('document:keydown', ['$event'])
  handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Tab') {
      this.trapTab(event);
    }
  }

  private trapTab(event: KeyboardEvent) {
    const card = this.modalCard?.nativeElement;
    if (!card) return;

    const focusable = Array.from(
      card.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((el) => el.offsetParent !== null);

    if (focusable.length === 0) return;

    const current = document.activeElement as HTMLElement;
    const idx = focusable.indexOf(current);
    const lastIndex = focusable.length - 1;

    if (!event.shiftKey) {
      const next = idx === -1 || idx === lastIndex ? 0 : idx + 1;
      focusable[next].focus();
      event.preventDefault();
    } else {
      const prev = idx <= 0 ? lastIndex : idx - 1;
      focusable[prev].focus();
      event.preventDefault();
    }
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    this.close();
  }
}