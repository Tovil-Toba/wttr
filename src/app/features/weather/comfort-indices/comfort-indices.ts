import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Tooltip } from 'primeng/tooltip';

import { I18nService } from '../../../core/i18n';
import { WeatherService } from '../weather.service';
import { CurrentCondition, HourlyWeather, WeatherDay } from '../weather.model';

export interface UvData {
  value: number;
  label: string;
  advice: string;
  colorClass: string;
  badgeBg: string;
  percent: number;
}

export interface WindData {
  speed: string;
  gustSpeed: string | null;
  hasGustWarning: boolean;
  degree: number;
  dir16: string;
  statusLabel: string;
}

export interface PrecipData {
  rainChance: number;
  snowChance: number;
  thunderChance: number;
  amountMM: string;
  hasHighRisk: boolean;
  statusLabel: string;
}

export interface AirData {
  dewPoint: string;
  dewPointC: number;
  humidity: number;
  comfortLabel: string;
  snowCoverCm: number;
  visibilityKm: string;
}

@Component({
  selector: 'app-comfort-indices',
  imports: [CommonModule, Tooltip],
  templateUrl: './comfort-indices.html',
  styleUrl: './comfort-indices.scss',
})
export class ComfortIndicesComponent {
  readonly weatherService = inject(WeatherService);
  readonly i18n = inject(I18nService);

  readonly currentCondition = computed<CurrentCondition | null>(() => {
    return this.weatherService.currentCondition();
  });

  readonly today = computed<WeatherDay | null>(() => {
    const days = this.weatherService.threeDaysForecast();
    return days[0] ?? null;
  });

  readonly nearestHourly = computed<HourlyWeather | null>(() => {
    const day = this.today();
    if (!day || !day.hourly || day.hourly.length === 0) return null;
    const now = new Date();
    const currentHourMinutes = now.getHours() * 100 + now.getMinutes();

    let closest = day.hourly[0];
    let minDiff = Infinity;
    for (const h of day.hourly) {
      const hTime = parseInt(h.time, 10);
      const diff = Math.abs(hTime - currentHourMinutes);
      if (diff < minDiff) {
        minDiff = diff;
        closest = h;
      }
    }
    return closest;
  });

  readonly uvInfo = computed<UvData>(() => {
    const cur = this.currentCondition();
    const hourly = this.nearestHourly();
    const day = this.today();
    const rawVal = Number(cur?.uvIndex ?? hourly?.uvIndex ?? day?.uvIndex ?? 0);
    const val = isNaN(rawVal) ? 0 : rawVal;
    const dict = this.i18n.dict();

    let label = dict.hero.uvLow;
    let advice = dict.comfort.uvAdviceLow;
    let colorClass = 'text-emerald-500';
    let badgeBg = 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';

    if (val >= 11) {
      label = dict.hero.uvExtreme;
      advice = dict.comfort.uvAdviceExtreme;
      colorClass = 'text-purple-500';
      badgeBg = 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
    } else if (val >= 8) {
      label = dict.hero.uvVeryHigh;
      advice = dict.comfort.uvAdviceVeryHigh;
      colorClass = 'text-rose-500';
      badgeBg = 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
    } else if (val >= 6) {
      label = dict.hero.uvHigh;
      advice = dict.comfort.uvAdviceHigh;
      colorClass = 'text-orange-500';
      badgeBg = 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20';
    } else if (val >= 3) {
      label = dict.hero.uvModerate;
      advice = dict.comfort.uvAdviceModerate;
      colorClass = 'text-amber-500';
      badgeBg = 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
    }

    const percent = Math.min(Math.max(Math.round((val / 11) * 100), 0), 100);

    return {
      value: val,
      label,
      advice,
      colorClass,
      badgeBg,
      percent,
    };
  });

  readonly windInfo = computed<WindData>(() => {
    const cur = this.currentCondition();
    const hourly = this.nearestHourly();
    const dict = this.i18n.dict();

    const speedKmh = Number(cur?.windspeedKmph || 0);
    const gustKmh = Number(hourly?.WindGustKmph || 0);
    const speed = this.weatherService.formatWind(speedKmh);
    const gustSpeed = gustKmh > 0 ? this.weatherService.formatWind(gustKmh) : null;
    const hasGustWarning = gustKmh > speedKmh * 1.35 && gustKmh >= 28;

    let statusLabel = dict.comfort.lightBreeze;
    if (speedKmh >= 62 || gustKmh >= 70) {
      statusLabel = dict.comfort.stormWind;
    } else if (speedKmh >= 39 || gustKmh >= 45) {
      statusLabel = dict.comfort.gustyWind;
    } else if (speedKmh >= 20) {
      statusLabel = dict.comfort.moderateWind;
    } else if (speedKmh < 6) {
      statusLabel = dict.comfort.calm;
    }

    return {
      speed,
      gustSpeed,
      hasGustWarning,
      degree: Number(cur?.winddirDegree || 0),
      dir16: cur?.winddir16Point || '',
      statusLabel,
    };
  });

  readonly precipInfo = computed<PrecipData>(() => {
    const cur = this.currentCondition();
    const hourly = this.nearestHourly();
    const dict = this.i18n.dict();

    const rainChance = Math.max(0, Math.min(100, Number(hourly?.chanceofrain || 0)));
    const snowChance = Math.max(0, Math.min(100, Number(hourly?.chanceofsnow || 0)));
    const thunderChance = Math.max(0, Math.min(100, Number(hourly?.chanceofthunder || 0)));
    const amountMM = cur?.precipMM || '0.0';

    const maxChance = Math.max(rainChance, snowChance, thunderChance);
    const hasHighRisk = maxChance >= 50 || Number(amountMM) > 1.0;

    let statusLabel = dict.comfort.noPrecip;
    if (thunderChance >= 40) {
      statusLabel = dict.comfort.thunderChance;
    } else if (snowChance >= 40) {
      statusLabel = dict.comfort.snowChance;
    } else if (rainChance >= 40 || Number(amountMM) > 0.5) {
      statusLabel = dict.comfort.rainChance;
    }

    return {
      rainChance,
      snowChance,
      thunderChance,
      amountMM,
      hasHighRisk,
      statusLabel,
    };
  });

  readonly airInfo = computed<AirData>(() => {
    const cur = this.currentCondition();
    const hourly = this.nearestHourly();
    const day = this.today();
    const dict = this.i18n.dict();

    const dewPointC = Number(hourly?.DewPointC ?? cur?.temp_C ?? 0);
    const dewPointF = Number(hourly?.DewPointF ?? cur?.temp_F ?? 32);
    const dewPoint = this.weatherService.formatTemp(dewPointC, dewPointF);
    const humidity = Number(cur?.humidity || 0);

    let comfortLabel = dict.comfort.comfortableAir;
    if (dewPointC >= 21) {
      comfortLabel = dict.comfort.muggyAir;
    } else if (dewPointC >= 16) {
      comfortLabel = dict.comfort.humidAir;
    } else if (dewPointC < 10 && humidity < 50) {
      comfortLabel = dict.comfort.dryAir;
    }

    const snowCoverCm = Number(day?.totalSnow_cm || 0);
    const visibilityKm = cur?.visibility || '10';

    return {
      dewPoint,
      dewPointC,
      humidity,
      comfortLabel,
      snowCoverCm,
      visibilityKm,
    };
  });
}
