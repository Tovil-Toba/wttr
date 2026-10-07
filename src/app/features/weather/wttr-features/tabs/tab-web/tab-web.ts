import { Component, computed, inject, input, output, signal } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

import { I18nService } from '../../../../../core/i18n';
import { LoaderComponent } from '../../../../../shared/components/loader/loader';
import { WeatherService } from '../../../weather.service';

@Component({
  selector: 'app-tab-web',
  imports: [LoaderComponent],
  templateUrl: './tab-web.html',
})
export class TabWebComponent {
  private readonly sanitizer = inject(DomSanitizer);
  readonly weatherService = inject(WeatherService);
  readonly i18n = inject(I18nService);

  query = input.required<string>();
  isLoading = input<boolean>(false);
  htmlContent = input<string>('');
  error = input<string | null>(null);
  loadingSeconds = input<number>(0);
  statusText = input<string>('Подключение к серверу wttr.in...');

  reload = output<void>();
  copyUrl = output<string>();

  copied = signal<boolean>(false);

  readonly webUrl = computed(() => {
    return `https://wttr.in/${encodeURIComponent(this.query())}?lang=${this.weatherService.currentLang()}`;
  });

  readonly webUrlDisplay = computed(() => {
    return `wttr.in/${encodeURIComponent(this.query())}?lang=${this.weatherService.currentLang()}`;
  });

  readonly safeHtml = computed<SafeHtml>(() => {
    const raw = this.htmlContent();
    if (!raw) return '';
    return this.sanitizer.bypassSecurityTrustHtml(raw);
  });

  onCopy(): void {
    this.copied.set(true);
    this.copyUrl.emit(this.webUrl());
    setTimeout(() => this.copied.set(false), 2000);
  }
}
