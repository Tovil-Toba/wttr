import { Component, computed, effect, inject, signal } from '@angular/core';

import { I18nService } from './core/i18n';
import { ThemeService } from './core/theme.service';
import { FavoritesListComponent } from './features/favorites/favorites-list/favorites-list';
import { DailyForecastComponent } from './features/weather/daily-forecast/daily-forecast';
import { HourlyForecastComponent } from './features/weather/hourly-forecast/hourly-forecast';
import { WeatherHeroComponent } from './features/weather/weather-hero/weather-hero';
import { WeatherService } from './features/weather/weather.service';
import { WttrFeaturesComponent } from './features/weather/wttr-features/wttr-features';
import { NavbarComponent } from './layout/navbar/navbar';
import { AboutModalComponent } from './shared/components/about-modal/about-modal';
import { InstructionsModalComponent } from './shared/components/instructions-modal/instructions-modal';

@Component({
  selector: 'app-root',
  imports: [
    NavbarComponent,
    WeatherHeroComponent,
    HourlyForecastComponent,
    DailyForecastComponent,
    WttrFeaturesComponent,
    FavoritesListComponent,
    InstructionsModalComponent,
    AboutModalComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  readonly weatherService = inject(WeatherService);
  readonly themeService = inject(ThemeService);
  readonly i18n = inject(I18nService);

  isInstructionsOpen = signal<boolean>(false);
  isAboutOpen = signal<boolean>(false);

  readonly isAnyModalOpen = computed(() => this.isInstructionsOpen() || this.isAboutOpen());

  constructor() {
    effect(() => {
      if (typeof document !== 'undefined') {
        document.body.classList.toggle('overflow-hidden', this.isAnyModalOpen());
      }
    });
  }

  retryFetch(): void {
    this.weatherService.fetchWeather(this.weatherService.currentQuery());
  }
}
