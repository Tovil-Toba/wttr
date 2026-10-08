import { CommonModule } from '@angular/common';
import { Component, computed, HostListener, inject, OnInit, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TooltipModule } from 'primeng/tooltip';

import { I18nService } from '../../../core/i18n';
import { WeatherIconComponent } from '../../../shared/components/weather-icon/weather-icon';
import { CurrentCondition, WeatherDay, WttrResponse } from '../weather.model';
import { WeatherService } from '../weather.service';

export interface ComparedCityMetrics {
  name: string;
  country: string;
  conditionDesc: string;
  conditionType: any;
  tempFormatted: string;
  tempC: number;
  feelsLikeFormatted: string;
  feelsLikeC: number;
  humidity: number;
  windFormatted: string;
  windKmph: number;
  pressureFormatted: string;
  uvIndex: number;
  rainChance: number;
}

@Component({
  selector: 'app-weather-compare-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, TooltipModule, WeatherIconComponent],
  templateUrl: './weather-compare-modal.html',
  styleUrl: './weather-compare-modal.scss',
})
export class WeatherCompareModalComponent implements OnInit {
  readonly weatherService = inject(WeatherService);
  readonly i18n = inject(I18nService);

  readonly close = output<void>();

  searchQuery = signal<string>('');
  compareCity = signal<string>('');
  compareData = signal<WttrResponse | null>(null);
  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  // Quick suggestions list
  readonly quickSuggestions = computed(() => {
    const current = (this.weatherService.currentQuery() || '').toLowerCase();
    const suggestions: { name: string; isFav: boolean }[] = [];

    // Add favorites first
    this.weatherService.favorites().forEach((fav) => {
      if (fav.name.toLowerCase() !== current && fav.query.toLowerCase() !== current) {
        suggestions.push({ name: fav.name, isFav: true });
      }
    });

    // Add curated destinations
    const defaults = ['Сочи', 'Санкт-Петербург', 'Москва', 'Лондон', 'Дубай', 'Токио', 'Париж'];
    defaults.forEach((cityName) => {
      if (
        cityName.toLowerCase() !== current &&
        !suggestions.some((s) => s.name.toLowerCase() === cityName.toLowerCase())
      ) {
        suggestions.push({ name: cityName, isFav: false });
      }
    });

    return suggestions.slice(0, 6);
  });

  // City 1: Current Active City
  readonly city1 = computed<ComparedCityMetrics | null>(() => {
    const data = this.weatherService.weatherData();
    if (!data) return null;
    return this.extractMetrics(data, this.weatherService.currentQuery());
  });

  // City 2: Compared Target City
  readonly city2 = computed<ComparedCityMetrics | null>(() => {
    const data = this.compareData();
    if (!data) return null;
    return this.extractMetrics(data, this.compareCity());
  });

  // Comparison Deltas
  readonly delta = computed(() => {
    const c1 = this.city1();
    const c2 = this.city2();
    if (!c1 || !c2) return null;

    const tempDiff = c2.tempC - c1.tempC;
    const feelsDiff = c2.feelsLikeC - c1.feelsLikeC;
    const windDiff = c2.windKmph - c1.windKmph;
    const humidityDiff = c2.humidity - c1.humidity;
    const rainDiff = c2.rainChance - c1.rainChance;

    let headline = '';
    let headlineType: 'warmer' | 'colder' | 'equal' = 'equal';

    if (tempDiff === 0) {
      headline = this.i18n.dict().compare.sameTemp;
      headlineType = 'equal';
    } else if (tempDiff > 0) {
      headline = this.i18n.t('compare.warmerThan', {
        city2: c2.name,
        city1: c1.name,
        diff: `+${tempDiff}°`,
      });
      headlineType = 'warmer';
    } else {
      headline = this.i18n.t('compare.colderThan', {
        city2: c2.name,
        city1: c1.name,
        diff: `${Math.abs(tempDiff)}°`,
      });
      headlineType = 'colder';
    }

    return {
      tempDiff,
      feelsDiff,
      windDiff,
      humidityDiff,
      rainDiff,
      headline,
      headlineType,
    };
  });

