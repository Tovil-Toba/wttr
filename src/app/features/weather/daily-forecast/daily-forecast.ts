import { Component, inject } from '@angular/core';

import { I18nService } from '../../../core/i18n';
import { WeatherIconComponent } from '../../../shared/components/weather-icon/weather-icon';
import { WeatherDay } from '../weather.model';
import { WeatherService } from '../weather.service';

@Component({
  selector: 'app-daily-forecast',
  imports: [WeatherIconComponent],
  templateUrl: './daily-forecast.html',
  styleUrl: './daily-forecast.scss',
})
export class DailyForecastComponent {
  readonly weatherService = inject(WeatherService);
  readonly i18n = inject(I18nService);

  formatDateRu(dateStr: string, index: number): { dayLabel: string; fullDate: string } {
    return {
      dayLabel: this.i18n.getDayLabel(index, dateStr),
      fullDate: this.i18n.getFullDate(dateStr),
    };
  }
  private formatRussianDate(dateStr: string): string {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'short' });
    } catch {
      return dateStr;
    }
  }

  private formatWeekday(dateStr: string): string {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('ru-RU', { weekday: 'long' });
    } catch {
      return dateStr;
    }
  }

  getMiddayCondition(day: WeatherDay) {
    // Pick the 12:00 or middle hourly forecast
    const mid =
      day.hourly.find((h) => h.time === '1200') || day.hourly[Math.floor(day.hourly.length / 2)];
    const code = mid?.weatherCode || '113';
    const rawDesc = mid?.weatherDesc?.[0]?.value || '';
    const lang = this.weatherService.currentLang();
    const rawLocalized =
      mid?.lang_xx?.[0]?.value || mid?.[`lang_${lang}`]?.[0]?.value || mid?.lang_ru?.[0]?.value;
    return {
      theme: this.weatherService.getWeatherTheme(code, rawDesc),
      descRu: this.weatherService.getWeatherDescription(rawDesc, rawLocalized),
    };
  }

  getMoonInfo(day: WeatherDay) {
    const rawPhase = day.astronomy?.[0]?.moon_phase || 'Full Moon';
    const base = this.weatherService.getMoonPhaseInfo(rawPhase);
    return {
      ...base,
      nameRu: this.i18n.getMoonPhaseName(rawPhase),
    };
  }
}
