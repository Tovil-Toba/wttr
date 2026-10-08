import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Tooltip } from 'primeng/tooltip';

import { I18nService } from '../../core/i18n';
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
  readonly isLangMenuOpen = this.weatherService.isLangMenuOpen;

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
