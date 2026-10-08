import { DOCUMENT } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom, timeout } from 'rxjs';

import { WeatherConditionType } from '../../shared/components/weather-icon/weather-icon';
import {
  FavoriteLocation,
  PressureUnit,
  SUPPORTED_LANGUAGES,
  SupportedLanguage,
  TempUnit,
  WeatherSettings,
  WindUnit,
  WttrResponse,
} from './weather.model';

@Injectable({
  providedIn: 'root',
})
export class WeatherService {
  private readonly http = inject(HttpClient);
  private readonly document = inject(DOCUMENT);
  private readonly window = this.document.defaultView;

  private readonly primaryBase = 'https://wttr.in';
  private readonly fallbackBase = 'https://wttr.is';
  private readonly favoritesKey = 'wttr_favorites';
  private readonly historyKey = 'wttr_history';
  private readonly settingsKey = 'wttr_settings';
  private readonly langKey = 'wttr_lang';
  private readonly lastCityKey = 'wttr_last_city';

  // In-memory weather cache (10 min TTL)
  private readonly cache = new Map<string, { data: WttrResponse; timestamp: number }>();
  readonly cacheTtlMs = 10 * 60 * 1000;

  // Fallback mirror indicator
  readonly isFallbackMirror = signal<boolean>(false);

  // Language State
  readonly supportedLanguages = SUPPORTED_LANGUAGES;
  readonly currentLang = signal<string>(this.getInitialLang());
  readonly currentLanguageInfo = computed(() => {
    return SUPPORTED_LANGUAGES.find((l) => l.code === this.currentLang()) ?? SUPPORTED_LANGUAGES[0];
  });

  // State Signals
  readonly weatherData = signal<WttrResponse | null>(null);
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly currentQuery = signal<string>(this.getInitialCity());
  readonly terminalOutput = signal<string>('');
  readonly isTerminalLoading = signal<boolean>(false);
  readonly terminalError = signal<string | null>(null);

  // Web View HTML State
  readonly webHtml = signal<string>('');
  readonly isWebLoading = signal<boolean>(false);
  readonly webError = signal<string | null>(null);
  private lastLoadedWebQuery = '';
  private lastLoadedWebLang = '';

  // Terminal State Tracking
  private lastLoadedTerminalQuery = '';
  private lastLoadedTerminalLang = '';

  // Settings Signal
  readonly settings = signal<WeatherSettings>(this.getInitialSettings());

  // History & Favorites
  readonly favorites = signal<FavoriteLocation[]>(this.getInitialFavorites());
  readonly searchHistory = signal<string[]>(this.getInitialHistory());

  // Computed signals
  readonly currentCondition = computed(() => {
    const data = this.weatherData();
    return data?.current_condition?.[0] ?? null;
  });

  readonly nearestArea = computed(() => {
    const data = this.weatherData();
    return data?.nearest_area?.[0] ?? null;
  });

  readonly threeDaysForecast = computed(() => {
    const data = this.weatherData();
    return data?.weather ?? [];
  });

  readonly isCurrentFavorite = computed(() => {
    const cur = this.currentQuery().toLowerCase().trim();
    return this.favorites().some((f) => f.query.toLowerCase().trim() === cur);
  });

  constructor() {
    if (this.document?.documentElement) {
      this.document.documentElement.lang = this.currentLang();
    }
    // Initial fetch on service load
    this.fetchWeather(this.currentQuery());
  }

