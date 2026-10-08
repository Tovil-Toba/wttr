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

export interface HourlyChartPoint {
  index: number;
  time: string;
  rawHour: HourlyWeather;
  tempVal: number;
  tempFormatted: string;
  feelsLikeFormatted: string;
  rainChance: number;
  x: number;
  y: number;
  barHeight: number;
  barY: number;
  theme: any;
  desc: string;
}

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
  viewMode = signal<'cards' | 'chart'>('cards');
  hoveredPointIndex = signal<number | null>(null);

  canScrollLeft = signal<boolean>(false);
  canScrollRight = signal<boolean>(false);

  readonly currentDay = computed(() => {
    const days = this.weatherService.threeDaysForecast();
    return days[this.selectedDayIndex()] ?? null;
  });

  readonly hourlyList = computed(() => {
    return this.currentDay()?.hourly ?? [];
  });

  readonly chartPoints = computed<HourlyChartPoint[]>(() => {
    const list = this.hourlyList();
    if (!list || list.length === 0) return [];

    const isF = this.weatherService.settings().tempUnit === 'F';
    const temps = list.map((item) => Number(isF ? item.tempF : item.tempC) || 0);

    let minT = Math.min(...temps);
    let maxT = Math.max(...temps);
    let range = maxT - minT;
    if (range < 3) {
      range = 3;
      minT -= 1;
      maxT += 2;
    }

    const width = 800;
    const paddingX = 50;
    const step = (width - paddingX * 2) / Math.max(1, list.length - 1);

    const yMin = 48; // Peak temperature height
    const yMax = 118; // Low temperature height

    const barBaseY = 196;
    const maxBarH = 34;

    return list.map((item, idx) => {
      const t = temps[idx];
      const norm = (t - minT) / range;
      const x = paddingX + idx * step;
      const y = yMax - norm * (yMax - yMin);

      const rainChance = Math.max(0, Math.min(100, Number(item.chanceofrain) || 0));
      const barH = (rainChance / 100) * maxBarH;
      const barY = barBaseY - barH;

      const formatted = isF
        ? `${t > 0 ? '+' : ''}${Math.round(t)}°F`
        : `${t > 0 ? '+' : ''}${Math.round(t)}°C`;

      const feels = isF ? `${item.FeelsLikeF}°F` : `${item.FeelsLikeC}°C`;

      return {
        index: idx,
        time: this.formatHourTime(item.time),
        rawHour: item,
        tempVal: t,
        tempFormatted: formatted,
        feelsLikeFormatted: feels,
        rainChance,
        x,
        y,
        barHeight: barH,
        barY,
        theme: this.getWeatherTheme(item),
        desc: this.getDescriptionRu(item),
      };
    });
  });

  readonly smoothLinePath = computed(() => {
    return this.generateSmoothPath(this.chartPoints());
  });

  readonly smoothAreaPath = computed(() => {
    const pts = this.chartPoints();
    if (pts.length < 2) return '';
    const line = this.smoothLinePath();
    const lastX = pts[pts.length - 1].x;
    const firstX = pts[0].x;
    return `${line} L ${lastX},152 L ${firstX},152 Z`;
  });

  readonly hoveredPoint = computed(() => {
    const idx = this.hoveredPointIndex();
    if (idx === null) return null;
    return this.chartPoints()[idx] ?? null;
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
    this.hoveredPointIndex.set(null);
    setTimeout(() => {
      const el = this.scrollContainer()?.nativeElement;
      if (el) {
        el.scrollTo({ left: 0, behavior: 'smooth' });
      }
      this.checkScroll();
    }, 50);
  }

  setViewMode(mode: 'cards' | 'chart'): void {
    this.viewMode.set(mode);
    if (mode === 'cards') {
      setTimeout(() => this.checkScroll(), 100);
    }
  }

  setHoveredPoint(idx: number | null): void {
    this.hoveredPointIndex.set(idx);
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

  private generateSmoothPath(points: { x: number; y: number }[]): string {
    if (points.length < 2) return '';
    let path = `M ${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(0, i - 1)];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[Math.min(points.length - 1, i + 2)];

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      path += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
    }
    return path;
  }
}
