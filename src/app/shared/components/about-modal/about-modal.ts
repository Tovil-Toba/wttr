import { Component, HostListener, inject, output } from '@angular/core';

import { I18nService } from '../../../core/i18n';

@Component({
  selector: 'app-about-modal',
  imports: [],
  templateUrl: './about-modal.html',
  styleUrl: './about-modal.scss',
})
export class AboutModalComponent {
  readonly i18n = inject(I18nService);
  close = output<void>();

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.close.emit();
  }
}
