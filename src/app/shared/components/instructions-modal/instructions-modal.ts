import { Component, HostListener, inject, output, signal } from '@angular/core';

import { I18nService } from '../../../core/i18n';

@Component({
  selector: 'app-instructions-modal',
  imports: [],
  templateUrl: './instructions-modal.html',
  styleUrl: './instructions-modal.scss',
})
export class InstructionsModalComponent {
  readonly i18n = inject(I18nService);
  close = output<void>();

  activeSection = signal<'search' | 'settings' | 'features' | 'curl'>('search');
  copiedCommand = signal<string | null>(null);

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.close.emit();
  }

  setSection(section: 'search' | 'settings' | 'features' | 'curl'): void {
    this.activeSection.set(section);
  }

  copyText(text: string): void {
    navigator.clipboard?.writeText(text);
    this.copiedCommand.set(text);
    setTimeout(() => {
      this.copiedCommand.set(null);
    }, 2000);
  }
}
