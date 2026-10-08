import { DOCUMENT } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';

import { I18nService } from '../../../core/i18n';
import { WeatherService } from '../weather.service';
import { TabOnelineComponent } from './tabs/tab-oneline/tab-oneline';
import { TabPngComponent } from './tabs/tab-png/tab-png';
import { TabTerminalComponent } from './tabs/tab-terminal/tab-terminal';
import { TabWebComponent } from './tabs/tab-web/tab-web';

@Component({
  selector: 'app-wttr-features',
  imports: [TabWebComponent, TabTerminalComponent, TabPngComponent, TabOnelineComponent],
  templateUrl: './wttr-features.html',
  styleUrl: './wttr-features.scss',
})
export class WttrFeaturesComponent {
  private readonly document = inject(DOCUMENT);
  readonly weatherService = inject(WeatherService);
  readonly i18n = inject(I18nService);

  activeFeatureTab = signal<'web' | 'terminal' | 'png' | 'oneline'>('web');
  loadingSeconds = signal<number>(0);

  constructor() {
    // Whenever current query or language changes, trigger async load for active tab
    effect(
      () => {
        const query = this.weatherService.currentQuery();
        const lang = this.weatherService.currentLang();
        if (query && lang) {
          if (this.activeFeatureTab() === 'web') {
            this.weatherService.fetchWebHtml(query);
          } else if (this.activeFeatureTab() === 'terminal') {
            this.weatherService.fetchTerminalOutput(query);
          }
        }
      });

    // Live timer counting seconds during active loading
    effect((onCleanup: (cleanupFn: () => void) => void) => {
      const loading =
        this.weatherService.isWebLoading() || this.weatherService.isTerminalLoading();

      if (loading) {
        this.loadingSeconds.set(0);
        const interval = setInterval(() => {
          this.loadingSeconds.update((s) => s + 1);
        }, 1000);
        onCleanup(() => clearInterval(interval));
      } else {
        this.loadingSeconds.set(0);
      }
    });
  }

  readonly loadingStatusText = computed(() => {
    const sec = this.loadingSeconds();
    const f = this.i18n.dict().features;
    if (sec < 4) return f.statusConnecting;
    if (sec < 10) return f.statusGenerating;
    if (sec < 20) return f.statusProcessing;
    return f.statusDelay;
  });

  selectTab(tab: 'web' | 'terminal' | 'png' | 'oneline'): void {
    this.activeFeatureTab.set(tab);
    const query = this.weatherService.currentQuery();

    if (tab === 'web') {
      this.weatherService.fetchWebHtml(query);
    } else if (tab === 'terminal') {
      this.weatherService.fetchTerminalOutput(query);
    }
  }

  copyToClipboard(text: string): void {
    const clipboard = this.document.defaultView?.navigator?.clipboard;
    if (clipboard) {
      clipboard.writeText(text);
    }
  }
}
