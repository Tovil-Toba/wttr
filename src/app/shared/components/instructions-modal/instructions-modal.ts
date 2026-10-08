import { Component, HostListener, inject, input, OnInit, output, signal } from '@angular/core';

import { I18nService } from '../../../core/i18n';

export type InstructionsSection = 'search' | 'settings' | 'shortcuts' | 'features' | 'curl';

@Component({
  selector: 'app-instructions-modal',
  imports: [],
  templateUrl: './instructions-modal.html',
  styleUrl: './instructions-modal.scss',
})
export class InstructionsModalComponent implements OnInit {
  readonly i18n = inject(I18nService);
  readonly initialSection = input<InstructionsSection>('search');
  close = output<void>();

  activeSection = signal<InstructionsSection>('search');
  copiedCommand = signal<string | null>(null);

  ngOnInit(): void {
    this.activeSection.set(this.initialSection());
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.close.emit();
  }

  setSection(section: InstructionsSection): void {
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