  ngOnInit(): void {
    const preselected = this.weatherService.compareTargetCity();
    if (preselected) {
      this.loadCompareCity(preselected);
    } else {
      // Pick default: first favorite or Sochi/London
      const current = (this.weatherService.currentQuery() || '').toLowerCase();
      const firstFav = this.weatherService
        .favorites()
        .find((f) => f.query.toLowerCase() !== current && f.name.toLowerCase() !== current);
      if (firstFav) {
        this.loadCompareCity(firstFav.query);
      } else {
        const fallback = current.includes('сочи') || current.includes('sochi') ? 'Москва' : 'Сочи';
        this.loadCompareCity(fallback);
      }
    }
  }

  async loadCompareCity(cityName: string): Promise<void> {
    const clean = cityName.trim();
    if (!clean) return;

    this.compareCity.set(clean);
    this.searchQuery.set(clean);
    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      const data = await this.weatherService.fetchComparisonWeather(clean);
      this.compareData.set(data);
    } catch {
      this.errorMessage.set(this.i18n.dict().compare.error);
    } finally {
      this.isLoading.set(false);
    }
  }

  isSelectedCity(cityName: string): boolean {
    return this.compareCity().toLowerCase() === cityName.trim().toLowerCase();
  }

  onSearch(event?: Event): void {
    if (event) {
      event.preventDefault();
    }
    const q = this.searchQuery().trim();
    if (q) {
      this.loadCompareCity(q);
    }
  }

  swapCities(): void {
    const c2 = this.compareCity();
    const c1 = this.weatherService.currentQuery();
    if (!c2 || !c1) return;

    // Set new main query in weather service
    this.weatherService.fetchWeather(c2);
    // Reload former city as comparison city
    this.loadCompareCity(c1);
  }

  makePrimary(): void {
    const target = this.compareCity();
    if (target) {
      this.weatherService.fetchWeather(target);
      this.close.emit();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.close.emit();
  }

  private extractMetrics(data: WttrResponse, fallbackName: string): ComparedCityMetrics {
    const cur: CurrentCondition | undefined = data.current_condition?.[0];
    const today: WeatherDay | undefined = data.weather?.[0];
    const area = data.nearest_area?.[0];

    const rawName = area?.areaName?.[0]?.value || fallbackName;
    const name = this.i18n.translateCity(rawName, fallbackName);
    const rawCountry = area?.country?.[0]?.value || '';
    const country = this.i18n.translateCountry(rawCountry, fallbackName);

    const tempC = parseInt(cur?.temp_C || '0', 10);
    const feelsLikeC = parseInt(cur?.FeelsLikeC || '0', 10);
    const humidity = parseInt(cur?.humidity || '0', 10);
    const windKmph = parseInt(cur?.windspeedKmph || '0', 10);
    const uvIndex = parseInt(cur?.uvIndex || '0', 10);

    const rainChance = Math.max(
      ...(today?.hourly || []).map((h) => parseInt(h.chanceofrain || '0', 10)),
      0,
    );

    const weatherCode = cur?.weatherCode || '113';
    const rawDesc = cur?.weatherDesc?.[0]?.value || '';
    const lang = this.weatherService.currentLang();
    const rawLocalized =
      (cur as any)?.[`lang_${lang}`]?.[0]?.value || (cur as any)?.lang_ru?.[0]?.value;
    const conditionDesc = this.weatherService.getWeatherDescription(rawDesc, rawLocalized);

    const hour = new Date().getHours();
    const isNight = hour < 6 || hour >= 21;
    const theme = this.weatherService.getWeatherTheme(weatherCode, rawDesc, isNight);

    return {
      name,
      country,
      conditionDesc,
      conditionType: theme.conditionType,
      tempFormatted: this.weatherService.formatTemp(cur?.temp_C, cur?.temp_F),
      tempC,
      feelsLikeFormatted: this.weatherService.formatTemp(cur?.FeelsLikeC, cur?.FeelsLikeF),
      feelsLikeC,
      humidity,
      windFormatted: this.weatherService.formatWind(cur?.windspeedKmph),
      windKmph,
      pressureFormatted: this.weatherService.formatPressure(cur?.pressure),
      uvIndex,
      rainChance,
    };
  }
}
