import {
  AfterViewInit,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Tooltip } from 'primeng/tooltip';

import { I18nService } from '../../../core/i18n';
import { WeatherIconComponent } from '../../../shared/components/weather-icon/weather-icon';
import { HourlyWeather } from '../weather.model';
import { WeatherService } from '../weather.service';

@Component({
  selector: 'app-hourly-forecast',
  imports: [Tooltip, WeatherIconComponent],
  host: {
    '(window:resize)': 'onResize()',
  },
  templateUrl: './hourly-forecast.html',
  styleUrl: './hourly-forecast.scss',
})
export class HourlyForecastComponent implements AfterViewInit {
  readonly weatherService = inject(WeatherService);
  readonly i18n = inject(I18nService);

  readonly scrollContainer = viewChild<ElementRef<HTMLDivElement>>('scrollContainer');

  selectedDayIndex = signal<number>(0);
  canScrollLeft = signal<boolean>(false);
  canScrollRight = signal<boolean>(false);

  readonly currentDay = computed(() => {
    const days = this.weatherService.threeDaysForecast();
    return days[this.selectedDayIndex()] ?? null;
  });

  readonly hourlyList = computed(() => {
    return this.currentDay()?.hourly ?? [];
  });

  constructor() {
    effect(() => {
      // Re-check scroll buttons when forecast data updates
      this.weatherService.threeDaysForecast();
      setTimeout(() => this.checkScroll(), 150);
    });
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.checkScroll(), 150);
  }

  onResize(): void {
    this.checkScroll();
  }

  checkScroll(): void {
    const el = this.scrollContainer()?.nativeElement;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    this.canScrollLeft.set(scrollLeft > 4);
    this.canScrollRight.set(scrollLeft < scrollWidth - clientWidth - 4);
  }

  scrollLeft(): void {
    const el = this.scrollContainer()?.nativeElement;
    if (el) {
      el.scrollBy({ left: -280, behavior: 'smooth' });
      setTimeout(() => this.checkScroll(), 320);
    }
  }

  scrollRight(): void {
    const el = this.scrollContainer()?.nativeElement;
    if (el) {
      el.scrollBy({ left: 280, behavior: 'smooth' });
      setTimeout(() => this.checkScroll(), 320);
    }
  }

  selectDay(index: number): void {
    this.selectedDayIndex.set(index);
    setTimeout(() => {
      const el = this.scrollContainer()?.nativeElement;
      if (el) {
        el.scrollTo({ left: 0, behavior: 'smooth' });
      }
      this.checkScroll();
    }, 50);
  }

  formatHourTime(rawTime: string): string {
    const num = Number(rawTime);
    const hour = Math.floor(num / 100);
    return `${hour.toString().padStart(2, '0')}:00`;
  }

  getWeatherTheme(item: HourlyWeather) {
    const code = item.weatherCode;
    const desc = item.weatherDesc?.[0]?.value || '';
    const hour = Math.floor(Number(item.time) / 100);
    const isNight = hour < 6 || hour >= 21;
    return this.weatherService.getWeatherTheme(code, desc, isNight);
  }

  getDescriptionRu(item: HourlyWeather): string {
    const rawEn = item.weatherDesc?.[0]?.value || '';
    const lang = this.weatherService.currentLang();
    const rawLocalized =
      item.lang_xx?.[0]?.value || item[`lang_${lang}`]?.[0]?.value || item.lang_ru?.[0]?.value;
    return this.weatherService.getWeatherDescription(rawEn, rawLocalized);
  }

  getDayLabel(index: number, dateStr: string): string {
    return this.i18n.getDayLabel(index, dateStr);
  }
}
