import { Component, computed, inject, signal } from '@angular/core';
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

  readonly isShareCopied = signal<boolean>(false);
  readonly isPngDownloading = signal<boolean>(false);

  getConditionEmoji(): string {
    const type = this.weatherTheme().conditionType;
    switch (type) {
      case 'sunny':
        return '☀️';
      case 'clear-night':
        return '🌙';
      case 'partly-cloudy-day':
        return '🌤️';
      case 'partly-cloudy-night':
        return '☁️';
      case 'cloudy':
      case 'overcast':
        return '☁️';
      case 'drizzle':
      case 'rain':
      case 'heavy-rain':
        return '🌧️';
      case 'snow':
      case 'blizzard':
      case 'sleet':
        return '🌨️';
      case 'thunder':
        return '⛈️';
      case 'wind':
        return '💨';
      case 'fog':
        return '🌫️';
      default:
        return '🌤️';
    }
  }

  getFormattedShareText(): string {
    const cur = this.current();
    if (!cur) return '';

    const city = this.cityName();
    const temp = this.weatherService.formatTemp(cur.temp_C, cur.temp_F);
    const feels = this.weatherService.formatTemp(cur.FeelsLikeC, cur.FeelsLikeF);
    const wind = this.weatherService.formatWind(cur.windspeedKmph);
    const humidity = `${cur.humidity}%`;
    const desc = this.weatherDesc();
    const emoji = this.getConditionEmoji();

    const t = this.i18n.dict().share;
    return `${emoji} ${city}: ${temp}, ${desc}\n${t.feelsLike}: ${feels} • ${t.wind}: ${wind} • ${t.humidity}: ${humidity}\n${t.summaryFooter}`;
  }

  async shareForecast(): Promise<void> {
    const cur = this.current();
    if (!cur) return;

    const text = this.getFormattedShareText();
    const url = typeof window !== 'undefined' ? window.location.href : 'https://wttr.app';
    const title = this.i18n.t('share.shareTitle', { city: this.cityName() });

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title,
          text,
          url,
        });
        return;
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
      }
    }

    await this.copyShareText(`${text}\n${url}`);
  }

  private async copyShareText(content: string): Promise<void> {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(content);
      } else {
        this.fallbackCopyText(content);
      }
    } catch {
      this.fallbackCopyText(content);
    }
    this.isShareCopied.set(true);
    setTimeout(() => this.isShareCopied.set(false), 2500);
  }

  private fallbackCopyText(text: string): void {
    if (typeof document === 'undefined') return;
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
    } catch {
      // Ignore
    }
    document.body.removeChild(textarea);
  }

  downloadPng(): void {
    const q = this.weatherService.currentQuery();
    if (!q || typeof document === 'undefined') return;

    const lang = this.weatherService.currentLang();
    const url = `https://wttr.in/${encodeURIComponent(q)}.png?lang=${lang}`;

    this.isPngDownloading.set(true);

    const a = document.createElement('a');
    a.href = url;
    a.download = `wttr-${q}.png`;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setTimeout(() => this.isPngDownloading.set(false), 2500);
  }
}

