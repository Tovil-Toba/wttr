import { Component, HostListener, computed, effect, inject, signal } from '@angular/core';

import { I18nService } from './core/i18n';
import { ThemeService } from './core/theme.service';
import { FavoritesListComponent } from './features/favorites/favorites-list/favorites-list';
import { ComfortIndicesComponent } from './features/weather/comfort-indices/comfort-indices';
import { DailyForecastComponent } from './features/weather/daily-forecast/daily-forecast';
import { HourlyForecastComponent } from './features/weather/hourly-forecast/hourly-forecast';
import { SunMoonTrackerComponent } from './features/weather/sun-moon-tracker/sun-moon-tracker';
import { WeatherHeroComponent } from './features/weather/weather-hero/weather-hero';
import { WeatherService } from './features/weather/weather.service';
import { WttrFeaturesComponent } from './features/weather/wttr-features/wttr-features';
import { NavbarComponent } from './layout/navbar/navbar';
import { AboutModalComponent } from './shared/components/about-modal/about-modal';
import {
  InstructionsModalComponent,
  InstructionsSection,
} from './shared/components/instructions-modal/instructions-modal';
import { WeatherCompareModalComponent } from './features/weather/weather-compare-modal/weather-compare-modal';

@Component({
  selector: 'app-root',
  imports: [
    NavbarComponent,
    WeatherHeroComponent,
    HourlyForecastComponent,
    ComfortIndicesComponent,
    SunMoonTrackerComponent,
    DailyForecastComponent,
    WttrFeaturesComponent,
    FavoritesListComponent,
    InstructionsModalComponent,
    AboutModalComponent,
    WeatherCompareModalComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  readonly weatherService = inject(WeatherService);
  readonly themeService = inject(ThemeService);
  readonly i18n = inject(I18nService);

  isInstructionsOpen = signal<boolean>(false);
  initialInstructionsSection = signal<InstructionsSection>('search');
  isAboutOpen = signal<boolean>(false);

  readonly isAnyModalOpen = computed(
    () => this.isInstructionsOpen() || this.isAboutOpen() || this.weatherService.isCompareOpen(),
  );

  readonly formatOfflineTime = computed(() => {
    const ts = this.weatherService.offlineDataTimestamp();
    return this.weatherService.formatOfflineTimestamp(ts);
  });

  constructor() {
    effect(() => {
      if (typeof document !== 'undefined') {
        document.body.classList.toggle('overflow-hidden', this.isAnyModalOpen());
      }
    });
  }

  openInstructions(section: InstructionsSection = 'search'): void {
    this.initialInstructionsSection.set(section);
    this.isInstructionsOpen.set(true);
  }

  closeInstructions(): void {
    this.isInstructionsOpen.set(false);
  }

  retryFetch(): void {
    this.weatherService.refreshCurrentWeather();
  }

  @HostListener('window:keydown', ['$event'])
  handleGlobalKeydown(event: KeyboardEvent): void {
    // 1. Ignore if modifier keys (Ctrl, Alt, Meta) are pressed (e.g. Ctrl+R shouldn't intercept browser reload)
    if (event.ctrlKey || event.altKey || event.metaKey) {
      return;
    }

    const activeEl = typeof document !== 'undefined' ? document.activeElement : null;
    const isTyping =
      activeEl instanceof HTMLInputElement ||
      activeEl instanceof HTMLTextAreaElement ||
      activeEl instanceof HTMLSelectElement ||
      activeEl?.getAttribute('contenteditable') === 'true';

    // Escape handles blurring active inputs or closing modals / dropdowns
    if (event.key === 'Escape') {
      if (isTyping && activeEl) {
        (activeEl as HTMLElement).blur();
        return;
      }
      if (this.weatherService.isLangMenuOpen()) {
        this.weatherService.closeLangMenu();
        return;
      }
      if (this.isInstructionsOpen()) {
        this.closeInstructions();
        return;
      }
      if (this.isAboutOpen()) {
        this.isAboutOpen.set(false);
        return;
      }
      if (this.weatherService.isCompareOpen()) {
        this.weatherService.closeCompare();
        return;
      }
      return;
    }

    // Do NOT trigger hotkeys while typing in any input/textarea
    if (isTyping) {
      return;
    }

    const key = event.key;

    if (key === '/') {
      event.preventDefault();
      const searchInput =
        typeof document !== 'undefined'
          ? (document.getElementById('main-city-search') as HTMLInputElement | null)
          : null;
      if (searchInput) {
        searchInput.focus();
        searchInput.select();
      }
      return;
    }

    if (key === 't' || key === 'T') {
      event.preventDefault();
      this.themeService.toggleTheme();
      return;
    }

    if (key === 'l' || key === 'L') {
      event.preventDefault();
      this.weatherService.toggleLangMenu();
      return;
    }

    if (key === 'f' || key === 'F') {
      event.preventDefault();
      this.weatherService.toggleFavorite();
      return;
    }

    if (key === 'r' || key === 'R') {
      event.preventDefault();
      this.weatherService.refreshCurrentWeather();
      return;
    }

    if (key === 'c' || key === 'C') {
      event.preventDefault();
      this.weatherService.toggleCompare();
      return;
    }

    if (key === '?' || key === 'h' || key === 'H') {
      event.preventDefault();
      this.openInstructions('shortcuts');
      return;
    }
  }
}
