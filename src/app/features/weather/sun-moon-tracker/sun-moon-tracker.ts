import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { TooltipModule } from 'primeng/tooltip';

import { I18nService } from '../../../core/i18n';
import { Astronomy, WeatherDay } from '../weather.model';
import { WeatherService } from '../weather.service';

export interface SunPathData {
  sunrise: string;
  sunset: string;
  sunriseRaw: string;
  sunsetRaw: string;
  daylightDuration: string;
  sunHour: string;
  isDay: boolean;
  statusLabel: string;
  progressPercent: number;
  sunX: number;
  sunY: number;
  activePathD: string;
}

export interface MoonTrackerData {
  phaseRaw: string;
  phaseName: string;
  illumination: number;
  moonrise: string;
  moonset: string;
  icon: string;
  isFull: boolean;
  isNew: boolean;
  pathD: string;
}

@Component({
  selector: 'app-sun-moon-tracker',
  standalone: true,
  imports: [CommonModule, TooltipModule],
  templateUrl: './sun-moon-tracker.html',
  styleUrl: './sun-moon-tracker.scss',
})
export class SunMoonTrackerComponent {
  readonly weatherService = inject(WeatherService);
  readonly i18n = inject(I18nService);

  readonly today = computed<WeatherDay | undefined>(() => {
    return this.weatherService.weatherData()?.weather?.[0];
  });

  readonly astro = computed<Astronomy | undefined>(() => {
    return this.today()?.astronomy?.[0];
  });

  private parseTimeToMinutes(timeStr?: string): number {
    if (!timeStr) return 0;
    const s = timeStr.trim().toLowerCase();
    const isPM = s.includes('pm');
    const isAM = s.includes('am');
    const digitsOnly = s.replace(/[^\d:]/g, '');
    const [hStr, mStr] = digitsOnly.split(':');
    let hours = parseInt(hStr || '0', 10);
    const minutes = parseInt(mStr || '0', 10);
    if (isPM && hours < 12) hours += 12;
    if (isAM && hours === 12) hours = 0;
    return hours * 60 + minutes;
  }

  private formatDuration(minutes: number): string {
    const dict = this.i18n.dict();
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h > 0 && m > 0) {
      return `${h} ${dict.common.hours} ${m} ${dict.common.minutes}`;
    }
    if (h > 0) {
      return `${h} ${dict.common.hours}`;
    }
    return `${m} ${dict.common.minutes}`;
  }

  readonly sunPath = computed<SunPathData | null>(() => {
    const astro = this.astro();
    const day = this.today();
    if (!astro || !day) return null;

    const dict = this.i18n.dict();
    const sunriseMin = this.parseTimeToMinutes(astro.sunrise);
    const sunsetMin = this.parseTimeToMinutes(astro.sunset);

    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();

    const daylightMin = Math.max(sunsetMin - sunriseMin, 0);
    const daylightDuration = this.formatDuration(daylightMin);
    const sunHour = `${day.sunHour} ${dict.common.hours}`;

    const isDay = nowMin >= sunriseMin && nowMin <= sunsetMin;

    let progress = 0;
    let statusLabel = '';

    if (isDay && daylightMin > 0) {
      progress = Math.min(Math.max((nowMin - sunriseMin) / daylightMin, 0), 1);
      const remainingMin = Math.max(sunsetMin - nowMin, 0);
      statusLabel = `${this.formatDuration(remainingMin)} ${dict.astro.untilSunset}`;
    } else {
      let remainingUntilSunrise = 0;
      if (nowMin > sunsetMin) {
        remainingUntilSunrise = 1440 - nowMin + sunriseMin;
      } else {
        remainingUntilSunrise = sunriseMin - nowMin;
      }
      statusLabel = `${this.formatDuration(remainingUntilSunrise)} ${dict.astro.untilSunrise}`;
      progress = nowMin > sunsetMin ? 1 : 0;
    }

    // Semi-ellipse arc geometry on 320x125 viewBox:
    // Left horizon at (35, 105), apex at (160, 20), right horizon at (285, 105)
    // Semi-axes: Rx = 125 (span 250 centered at 160), Ry = 85 (height 105 - 20)
    const sunX = Math.round((160 - 125 * Math.cos(Math.PI * progress)) * 10) / 10;
    const sunY = Math.round((105 - 85 * Math.sin(Math.PI * progress)) * 10) / 10;

    const activePathD = isDay && progress > 0 ? `M 35,105 A 125,85 0 0,1 ${sunX},${sunY}` : '';

    return {
      sunrise: this.weatherService.formatTo24Hour(astro.sunrise),
      sunset: this.weatherService.formatTo24Hour(astro.sunset),
      sunriseRaw: astro.sunrise,
      sunsetRaw: astro.sunset,
      daylightDuration,
      sunHour,
      isDay,
      statusLabel,
      progressPercent: Math.round(progress * 100),
      sunX,
      sunY,
      activePathD,
    };
  });

  readonly moonTracker = computed<MoonTrackerData | null>(() => {
    const astro = this.astro();
    if (!astro) return null;

    const rawPhase = astro.moon_phase || 'Full Moon';
    const illumination = Math.min(Math.max(parseInt(astro.moon_illumination || '50', 10), 0), 100);
    const baseInfo = this.weatherService.getMoonPhaseInfo(rawPhase);
    const phaseName = this.i18n.getMoonPhaseName(rawPhase);

    const isFull = illumination >= 98 || rawPhase.toLowerCase().includes('full');
    const isNew = illumination <= 2 || rawPhase.toLowerCase().includes('new');

    const norm = rawPhase.toLowerCase();
    const isWaxing = norm.includes('waxing') || norm.includes('first');
    const p = illumination / 100;
    const R = 34;
    const rx = Math.round(R * Math.abs(2 * p - 1) * 10) / 10;

    let pathD = '';
    if (!isFull && !isNew) {
      if (isWaxing) {
        // Outer right semicircle from top (50, 16) to bottom (50, 84)
        if (p < 0.5) {
          pathD = `M 50,16 A 34,34 0 0,1 50,84 A ${rx},34 0 0,0 50,16 Z`;
        } else if (p > 0.5) {
          pathD = `M 50,16 A 34,34 0 0,1 50,84 A ${rx},34 0 0,1 50,16 Z`;
        } else {
          pathD = `M 50,16 A 34,34 0 0,1 50,84 L 50,16 Z`;
        }
      } else {
        // Waning: outer left semicircle from top (50, 16) to bottom (50, 84)
        if (p < 0.5) {
          pathD = `M 50,16 A 34,34 0 0,0 50,84 A ${rx},34 0 0,1 50,16 Z`;
        } else if (p > 0.5) {
          pathD = `M 50,16 A 34,34 0 0,0 50,84 A ${rx},34 0 0,0 50,16 Z`;
        } else {
          pathD = `M 50,16 A 34,34 0 0,0 50,84 L 50,16 Z`;
        }
      }
    }

    return {
      phaseRaw: rawPhase,
      phaseName,
      illumination,
      moonrise: this.weatherService.formatTo24Hour(astro.moonrise),
      moonset: this.weatherService.formatTo24Hour(astro.moonset),
      icon: baseInfo.icon,
      isFull,
      isNew,
      pathD,
    };
  });
}
