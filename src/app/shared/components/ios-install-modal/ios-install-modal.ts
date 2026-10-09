import { Component, HostListener, inject, output } from '@angular/core';

import { I18nService } from '../../../core/i18n';

@Component({
  selector: 'app-ios-install-modal',
  imports: [],
  templateUrl: './ios-install-modal.html',
  styleUrl: './ios-install-modal.scss',
})
export class IosInstallModalComponent {
  readonly i18n = inject(I18nService);
  close = output<void>();

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.close.emit();
  }
}
