import { Component, computed, inject, input, output, signal } from '@angular/core';

import { I18nService } from '../../../../../core/i18n';
import { WeatherService } from '../../../weather.service';

@Component({
  selector: 'app-tab-oneline',
  imports: [],
  templateUrl: './tab-oneline.html',
})
export class TabOnelineComponent {
  readonly weatherService = inject(WeatherService);
  readonly i18n = inject(I18nService);

  query = input.required<string>();
  copyCommand = output<string>();

  oneLineFormat = signal<number>(3);
  copied = signal<boolean>(false);

  readonly oneLinePreview = computed(() => {
    const cur = this.weatherService.currentCondition();
    const area = this.weatherService.nearestArea();
    if (!cur) return '';
    const loc = area?.areaName?.[0]?.value || this.query();
    const temp = this.weatherService.formatTemp(cur.temp_C, cur.temp_F);
    const wind = this.weatherService.formatWind(cur.windspeedKmph);
    const rawEn = cur.weatherDesc?.[0]?.value || '';
    const localizedKey = `lang_${this.weatherService.currentLang()}`;
    const rawLocalized = (cur as any)[localizedKey]?.[0]?.value;
    const desc = this.weatherService.getWeatherDescription(rawEn, rawLocalized);

    switch (this.oneLineFormat()) {
      case 1:
        return `🌦 ${temp}`;
      case 2:
        return `🌦 🌡️${temp} 🌬️${wind}`;
      case 3:
        return `${loc}: 🌦 ${temp}`;
      case 4:
      default:
        return `${loc}: 🌦 🌡️${temp} 🌬️${wind} (${desc})`;
    }
  });

  readonly oneLineCurl = computed(() => {
    return `curl 'wttr.in/${encodeURIComponent(this.query())}?format=${this.oneLineFormat()}&lang=${this.weatherService.currentLang()}'`;
  });

  onCopy(): void {
    this.copied.set(true);
    this.copyCommand.emit(this.oneLineCurl());
    setTimeout(() => this.copied.set(false), 2000);
  }
}
