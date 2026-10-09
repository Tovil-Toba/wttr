import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Tooltip } from 'primeng/tooltip';

import { I18nService } from '../../core/i18n';
import { CANONICAL_CITIES } from '../../core/i18n/cities.dict';
import { PwaInstallService } from '../../core/pwa-install.service';
import { ThemeService } from '../../core/theme.service';
import { PressureUnit, TempUnit, WindUnit } from '../../features/weather/weather.model';
import { WeatherService } from '../../features/weather/weather.service';
import { IosInstallModalComponent } from '../../shared/components/ios-install-modal/ios-install-modal';

@Component({
  selector: 'app-navbar',
  imports: [FormsModule, Tooltip, IosInstallModalComponent],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
})
export class NavbarComponent {
  readonly weatherService = inject(WeatherService);
  readonly themeService = inject(ThemeService);
  readonly i18n = inject(I18nService);
  readonly pwaInstall = inject(PwaInstallService);

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

  readonly isFiltering = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    if (!q) return false;
    const cur = this.weatherService.currentQuery().toLowerCase();
    const curTrans = this.i18n.translateCity(this.weatherService.currentQuery()).toLowerCase();
    return q !== cur && q !== curTrans;
  });

  readonly matchingCities = computed(() => {
    if (!this.isFiltering()) return [];
    const q = this.searchQuery().trim().toLowerCase();

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

  onFocusSearch(event: FocusEvent): void {
    this.openSuggestions();
    const input = event.target as HTMLInputElement | null;
    input?.select();
  }

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

  clearSearch(event?: MouseEvent): void {
    event?.stopPropagation();
    this.searchQuery.set('');
    this.openSuggestions();
    const input = document.getElementById('main-city-search') as HTMLInputElement | null;
    input?.focus();
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
      const input = document.getElementById('main-city-search') as HTMLInputElement | null;
      input?.blur();
    }
  }

  selectPreset(query: string): void {
    this.weatherService.fetchWeather(query);
    this.searchQuery.set('');
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

  installApp(): void {
    this.pwaInstall.install();
  }
}
