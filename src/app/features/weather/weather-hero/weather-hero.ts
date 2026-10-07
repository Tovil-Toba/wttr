import { Component, computed, inject } from '@angular/core';
import { Tag } from 'primeng/tag';
import { Tooltip } from 'primeng/tooltip';

import { I18nService } from '../../../core/i18n';
import { WeatherIconComponent } from '../../../shared/components/weather-icon/weather-icon';
import { WeatherService } from '../weather.service';

@Component({
  selector: 'app-weather-hero',
  imports: [Tag, Tooltip, WeatherIconComponent],
  templateUrl: './weather-hero.html',
  styleUrl: './weather-hero.scss',
})
export class WeatherHeroComponent {
  readonly weatherService = inject(WeatherService);
  readonly i18n = inject(I18nService);

  readonly current = this.weatherService.currentCondition;
  readonly area = this.weatherService.nearestArea;
  readonly day0 = computed(() => this.weatherService.threeDaysForecast()[0] ?? null);

  readonly cityName = computed(() => {
    const rawArea = this.area()?.areaName?.[0]?.value || '';
    const query = this.weatherService.currentQuery();
    return this.i18n.translateCity(rawArea || query, query);
  });

  readonly countryName = computed(() => {
    const rawCountry = this.area()?.country?.[0]?.value || '';
    const query = this.weatherService.currentQuery();
    return this.i18n.translateCountry(rawCountry, query);
  });

  readonly weatherDesc = computed(() => {
    const cur = this.current();
    const rawEn = cur?.weatherDesc?.[0]?.value || '';
    const lang = this.weatherService.currentLang();
    const rawLocalized =
      cur?.lang_xx?.[0]?.value || cur?.[`lang_${lang}`]?.[0]?.value || cur?.lang_ru?.[0]?.value;
    return this.weatherService.getWeatherDescription(rawEn, rawLocalized);
  });

  readonly isNight = computed(() => {
    const cur = this.current();
    if (!cur) return false;
    const astro = this.day0()?.astronomy?.[0];
    if (astro?.sunrise && astro?.sunset) {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const parseTimeToMinutes = (timeStr: string) => {
        const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
        if (!match) return null;
        let h = parseInt(match[1], 10);
        const m = parseInt(match[2], 10);
        const p = match[3].toUpperCase();
        if (p === 'PM' && h < 12) h += 12;
        if (p === 'AM' && h === 12) h = 0;
        return h * 60 + m;
      };
      const sunriseMin = parseTimeToMinutes(astro.sunrise);
      const sunsetMin = parseTimeToMinutes(astro.sunset);
      if (sunriseMin !== null && sunsetMin !== null) {
        return currentMinutes < sunriseMin || currentMinutes >= sunsetMin;
      }
    }
    const hour = new Date().getHours();
    return hour < 6 || hour >= 21;
  });

  readonly weatherTheme = computed(() => {
    const code = this.current()?.weatherCode || '';
    const desc = this.current()?.weatherDesc?.[0]?.value || '';
    return this.weatherService.getWeatherTheme(code, desc, this.isNight());
  });

  readonly uvRiskLevel = computed(() => {
    const uv = Number(this.current()?.uvIndex || 0);
    const d = this.i18n.dict().hero;
    if (uv <= 2) return { label: d.uvLow, color: 'text-emerald-500' };
    if (uv <= 5) return { label: d.uvModerate, color: 'text-amber-500' };
    if (uv <= 7) return { label: d.uvHigh, color: 'text-orange-500' };
    if (uv <= 10) return { label: d.uvVeryHigh, color: 'text-rose-500' };
    return { label: d.uvExtreme, color: 'text-purple-600' };
  });

  toggleFavorite(): void {
    this.weatherService.toggleFavorite();
  }
}
