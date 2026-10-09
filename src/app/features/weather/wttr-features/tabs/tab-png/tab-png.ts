import { Component, computed, effect, inject, input, output, signal } from '@angular/core';

import { I18nService } from '../../../../../core/i18n';
import { LoaderComponent } from '../../../../../shared/components/loader/loader';
import { WeatherService } from '../../../weather.service';

@Component({
  selector: 'app-tab-png',
  imports: [LoaderComponent],
  templateUrl: './tab-png.html',
})
export class TabPngComponent {
  readonly weatherService = inject(WeatherService);
  readonly i18n = inject(I18nService);

  query = input.required<string>();
  copyLink = output<string>();

  pngTransparency = signal<boolean>(false);
  pngBorder = signal<boolean>(true);
  pngOnlyCurrent = signal<boolean>(false);
  copied = signal<boolean>(false);
  imageLoading = signal<boolean>(true);
  imageSeconds = signal<number>(0);
  useCoordsFallback = signal<boolean>(false);
  imageHasError = signal<boolean>(false);

  readonly pngUrl = computed(() => {
    const q = this.query();
    const lang = this.weatherService.currentLang();
    const opts: string[] = [`lang=${lang}`];
    if (this.pngTransparency()) opts.push('t');
    if (this.pngBorder()) opts.push('p');
    if (this.pngOnlyCurrent()) opts.push('0');

    const optStr = opts.length ? `_${opts.join('_')}` : '';
    if (this.weatherService.useServerProxy) {
      return `/api/png?city=${encodeURIComponent(q)}&opts=${encodeURIComponent(optStr)}`;
    }

    if (this.useCoordsFallback()) {
      const area = this.weatherService.nearestArea();
      if (area?.latitude && area?.longitude) {
        return `https://wttr.in/${area.latitude},${area.longitude}${optStr}.png`;
      }
    }

    return `https://wttr.in/${encodeURIComponent(q)}${optStr}.png`;
  });

  constructor() {
    // Whenever url changes, reset loading state and error state
    effect(() => {
      this.pngUrl();
      this.imageLoading.set(true);
      this.imageHasError.set(false);
    });

    // Reset coordinate fallback when city query changes
    effect(() => {
      this.query();
      this.useCoordsFallback.set(false);
    });

    // Live timer while loading PNG
    effect((onCleanup: (cleanupFn: () => void) => void) => {
      if (this.imageLoading()) {
        this.imageSeconds.set(0);
        const interval = setInterval(() => {
          this.imageSeconds.update((s) => s + 1);
        }, 1000);
        onCleanup(() => clearInterval(interval));
      } else {
        this.imageSeconds.set(0);
      }
    });
  }

  onImageLoaded(): void {
    this.imageLoading.set(false);
    this.imageHasError.set(false);
  }

  onImageError(): void {
    const area = this.weatherService.nearestArea();
    if (!this.useCoordsFallback() && area?.latitude && area?.longitude) {
      this.useCoordsFallback.set(true);
      return;
    }
    this.imageLoading.set(false);
    this.imageHasError.set(true);
  }

  retry(): void {
    this.imageLoading.set(true);
    this.imageHasError.set(false);
    this.useCoordsFallback.set(false);
  }

  onCopy(): void {
    this.copied.set(true);
    this.copyLink.emit(this.pngUrl());
    setTimeout(() => this.copied.set(false), 2000);
  }
}
