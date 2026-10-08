import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Tooltip } from 'primeng/tooltip';

import { I18nService } from '../../core/i18n';
import { CANONICAL_CITIES } from '../../core/i18n/cities.dict';
import { ThemeService } from '../../core/theme.service';
import { PressureUnit, TempUnit, WindUnit } from '../../features/weather/weather.model';
import { WeatherService } from '../../features/weather/weather.service';

@Component({
  selector: 'app-navbar',
  imports: [FormsModule, Tooltip],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
})
export class NavbarComponent {
  readonly weatherService = inject(WeatherService);
  readonly themeService = inject(ThemeService);
  readonly i18n = inject(I18nService);

  searchQuery = signal<string>('');
  isSettingsOpen = signal<boolean>(false);
  isSuggestionsOpen = signal<boolean>(false);
  readonly isLangMenuOpen = this.weatherService.isLangMenuOpen;

  readonly popularCityPresets = [
    { query: 'Moscow', countryCode: 'RU' },
    { query: 'Saint Petersburg', countryCode: 'RU' },
    { query: 'London', countryCode: 'GB' },
    { query: 'Tokyo', countryCode: 'JP' },
    { query: 'New York', countryCode: 'US' },
    { query: 'Dubai', countryCode: 'AE' },
    { query: 'Paris', countryCode: 'FR' },
    { query: 'Berlin', countryCode: 'DE' },
    { query: 'Rome', countryCode: 'IT' },
    { query: 'Istanbul', countryCode: 'TR' },
  ];

  readonly recentSearches = computed(() => {
    return this.weatherService.searchHistory().slice(0, 5);
  });

  readonly matchingCities = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    if (!q) return [];

    const lang = this.weatherService.currentLang();
    const results: Array<{ query: string; displayName: string; countryCode: string }> = [];

    for (const city of CANONICAL_CITIES) {
      const localizedName = city.names[lang] || city.names['en'] || city.id;
      const matchesAlias = city.aliases.some((a) => a.toLowerCase().includes(q));
      const matchesName = Object.values(city.names).some((n) => n.toLowerCase().includes(q));
      const matchesId = city.id.toLowerCase().includes(q);

      if (matchesAlias || matchesName || matchesId) {
        const query = city.names['en'] || city.id;
        results.push({
          query,
          displayName: localizedName,
          countryCode: city.countryCode,
        });
        if (results.length >= 6) break;
      }
    }
    return results;
  });

  openSuggestions(): void {
    this.isSuggestionsOpen.set(true);
  }

  closeSuggestions(): void {
    this.isSuggestionsOpen.set(false);
  }

  selectCity(query: string): void {
    this.weatherService.fetchWeather(query);
    this.searchQuery.set('');
    this.isSuggestionsOpen.set(false);
  }

  clearRecentHistory(event: MouseEvent): void {
    event.stopPropagation();
    this.weatherService.clearHistory();
  }

  removeRecentItem(query: string, event: MouseEvent): void {
    event.stopPropagation();
    this.weatherService.removeFromHistory(query);
  }

  toggleLangMenu(): void {
    this.weatherService.toggleLangMenu();
  }

  selectLanguage(code: string): void {
    this.weatherService.setLanguage(code);
    this.weatherService.closeLangMenu();
  }

  readonly quickPresets = computed(() => [
    { label: this.i18n.translateCity('Obninsk'), query: 'Obninsk' },
    { label: this.i18n.translateCity('Moscow'), query: 'Moscow' },
    { label: this.i18n.translateCity('Saint Petersburg'), query: 'Saint Petersburg' },
    { label: this.i18n.translateCity('Sochi'), query: 'Sochi' },
    { label: this.i18n.translateCity('Kazan'), query: 'Kazan' },
    { label: this.i18n.translateCity('Novosibirsk'), query: 'Novosibirsk' },
    { label: this.i18n.translateCity('Vladivostok'), query: 'Vladivostok' },
    { label: this.i18n.translateCity('London'), query: 'London' },
    { label: this.i18n.translateCity('Tokyo'), query: 'Tokyo' },
    { label: this.i18n.translateCity('svo'), query: 'svo' },
  ]);

  onSearch(): void {
    const q = this.searchQuery().trim();
    if (q) {
      this.weatherService.fetchWeather(q);
      this.searchQuery.set('');
      this.isSuggestionsOpen.set(false);
    }
  }

  selectPreset(query: string): void {
    this.weatherService.fetchWeather(query);
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  locateMe(): void {
    this.weatherService.fetchByCurrentLocation();
  }

  setTempUnit(unit: TempUnit): void {
    this.weatherService.setTempUnit(unit);
  }

  setWindUnit(unit: WindUnit): void {
    this.weatherService.setWindUnit(unit);
  }

  setPressureUnit(unit: PressureUnit): void {
    this.weatherService.setPressureUnit(unit);
  }

  toggleSettings(): void {
    this.isSettingsOpen.update((v) => !v);
  }
}