  // Fetch weather data from wttr.in or fallback with TTL cache
  async fetchWeather(query: string, force = false): Promise<void> {
    const cleanQuery = query.trim() || this.getInitialCity();
    const cacheKey = `${cleanQuery.toLowerCase()}_${this.currentLang()}`;

    this.currentQuery.set(cleanQuery);
    this.saveLastCity(cleanQuery);

    // Fast return from in-memory cache if fresh
    const cached = this.cache.get(cacheKey);
    if (!force && cached && Date.now() - cached.timestamp < this.cacheTtlMs) {
      this.weatherData.set(cached.data);
      this.isLoading.set(false);
      this.errorMessage.set(null);
      this.fetchTerminalOutput(cleanQuery, false);
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    // Fetch terminal/web output immediately in parallel
    this.fetchTerminalOutput(cleanQuery, force);

    try {
      // First attempt: Primary URL
      const data = await this.requestWithFallback<WttrResponse>(
        `${this.primaryBase}/${encodeURIComponent(cleanQuery)}?format=j1&lang=${this.currentLang()}`,
        `${this.fallbackBase}/${encodeURIComponent(cleanQuery)}?format=j1&lang=${this.currentLang()}`,
      );

      this.cache.set(cacheKey, { data, timestamp: Date.now() });
      this.weatherData.set(data);
      this.addToHistory(cleanQuery);
    } catch (err: any) {
      console.error('Weather fetch error:', err);
      this.errorMessage.set(
        'Не удалось получить данные о погоде. Проверьте подключение к интернету или правильность названия города.',
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  // Fetch CLI / Terminal plain text
  async fetchTerminalOutput(query: string, force = false): Promise<void> {
    const cleanQuery = query.trim() || 'Obninsk';
    if (
      !force &&
      this.terminalOutput() &&
      this.lastLoadedTerminalQuery === cleanQuery &&
      this.lastLoadedTerminalLang === this.currentLang()
    ) {
      return;
    }

    this.isTerminalLoading.set(true);
    this.terminalError.set(null);
    this.lastLoadedTerminalQuery = cleanQuery;
    this.lastLoadedTerminalLang = this.currentLang();

    try {
      const text = await firstValueFrom(
        this.http
          .get(
            `${this.primaryBase}/${encodeURIComponent(cleanQuery)}?T&lang=${this.currentLang()}`,
            {
              responseType: 'text',
            },
          )
          .pipe(timeout(6000)),
      );
      this.terminalOutput.set(text);
    } catch {
      try {
        const fallbackText = await firstValueFrom(
          this.http
            .get(
              `${this.fallbackBase}/${encodeURIComponent(cleanQuery)}?T&lang=${this.currentLang()}`,
              {
                responseType: 'text',
              },
            )
            .pipe(timeout(6000)),
        );
        this.terminalOutput.set(fallbackText);
      } catch {
        this.terminalOutput.set('Не удалось загрузить текстовый терминальный вывод wttr.in');
      }
    } finally {
      this.isTerminalLoading.set(false);
    }
  }

  // Reload terminal and web view output
  reloadTerminal(): void {
    this.fetchTerminalOutput(this.currentQuery(), true);
  }

  // Fetch Web HTML output
  async fetchWebHtml(query: string, force = false): Promise<void> {
    const cleanQuery = query.trim() || 'Obninsk';
    if (
      !force &&
      this.webHtml() &&
      this.lastLoadedWebQuery === cleanQuery &&
      this.lastLoadedWebLang === this.currentLang()
    ) {
      return;
    }

    this.isWebLoading.set(true);
    this.webError.set(null);
    this.lastLoadedWebQuery = cleanQuery;
    this.lastLoadedWebLang = this.currentLang();

    try {
      const url = `${this.primaryBase}/${encodeURIComponent(cleanQuery)}?lang=${this.currentLang()}`;
      const html = await firstValueFrom(
        this.http
          .get(url, {
            responseType: 'text',
            headers: { Accept: 'text/html' },
          })
          .pipe(timeout(10000)),
      );
      this.webHtml.set(this.optimizeWttrHtml(html));
    } catch {
      try {
        const fallbackUrl = `${this.fallbackBase}/${encodeURIComponent(cleanQuery)}?lang=${this.currentLang()}`;
        const fallbackHtml = await firstValueFrom(
          this.http
            .get(fallbackUrl, {
              responseType: 'text',
              headers: { Accept: 'text/html' },
            })
            .pipe(timeout(10000)),
        );
        this.webHtml.set(this.optimizeWttrHtml(fallbackHtml));
      } catch {
        this.webError.set('Не удалось загрузить веб-версию отчета wttr.in.');
      }
    } finally {
      this.isWebLoading.set(false);
    }
  }

  private optimizeWttrHtml(html: string): string {
    if (!html) return '';

    return (
      html
        // 1. Remove render-blocking stylesheet from adobe-fonts.github.io which causes a 5s connection timeout
        .replace(/<link[^>]+adobe-fonts\.github\.io[^>]*>/gi, '')
        // 2. Remove blocking/hanging external scripts (twitter widgets, github buttons)
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        // 3. Inject optimized modern monospace font and smooth scrollbar styling
        .replace(
          '</style>',
          `
        /* Modern font & smooth scrollbar enhancements */
        body {
          font-family: ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, Monaco, Consolas, monospace !important;
          scrollbar-width: thin;
          scrollbar-color: #334155 #090d16;
        }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #000; }
        ::-webkit-scrollbar-thumb { background: #27272a; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: #3f3f46; }
      </style>`,
        )
    );
  }

  // Request with fallback helper
  private async requestWithFallback<T>(primaryUrl: string, fallbackUrl: string): Promise<T> {
    try {
      const result = await firstValueFrom(this.http.get<T>(primaryUrl).pipe(timeout(6000)));
      this.isFallbackMirror.set(false);
      return result;
    } catch {
      // Try fallback
      const result = await firstValueFrom(this.http.get<T>(fallbackUrl).pipe(timeout(6000)));
      this.isFallbackMirror.set(true);
      return result;
    }
  }

  // Geolocation detection
  async fetchByCurrentLocation(): Promise<void> {
    const geo = this.window?.navigator?.geolocation;
    if (geo) {
      this.isLoading.set(true);
      geo.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude.toFixed(4);
          const lon = position.coords.longitude.toFixed(4);
          await this.fetchWeather(`${lat},${lon}`);
        },
        async () => {
          // If browser geolocation denied/failed, rely on wttr.in IP geolocation
          await this.fetchWeather('');
        },
        { timeout: 8000 },
      );
    } else {
      await this.fetchWeather('');
    }
  }

  // Settings
  setTempUnit(unit: TempUnit): void {
    this.settings.update((s) => ({ ...s, tempUnit: unit }));
    this.saveSettings();
  }

  setWindUnit(unit: WindUnit): void {
    this.settings.update((s) => ({ ...s, windUnit: unit }));
    this.saveSettings();
  }

  setPressureUnit(unit: PressureUnit): void {
    this.settings.update((s) => ({ ...s, pressureUnit: unit }));
    this.saveSettings();
  }

  // Language management
  setLanguage(langCode: string): void {
    if (this.currentLang() === langCode) return;
    this.currentLang.set(langCode);
    try {
      this.window?.localStorage?.setItem(this.langKey, langCode);
    } catch {}
    if (this.document?.documentElement) {
      this.document.documentElement.lang = langCode;
    }
    this.fetchWeather(this.currentQuery());
    if (this.webHtml()) {
      this.fetchWebHtml(this.currentQuery(), true);
    }
    if (this.terminalOutput()) {
      this.fetchTerminalOutput(this.currentQuery(), true);
    }
  }

  // Favorites management
  toggleFavorite(): void {
    const cur = this.currentQuery().trim();
    if (!cur) return;

    const existing = this.favorites().find((f) => f.query.toLowerCase() === cur.toLowerCase());
    if (existing) {
      this.favorites.update((list) =>
        list.filter((f) => f.query.toLowerCase() !== cur.toLowerCase()),
      );
    } else {
      const area = this.nearestArea();
      const displayName = area?.areaName?.[0]?.value || cur;
      const country = area?.country?.[0]?.value || '';
      this.favorites.update((list) => [
        { name: displayName, query: cur, country, addedAt: Date.now() },
        ...list,
      ]);
    }
    this.saveFavorites();
  }

  removeFavorite(query: string): void {
    this.favorites.update((list) =>
      list.filter((f) => f.query.toLowerCase() !== query.toLowerCase()),
    );
    this.saveFavorites();
  }

  // Unit conversion helpers
  formatTemp(tempC: string | number, tempF: string | number): string {
    const unit = this.settings().tempUnit;
    const val = unit === 'C' ? Number(tempC) : Number(tempF);
    const sign = val > 0 ? '+' : '';
    return `${sign}${Math.round(val)}°${unit}`;
  }

  formatWind(speedKmph: string | number): string {
    const kmh = Number(speedKmph);
    const unit = this.settings().windUnit;
    if (unit === 'ms') {
      const ms = Math.round((kmh / 3.6) * 10) / 10;
      return `${ms} м/с`;
    } else if (unit === 'mph') {
      const mph = Math.round(kmh * 0.621371);
      return `${mph} mph`;
    }
    return `${Math.round(kmh)} км/ч`;
  }

  formatPressure(pressureHpa: string | number): string {
    const hpa = Number(pressureHpa);
    const unit = this.settings().pressureUnit;
    if (unit === 'mmHg') {
      const mm = Math.round(hpa * 0.750062);
      return `${mm} мм рт. ст.`;
    }
    return `${Math.round(hpa)} гПа`;
  }

  // Convert 12-hour AM/PM format (e.g., "04:00 PM", "06:34 AM") to 24-hour European format (e.g., "16:00", "06:34")
  formatTo24Hour(time12: string | undefined | null): string {
    if (!time12) return '';
    const trimmed = time12.trim();
    const match = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!match) return trimmed;

    let hours = parseInt(match[1], 10);
    const minutes = match[2];
    const period = match[3].toUpperCase();

    if (period === 'PM' && hours < 12) {
      hours += 12;
    } else if (period === 'AM' && hours === 12) {
      hours = 0;
    }

    return `${hours.toString().padStart(2, '0')}:${minutes}`;
  }

  // Weather Description translation (handles any selected language)
  getWeatherDescription(descEn: string, localizedDesc?: string): string {
    const lang = this.currentLang();
    if (lang === 'en') {
      return descEn || '';
    }

    const trimmedEn = (descEn || '').trim();
    const trimmedLoc = (localizedDesc || '').trim();
    const isActuallyLocalized =
      Boolean(trimmedLoc) && trimmedLoc.toLowerCase() !== trimmedEn.toLowerCase();

    // If wttr.in provided a truly localized string, prefer it
    if (isActuallyLocalized) {
      return trimmedLoc;
    }

    // Fallbacks when wttr.in returns English instead of requested language
    if (lang === 'ru' || ['be', 'kk'].includes(lang)) {
      return this.getWeatherDescriptionRu(trimmedEn);
    }

    if (lang === 'de') {
      return this.getWeatherDescriptionDe(trimmedEn);
    }

    return trimmedLoc || trimmedEn || '';
  }

  // Russian Weather Description translation
  getWeatherDescriptionRu(descEn: string, langRu?: string): string {
    const trimmedEn = (descEn || '').trim();
    const trimmedRu = (langRu || '').trim();
    if (trimmedRu && trimmedRu.toLowerCase() !== trimmedEn.toLowerCase()) {
      return trimmedRu;
    }
    if (!trimmedEn) return '';
    const map: Record<string, string> = {
      Sunny: 'Солнечно',
      Clear: 'Ясно',
      'Partly cloudy': 'Переменная облачность',
      Cloudy: 'Облачно',
      Overcast: 'Пасмурно',
      Mist: 'Дымка',
      'Patchy rain possible': 'Возможен кратковременный дождь',
      'Patchy rain nearby': 'Местами кратковременный дождь',
      'Patchy snow possible': 'Возможен кратковременный снег',
      'Patchy sleet possible': 'Возможен мокрый снег',
      'Patchy freezing drizzle possible': 'Возможна изморозь',
      'Thundery outbreaks possible': 'Возможна гроза',
      'Blowing snow': 'Метель',
      Blizzard: 'Буран / Пурга',
      Fog: 'Туман',
      'Freezing fog': 'Ледяной туман',
      'Patchy light drizzle': 'Небольшая морось',
      'Light drizzle': 'Морось',
      'Freezing drizzle': 'Замерзающая морось',
      'Heavy freezing drizzle': 'Сильная ледяная морось',
      'Patchy light rain': 'Небольшой дождь местами',
      'Light rain': 'Небольшой дождь',
      'Moderate rain at times': 'Временами умеренный дождь',
      'Moderate rain': 'Умеренный дождь',
      'Heavy rain at times': 'Временами сильный дождь',
      'Heavy rain': 'Сильный ливень',
      'Light freezing rain': 'Ледяной дождь',
      'Moderate or heavy freezing rain': 'Сильный ледяной дождь',
      'Light sleet': 'Небольшой мокрый снег',
      'Moderate or heavy sleet': 'Сильный мокрый снег',
      'Patchy light snow': 'Небольшой снег местами',
      'Light snow': 'Небольшой снегопад',
      'Patchy moderate snow': 'Умеренный снег местами',
      'Moderate snow': 'Умеренный снегопад',
      'Patchy heavy snow': 'Сильный снегопад',
      'Heavy snow': 'Обильный снегопад',
      'Ice pellets': 'Град',
      'Light rain shower': 'Кратковременный дождь',
      'Moderate or heavy rain shower': 'Сильный ливневый дождь',
      'Torrential rain shower': 'Проливной дождь',
      'Light sleet showers': 'Кратковременный мокрый снег',
      'Moderate or heavy sleet showers': 'Сильный мокрый снег с дождем',
      'Light snow showers': 'Кратковременный снегопад',
      'Moderate or heavy snow showers': 'Сильный ливневый снег',
      'Light showers of ice pellets': 'Кратковременный град',
      'Moderate or heavy showers of ice pellets': 'Сильный град',
      'Patchy light rain with thunder': 'Небольшой дождь с грозой',
      'Moderate or heavy rain with thunder': 'Гроза с ливнем',
      'Patchy light snow with thunder': 'Небольшой снег с грозой',
      'Moderate or heavy snow with thunder': 'Метель с грозой',
    };

    const normalizedKey = trimmedEn.toLowerCase();
    for (const [k, v] of Object.entries(map)) {
      if (k.toLowerCase() === normalizedKey) {
        return v;
      }
    }
    return trimmedEn;
  }

  // German Weather Description translation fallback
  getWeatherDescriptionDe(descEn: string): string {
    const trimmedEn = (descEn || '').trim();
    if (!trimmedEn) return '';
    const map: Record<string, string> = {
      Sunny: 'Sonnig',
      Clear: 'Klar',
      'Partly cloudy': 'Teilweise bewölkt',
      Cloudy: 'Bewölkt',
      Overcast: 'Bedeckt',
      Mist: 'Dunst',
      'Patchy rain possible': 'Stellenweise Regen möglich',
      'Patchy rain nearby': 'Stellenweise Regen in der Nähe',
      'Patchy snow possible': 'Stellenweise Schnee möglich',
      'Patchy sleet possible': 'Stellenweise Schneeregen möglich',
      'Patchy freezing drizzle possible': 'Stellenweise gefrierender Nieselregen möglich',
      'Thundery outbreaks possible': 'Gewitter möglich',
      'Blowing snow': 'Schneetreiben',
      Blizzard: 'Schneesturm',
      Fog: 'Nebel',
      'Freezing fog': 'Gefrierender Nebel',
      'Patchy light drizzle': 'Stellenweise leichter Nieselregen',
      'Light drizzle': 'Leichter Nieselregen',
      'Freezing drizzle': 'Gefrierender Nieselregen',
      'Heavy freezing drizzle': 'Starker gefrierender Nieselregen',
      'Patchy light rain': 'Stellenweise leichter Regen',
      'Light rain': 'Leichter Regen',
      'Moderate rain at times': 'Zeitweise mäßiger Regen',
      'Moderate rain': 'Mäßiger Regen',
      'Heavy rain at times': 'Zeitweise starker Regen',
      'Heavy rain': 'Starker Regen',
      'Light freezing rain': 'Leichter Eisregen',
      'Moderate or heavy freezing rain': 'Mäßiger oder starker Eisregen',
      'Light sleet': 'Leichter Schneeregen',
      'Moderate or heavy sleet': 'Mäßiger oder starker Schneeregen',
      'Patchy light snow': 'Stellenweise leichter Schnee',
      'Light snow': 'Leichter Schneefall',
      'Patchy moderate snow': 'Stellenweise mäßiger Schnee',
      'Moderate snow': 'Mäßiger Schneefall',
      'Patchy heavy snow': 'Stellenweise starker Schnee',
      'Heavy snow': 'Starker Schneefall',
      'Ice pellets': 'Graupel',
      'Light rain shower': 'Leichter Regenschauer',
      'Moderate or heavy rain shower': 'Mäßiger oder starker Regenschauer',
      'Torrential rain shower': 'Sintflutartiger Regenschauer',
      'Light sleet showers': 'Leichte Schneeregenschauer',
      'Moderate or heavy sleet showers': 'Mäßige oder starke Schneeregenschauer',
      'Light snow showers': 'Leichte Schneeschauer',
      'Moderate or heavy snow showers': 'Mäßige oder starke Schneeschauer',
      'Light showers of ice pellets': 'Leichte Graupelschauer',
      'Moderate or heavy showers of ice pellets': 'Mäßige oder starke Graupelschauer',
      'Patchy light rain with thunder': 'Stellenweise leichter Regen mit Gewitter',
      'Moderate or heavy rain with thunder': 'Mäßiger oder starker Regen mit Gewitter',
      'Patchy light snow with thunder': 'Stellenweise leichter Schnee mit Gewitter',
      'Moderate or heavy snow with thunder': 'Mäßiger oder starker Schneefall mit Gewitter',
    };

    const normalizedKey = trimmedEn.toLowerCase();
    for (const [k, v] of Object.entries(map)) {
      if (k.toLowerCase() === normalizedKey) {
        return v;
      }
    }
    return trimmedEn;
  }

  // Moon phase translation & icon
  getMoonPhaseInfo(phaseEn: string): { nameRu: string; icon: string } {
    const map: Record<string, { nameRu: string; icon: string }> = {
      'New Moon': { nameRu: 'Новолуние', icon: '🌑' },
      'Waxing Crescent': { nameRu: 'Молодая луна', icon: '🌒' },
      'First Quarter': { nameRu: 'Первая четверть', icon: '🌓' },
      'Waxing Gibbous': { nameRu: 'Прибывающая луна', icon: '🌔' },
      'Full Moon': { nameRu: 'Полнолуние', icon: '🌕' },
      'Waning Gibbous': { nameRu: 'Убывающая луна', icon: '🌖' },
      'Last Quarter': { nameRu: 'Последняя четверть', icon: '🌗' },
      'Waning Crescent': { nameRu: 'Старая луна', icon: '🌘' },
    };
    return map[phaseEn] || { nameRu: phaseEn, icon: '🌕' };
  }

  // Weather Icon and visual theme
  getWeatherTheme(
    code: string,
    desc: string,
    isNight = false,
  ): {
    icon: string;
    conditionType: WeatherConditionType;
    gradient: string;
    badgeSeverity: 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast';
  } {
    const d = desc.toLowerCase();
    const c = Number(code);

    // 1. Thunder & Lightning
    if (d.includes('thunder') || [200, 386, 389, 392, 395].includes(c)) {
      return {
        icon: 'pi pi-bolt',
        conditionType: 'thunder',
        gradient: 'from-amber-600/30 via-slate-800/40 to-purple-950/50',
        badgeSeverity: 'danger',
      };
    }

    // 2. Blizzard / Heavy snow storm
    if (
      d.includes('blizzard') ||
      d.includes('blowing snow') ||
      [227, 230, 335, 338, 371].includes(c)
    ) {
      return {
        icon: 'pi pi-cloud',
        conditionType: 'blizzard',
        gradient: 'from-sky-500/25 via-indigo-700/35 to-slate-900/50',
        badgeSeverity: 'info',
      };
    }

    // 3. Sleet / Freezing rain / Ice pellets / Hail
    if (
      d.includes('sleet') ||
      d.includes('pellet') ||
      d.includes('freezing rain') ||
      d.includes('freezing drizzle') ||
      [182, 185, 311, 314, 317, 320, 350, 362, 365, 374, 377].includes(c)
    ) {
      return {
        icon: 'pi pi-cloud',
        conditionType: 'sleet',
        gradient: 'from-teal-500/20 via-blue-700/30 to-slate-900/50',
        badgeSeverity: 'info',
      };
    }

    // 4. Regular snow
    if (d.includes('snow') || (c >= 323 && c <= 377)) {
      return {
        icon: 'pi pi-cloud',
        conditionType: 'snow',
        gradient: 'from-blue-400/20 via-sky-600/30 to-indigo-900/40',
        badgeSeverity: 'info',
      };
    }

    // 5. Heavy rain / Torrential downpour
    if (d.includes('heavy rain') || d.includes('torrential') || [305, 308, 356, 359].includes(c)) {
      return {
        icon: 'pi pi-cloud-download',
        conditionType: 'heavy-rain',
        gradient: 'from-blue-700/35 via-slate-800/40 to-indigo-950/60',
        badgeSeverity: 'info',
      };
    }

    // 6. Drizzle / Light patchy rain
    if (d.includes('drizzle') || [263, 266, 281, 284].includes(c)) {
      return {
        icon: 'pi pi-cloud-download',
        conditionType: 'drizzle',
        gradient: 'from-cyan-500/20 via-sky-700/25 to-slate-900/40',
        badgeSeverity: 'info',
      };
    }

    // 7. Regular Rain
    if (d.includes('rain') || (c >= 263 && c <= 314) || (c >= 353 && c <= 359)) {
      return {
        icon: 'pi pi-cloud-download',
        conditionType: 'rain',
        gradient: 'from-cyan-600/30 via-blue-800/30 to-slate-900/50',
        badgeSeverity: 'info',
      };
    }

    // 8. Fog / Mist
    if (d.includes('fog') || d.includes('mist') || [143, 248, 260].includes(c)) {
      return {
        icon: 'pi pi-align-justify',
        conditionType: 'fog',
        gradient: 'from-zinc-500/20 via-slate-600/30 to-neutral-800/40',
        badgeSeverity: 'secondary',
      };
    }

    // 9. Wind / Gale / Squall
    if (d.includes('wind') || d.includes('gale') || d.includes('squall')) {
      return {
        icon: 'pi pi-compass',
        conditionType: 'wind',
        gradient: 'from-teal-600/25 via-slate-700/30 to-blue-950/40',
        badgeSeverity: 'info',
      };
    }

    // 10. Overcast
    if (d.includes('overcast') || c === 122) {
      return {
        icon: 'pi pi-cloud',
        conditionType: 'overcast',
        gradient: 'from-slate-600/25 via-slate-700/30 to-zinc-900/50',
        badgeSeverity: 'secondary',
      };
    }

    // 11. Partly cloudy (Day vs Night)
    if (d.includes('partly') || c === 116) {
      return {
        icon: isNight ? 'pi pi-moon' : 'pi pi-cloud',
        conditionType: isNight ? 'partly-cloudy-night' : 'partly-cloudy-day',
        gradient: isNight
          ? 'from-indigo-600/25 via-slate-800/30 to-slate-950/50'
          : 'from-amber-400/20 via-sky-600/25 to-slate-900/35',
        badgeSeverity: isNight ? 'secondary' : 'warn',
      };
    }

    // 12. Cloudy
    if (d.includes('cloud') || c === 119) {
      return {
        icon: 'pi pi-cloud',
        conditionType: 'cloudy',
        gradient: 'from-slate-500/20 via-blue-900/20 to-slate-950/40',
        badgeSeverity: 'secondary',
      };
    }

    // 13. Clear / Sunny (Day vs Night)
    if (isNight) {
      return {
        icon: 'pi pi-moon',
        conditionType: 'clear-night',
        gradient: 'from-indigo-700/30 via-slate-900/40 to-blue-950/60',
        badgeSeverity: 'secondary',
      };
    }

    return {
      icon: 'pi pi-sun',
      conditionType: 'sunny',
      gradient: 'from-amber-500/30 via-orange-500/20 to-sky-900/30',
      badgeSeverity: 'warn',
    };
  }

  // Persistence helpers
  private getInitialSettings(): WeatherSettings {
    try {
      const saved = this.window?.localStorage?.getItem(this.settingsKey);
      if (saved) return JSON.parse(saved);
    } catch {}
    return { tempUnit: 'C', windUnit: 'ms', pressureUnit: 'mmHg' };
  }

  private saveSettings(): void {
    try {
      this.window?.localStorage?.setItem(this.settingsKey, JSON.stringify(this.settings()));
    } catch {}
  }

  private getInitialFavorites(): FavoriteLocation[] {
    const defaultFavorites: FavoriteLocation[] = [
      { name: 'Обнинск', query: 'Obninsk', country: 'Россия', addedAt: 0 },
      { name: 'Москва', query: 'Moscow', country: 'Россия', addedAt: 1 },
      { name: 'Санкт-Петербург', query: 'Saint Petersburg', country: 'Россия', addedAt: 2 },
      { name: 'Сочи', query: 'Sochi', country: 'Россия', addedAt: 3 },
    ];
    try {
      const saved = this.window?.localStorage?.getItem(this.favoritesKey);
      if (saved) return JSON.parse(saved);
    } catch {}
    return defaultFavorites;
  }

  private saveFavorites(): void {
    try {
      this.window?.localStorage?.setItem(this.favoritesKey, JSON.stringify(this.favorites()));
    } catch {}
  }

  private getInitialHistory(): string[] {
    const defaultHistory = ['Obninsk', 'Moscow', 'Saint Petersburg'];
    try {
      const saved = this.window?.localStorage?.getItem(this.historyKey);
      if (saved) return JSON.parse(saved);
    } catch {}
    return defaultHistory;
  }

  private addToHistory(query: string): void {
    const q = query.trim();
    if (!q) return;
    const current = this.searchHistory().filter((item) => item.toLowerCase() !== q.toLowerCase());
    const updated = [q, ...current].slice(0, 10);
    this.searchHistory.set(updated);
    try {
      this.window?.localStorage?.setItem(this.historyKey, JSON.stringify(updated));
    } catch {}
  }

  detectSystemLanguage(): string | null {
    if (!this.window?.navigator) return null;
    const candidates: string[] = [];
    if (Array.isArray(this.window.navigator.languages)) {
      candidates.push(...this.window.navigator.languages);
    }
    if (this.window.navigator.language) {
      candidates.push(this.window.navigator.language);
    }

    for (const raw of candidates) {
      if (!raw || typeof raw !== 'string') continue;
      const cand = raw.toLowerCase().trim();
      if (!cand) continue;

      // 1. Exact match (e.g. 'ru' === 'ru', 'pt-br' === 'pt-br')
      const exact = SUPPORTED_LANGUAGES.find((l) => l.code === cand);
      if (exact) return exact.code;

      // 2. Candidate starts with supported code + '-' (e.g. 'en-us' -> 'en', 'de-de' -> 'de', 'ru-ru' -> 'ru')
      const prefix = SUPPORTED_LANGUAGES.find((l) => cand.startsWith(l.code + '-'));
      if (prefix) return prefix.code;

      // 3. Supported code starts with candidate + '-' (e.g. 'pt' -> 'pt-br', 'zh' -> 'zh-cn')
      const supportedPrefix = SUPPORTED_LANGUAGES.find((l) => l.code.startsWith(cand + '-'));
      if (supportedPrefix) return supportedPrefix.code;
    }

    return null;
  }

  private getInitialLang(): string {
    if (!this.window) return 'ru';
    try {
      const saved = this.window.localStorage?.getItem(this.langKey);
      if (saved && SUPPORTED_LANGUAGES.some((l) => l.code === saved)) {
        return saved;
      }
    } catch {}

    const systemLang = this.detectSystemLanguage();
    if (systemLang) {
      return systemLang;
    }

    return 'ru';
  }

  private saveLastCity(city: string): void {
    if (!city || !city.trim()) return;
    try {
      this.window?.localStorage?.setItem(this.lastCityKey, city.trim());
    } catch {}
  }

  getInitialCity(): string {
    if (!this.window) return 'Obninsk';
    try {
      const saved = this.window.localStorage?.getItem(this.lastCityKey)?.trim();
      if (saved) return saved;
    } catch {}
    return 'Obninsk';
  }

  clearCache(): void {
    this.cache.clear();
  }

  reloadWeather(): Promise<void> {
    return this.fetchWeather(this.currentQuery(), true);
  }
}
