import { computed, inject, Injectable } from '@angular/core';

import { WeatherService } from '../../features/weather/weather.service';
import { CITY_LOOKUP_MAP, COUNTRY_NAME_TO_CODE } from './cities.dict';
import { TranslationDictionary } from './i18n.model';
import { enTranslations, ruTranslations, TRANSLATION_MAP } from './translations';

@Injectable({
  providedIn: 'root',
})
export class I18nService {
  private readonly weatherService = inject(WeatherService);

  readonly currentLang = computed(() => {
    return (this.weatherService.currentLang() || 'ru').toLowerCase();
  });

  readonly dict = computed<TranslationDictionary>(() => {
    const lang = this.currentLang();
    const specific = TRANSLATION_MAP[lang];
    const base = ['ru', 'be', 'kk'].includes(lang) ? ruTranslations : enTranslations;
    if (!specific) {
      return base;
    }
    return this.deepMerge(base, specific);
  });

  t(path: string, params?: Record<string, string | number>): string {
    const parts = path.split('.');
    let current: any = this.dict();

    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        // Fallback to English dictionary
        let fallback: any = enTranslations;
        for (const p of parts) {
          fallback = fallback?.[p];
        }
        current = fallback || path;
        break;
      }
    }

    let text = typeof current === 'string' ? current : path;
    if (params) {
      for (const [key, val] of Object.entries(params)) {
        text = text.replace(new RegExp(`\\{${key}\\}`, 'g'), String(val));
      }
    }
    return text;
  }

  getLocale(lang?: string): string {
    const l = (lang || this.currentLang()).toLowerCase();
    const map: Record<string, string> = {
      ru: 'ru-RU',
      en: 'en-US',
      be: 'be-BY',
      de: 'de-DE',
      es: 'es-ES',
      fr: 'fr-FR',
      it: 'it-IT',
      ja: 'ja-JP',
      kk: 'kk-KZ',
      'pt-br': 'pt-BR',
      tr: 'tr-TR',
      'zh-cn': 'zh-CN',
    };
    return map[l] || l;
  }

  formatDate(dateInput: string | Date, options?: Intl.DateTimeFormatOptions): string {
    try {
      const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
      if (isNaN(d.getTime())) return String(dateInput);
      return d.toLocaleDateString(this.getLocale(), options);
    } catch {
      return String(dateInput);
    }
  }

  getDayLabel(index: number, dateStr?: string): string {
    const d = this.dict().daily;
    if (index === 0) return d.today;
    if (index === 1) return d.tomorrow;
    if (index === 2) return d.afterTomorrow;
    if (dateStr) {
      return this.formatDate(dateStr, { weekday: 'long' });
    }
    return '';
  }

  getFullDate(dateStr: string): string {
    return this.formatDate(dateStr, {
      weekday: 'short',
      month: 'long',
      day: 'numeric',
    });
  }

  getMoonPhaseName(phaseEn: string): string {
    const map: Record<string, keyof TranslationDictionary['moon']> = {
      'New Moon': 'newMoon',
      'Waxing Crescent': 'waxingCrescent',
      'First Quarter': 'firstQuarter',
      'Waxing Gibbous': 'waxingGibbous',
      'Full Moon': 'fullMoon',
      'Waning Gibbous': 'waningGibbous',
      'Last Quarter': 'lastQuarter',
      'Waning Crescent': 'waningCrescent',
    };
    const key = map[phaseEn];
    if (key && this.dict().moon[key]) {
      return this.dict().moon[key];
    }
    return phaseEn;
  }

  translateCity(queryOrName?: string | null, fallbackName?: string | null): string {
    const raw = (queryOrName || '').trim();
    const fallback = (fallbackName || '').trim();
    if (!raw && !fallback) return '';

    const lang = this.currentLang();
    const city =
      (raw ? CITY_LOOKUP_MAP.get(raw.toLowerCase()) : undefined) ||
      (fallback ? CITY_LOOKUP_MAP.get(fallback.toLowerCase()) : undefined);

    if (city) {
      return city.names[lang] || city.names['en'] || city.names['ru'] || raw || fallback;
    }

    return raw || fallback;
  }

  translateCountry(countryInput?: string | null, cityQueryOrName?: string | null): string {
    const rawCountry = (countryInput || '').trim();
    const lang = this.currentLang();

    // 1. Check if city has an explicit countryCode in dictionary
    let countryCode: string | undefined;
    if (cityQueryOrName) {
      const city = CITY_LOOKUP_MAP.get(cityQueryOrName.trim().toLowerCase());
      if (city?.countryCode) {
        countryCode = city.countryCode;
      }
    }

    // 2. Check if rawCountry maps to an ISO country code
    if (!countryCode && rawCountry) {
      countryCode = COUNTRY_NAME_TO_CODE[rawCountry.toLowerCase()];
    }

    // 3. Translate using native Intl.DisplayNames if countryCode is known
    if (countryCode) {
      try {
        const dn = new Intl.DisplayNames([lang], { type: 'region' });
        const localized = dn.of(countryCode);
        if (localized) return localized;
      } catch {}
    }

    // 4. Fallback to original country string
    return rawCountry;
  }

  private deepMerge(base: any, override: any): any {
    const result = { ...base };
    for (const key of Object.keys(override)) {
      if (
        override[key] !== null &&
        typeof override[key] === 'object' &&
        !Array.isArray(override[key]) &&
        key in base &&
        typeof base[key] === 'object'
      ) {
        result[key] = this.deepMerge(base[key], override[key]);
      } else if (override[key] !== undefined) {
        result[key] = override[key];
      }
    }
    return result;
  }
}
