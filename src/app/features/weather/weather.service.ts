import { DOCUMENT } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom, timeout } from 'rxjs';

import { WeatherConditionType } from '../../shared/components/weather-icon/weather-icon';
import { OpenMeteoGeoResult, transformOpenMeteoToWttr } from './open-meteo.fallback';
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
  private readonly offlineDataKeyPrefix = 'wttr_offline_data_';
  private readonly offlineLatestKey = 'wttr_offline_latest';

  // In-memory weather cache (10 min TTL)
  private readonly cache = new Map<string, { data: WttrResponse; timestamp: number }>();
  readonly cacheTtlMs = 10 * 60 * 1000;

  // Fallback mirror indicator & active source
  readonly isFallbackMirror = signal<boolean>(false);
  readonly fallbackSourceName = signal<string>('wttr.is');
  private wttrBlockedInSession = false;

  // Server proxy detection (for production host on Render and local Express server)
  get useServerProxy(): boolean {
    if (!this.window) return false;
    // Disable in tests (Vitest / Karma) to preserve test mocks
    if (
      (this.window as any).__vitest_worker__ ||
      (this.window as any).__karma__ ||
      this.window.location.port === '9876'
    ) {
      return false;
    }
    const host = this.window.location.hostname;
    const port = this.window.location.port;
    if (port === '3000') return true;
    if (host && host !== 'localhost' && host !== '127.0.0.1') return true;
    return false;
  }

  // Offline State Signals
  readonly isOffline = signal<boolean>(
    typeof navigator !== 'undefined' ? !navigator.onLine : false,
  );
  readonly isOfflineData = signal<boolean>(false);
  readonly offlineDataTimestamp = signal<number | null>(null);

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

  // Comparison State
  readonly isCompareOpen = signal<boolean>(false);
  readonly compareTargetCity = signal<string>('');

  // Language Menu State
  readonly isLangMenuOpen = signal<boolean>(false);

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

    // Register online/offline connectivity listeners
    if (this.window) {
      // Restore session or persistent fallback state if previously triggered without VPN in direct client mode
      if (
        !this.useServerProxy &&
        (this.window.sessionStorage?.getItem('wttr_fallback_active') === 'true' ||
          this.window.localStorage?.getItem('wttr_fallback_active') === 'true')
      ) {
        this.wttrBlockedInSession = true;
        this.isFallbackMirror.set(true);
        this.fallbackSourceName.set('Open-Meteo');
      }

      this.window.addEventListener('online', () => {
        const wasOfflineState = this.isOffline() || this.isOfflineData();
        this.isOffline.set(false);
        if (wasOfflineState) {
          // Auto-refresh forecast when connection is restored
          this.refreshCurrentWeather();
        }
      });

      this.window.addEventListener('offline', () => {
        this.isOffline.set(true);
      });
    }

    // Initial fetch on service load
    this.fetchWeather(this.currentQuery());
  }

  // Fetch weather data from wttr.in or fallback with TTL cache and offline persistence
  async fetchWeather(query: string, force = false): Promise<void> {
    const cleanQuery = query.trim() || this.getInitialCity();
    const cacheKey = `${cleanQuery.toLowerCase()}_${this.currentLang()}`;
    const isDefaultOrLastCity =
      cleanQuery.toLowerCase() === this.getInitialCity().toLowerCase() ||
      cleanQuery.toLowerCase() === 'obninsk';

    this.currentQuery.set(cleanQuery);
    this.saveLastCity(cleanQuery);

    // Fast return from in-memory cache if fresh
    const cached = this.cache.get(cacheKey);
    if (!force && cached && Date.now() - cached.timestamp < this.cacheTtlMs) {
      this.weatherData.set(cached.data);
      this.isOfflineData.set(false);
      this.offlineDataTimestamp.set(null);
      this.isLoading.set(false);
      this.errorMessage.set(null);
      this.fetchTerminalOutput(cleanQuery, false);
      return;
    }

    // If currently offline and we have saved offline data, load it immediately
    const offlineItem = this.getOfflineData(cacheKey, isDefaultOrLastCity);
    if (!force && this.isOffline() && offlineItem) {
      this.weatherData.set(offlineItem.data);
      this.isOfflineData.set(true);
      this.offlineDataTimestamp.set(offlineItem.timestamp);
      this.isLoading.set(false);
      this.errorMessage.set(null);
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    // Fetch terminal/web output immediately in parallel
    this.fetchTerminalOutput(cleanQuery, force);

    try {
      let data: WttrResponse;

      if (this.useServerProxy) {
        try {
          data = await firstValueFrom(
            this.http
              .get<WttrResponse>(
                `/api/weather?city=${encodeURIComponent(cleanQuery)}&lang=${this.currentLang()}`,
              )
              .pipe(timeout(6000)),
          );
          this.isFallbackMirror.set(false);
          this.fallbackSourceName.set('wttr.in');
          this.wttrBlockedInSession = false;
          if (this.window?.localStorage) {
            try {
              this.window.localStorage.removeItem('wttr_fallback_active');
            } catch {}
          }
          if (this.window?.sessionStorage) {
            try {
              this.window.sessionStorage.removeItem('wttr_fallback_active');
            } catch {}
          }
        } catch (proxyErr) {
          console.warn(
            '[WeatherService] Proxy fetch failed, attempting direct fallback:',
            proxyErr,
          );
          data = await this.fetchDirectWeather(cleanQuery);
        }
      } else {
        data = await this.fetchDirectWeather(cleanQuery);
      }

      this.cache.set(cacheKey, { data, timestamp: Date.now() });
      this.saveOfflineData(cacheKey, data);
      this.isOfflineData.set(false);
      this.offlineDataTimestamp.set(null);
      this.weatherData.set(data);
      this.addToHistory(cleanQuery);
    } catch (err: any) {
      console.error('Weather fetch error:', err);
      // Fallback to offline stored data if available
      const offlineFallback = this.getOfflineData(cacheKey, isDefaultOrLastCity);
      if (offlineFallback) {
        this.weatherData.set(offlineFallback.data);
        this.isOfflineData.set(true);
        this.offlineDataTimestamp.set(offlineFallback.timestamp);
        this.errorMessage.set(null);
      } else {
        this.errorMessage.set(
          'Не удалось получить данные о погоде. Проверьте подключение к интернету или правильность названия города.',
        );
      }
    } finally {
      this.isLoading.set(false);
    }
  }

  // Direct fetch with fallback mirror and Open-Meteo
  private async fetchDirectWeather(cleanQuery: string): Promise<WttrResponse> {
    if (this.wttrBlockedInSession) {
      this.isFallbackMirror.set(true);
      this.fallbackSourceName.set('Open-Meteo');
      return await this.fetchOpenMeteoFallback(cleanQuery, this.currentLang());
    }

    try {
      return await this.requestWithFallback<WttrResponse>(
        `${this.primaryBase}/${encodeURIComponent(cleanQuery)}?format=j1&lang=${this.currentLang()}`,
        `${this.fallbackBase}/${encodeURIComponent(cleanQuery)}?format=j1&lang=${this.currentLang()}`,
      );
    } catch (wttrErr) {
      console.warn(
        '[WeatherService] Upstream wttr.in/is unreachable, engaging Open-Meteo fallback:',
        wttrErr,
      );
      this.wttrBlockedInSession = true;
      if (this.window?.sessionStorage) {
        try {
          this.window.sessionStorage.setItem('wttr_fallback_active', 'true');
        } catch {}
      }
      if (this.window?.localStorage) {
        try {
          this.window.localStorage.setItem('wttr_fallback_active', 'true');
        } catch {}
      }
      this.isFallbackMirror.set(true);
      this.fallbackSourceName.set('Open-Meteo');
      return await this.fetchOpenMeteoFallback(cleanQuery, this.currentLang());
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

    if (this.useServerProxy) {
      try {
        const text = await firstValueFrom(
          this.http
            .get(
              `/api/terminal?city=${encodeURIComponent(cleanQuery)}&lang=${this.currentLang()}`,
              {
                responseType: 'text',
              },
            )
            .pipe(timeout(6000)),
        );
        this.terminalOutput.set(text);
        this.isTerminalLoading.set(false);
        return;
      } catch (proxyErr) {
        console.warn('[WeatherService] Proxy terminal fetch failed, trying direct:', proxyErr);
      }
    }

    if (this.wttrBlockedInSession) {
      this.terminalOutput.set(this.generateSyntheticTerminal(cleanQuery));
      this.isTerminalLoading.set(false);
      return;
    }

    try {
      const text = await firstValueFrom(
        this.http
          .get(
            `${this.primaryBase}/${encodeURIComponent(cleanQuery)}?T&lang=${this.currentLang()}`,
            {
              responseType: 'text',
            },
          )
          .pipe(timeout(3500)),
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
            .pipe(timeout(3500)),
        );
        this.terminalOutput.set(fallbackText);
      } catch {
        this.terminalOutput.set(this.generateSyntheticTerminal(cleanQuery));
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

    if (this.useServerProxy) {
      try {
        const html = await firstValueFrom(
          this.http
            .get(`/api/web?city=${encodeURIComponent(cleanQuery)}&lang=${this.currentLang()}`, {
              responseType: 'text',
              headers: { Accept: 'text/html' },
            })
            .pipe(timeout(6000)),
        );
        this.webHtml.set(this.optimizeWttrHtml(html));
        this.isWebLoading.set(false);
        return;
      } catch (proxyErr) {
        console.warn('[WeatherService] Proxy web HTML fetch failed, trying direct:', proxyErr);
      }
    }

    if (this.wttrBlockedInSession) {
      this.webHtml.set(this.generateSyntheticWebHtml(cleanQuery));
      this.isWebLoading.set(false);
      return;
    }

    try {
      const url = `${this.primaryBase}/${encodeURIComponent(cleanQuery)}?lang=${this.currentLang()}`;
      const html = await firstValueFrom(
        this.http
          .get(url, {
            responseType: 'text',
            headers: { Accept: 'text/html' },
          })
          .pipe(timeout(3500)),
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
            .pipe(timeout(3500)),
        );
        this.webHtml.set(this.optimizeWttrHtml(fallbackHtml));
      } catch {
        this.webHtml.set(this.generateSyntheticWebHtml(cleanQuery));
      }
    } finally {
      this.isWebLoading.set(false);
    }
  }

  private optimizeWttrHtml(html: string): string {
    if (!html) return '';

    // If upstream returned plain terminal text or text without HTML markup
    if (!html.includes('<html') && !html.includes('<!DOCTYPE')) {
      const clean = html.replace(/[\u001b\x1b]\[[0-9;]*[a-zA-Z]/g, '');
      return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    html, body {
      margin: 0;
      padding: 0;
      background: #000000 !important;
      color: #38bdf8;
      height: 100%;
      overflow-x: auto !important;
      overflow-y: auto !important;
      -webkit-overflow-scrolling: touch;
      font-family: ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, Monaco, Consolas, monospace !important;
    }
    pre {
      margin: 0;
      padding: 12px;
      font-size: 11.8px;
      line-height: 1.25;
      white-space: pre;
      color: #e2e8f0;
      min-width: max-content;
    }
  </style>
</head>
<body>
  <pre>${clean}</pre>
</body>
</html>`;
    }

    return (
      html
        // 1. Remove render-blocking stylesheet from adobe-fonts.github.io which causes a 5s connection timeout
        .replace(/<link[^>]+adobe-fonts\.github\.io[^>]*>/gi, '')
        // 2. Remove blocking/hanging external scripts (twitter widgets, github buttons)
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        // 3. Inject optimized modern monospace font, dark background, and smooth mobile touch scroll styling
        .replace(
          '</style>',
          `
        /* Modern font, dark background & touch scroll enhancements */
        html, body {
          background: #000000 !important;
          color: #bbbbbb;
          overflow-x: auto !important;
          overflow-y: auto !important;
          -webkit-overflow-scrolling: touch;
        }
        body {
          font-family: ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, Monaco, Consolas, monospace !important;
          scrollbar-width: thin;
          scrollbar-color: #334155 #090d16;
        }
        .term-container {
          min-width: max-content !important;
          max-width: none !important;
          width: auto !important;
          padding: 8px 12px 16px 12px !important;
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
      const result = await firstValueFrom(this.http.get<T>(primaryUrl).pipe(timeout(2500)));
      this.isFallbackMirror.set(false);
      this.fallbackSourceName.set('wttr.in');
      return typeof result === 'string' ? JSON.parse(result) : result;
    } catch {
      // Try fallback
      const result = await firstValueFrom(this.http.get<T>(fallbackUrl).pipe(timeout(2500)));
      this.isFallbackMirror.set(true);
      this.fallbackSourceName.set('wttr.is');
      return typeof result === 'string' ? JSON.parse(result) : result;
    }
  }

  // Open-Meteo fallback fetcher: geocodes query and fetches forecast
  async fetchOpenMeteoFallback(query: string, lang = 'ru'): Promise<WttrResponse> {
    const clean = query.trim() || 'Obninsk';

    // 1. Check if query is latitude/longitude coordinates
    const coordMatch = clean.match(/^([-+]?\d+(?:\.\d+)?)[,\s]+([-+]?\d+(?:\.\d+)?)$/);
    let geo: OpenMeteoGeoResult;

    if (coordMatch) {
      geo = {
        name: clean,
        latitude: parseFloat(coordMatch[1]),
        longitude: parseFloat(coordMatch[2]),
      };
    } else {
      // Strip leading ~ or @ wttr.in syntax
      const searchName = clean.replace(/^[~@]/, '').trim();
      const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchName)}&count=1&language=${lang}`;

      try {
        const geoRes = await firstValueFrom(
          this.http.get<{ results?: any[] }>(geoUrl).pipe(timeout(5000)),
        );
        if (geoRes?.results && geoRes.results.length > 0) {
          const first = geoRes.results[0];
          geo = {
            name: first.name,
            latitude: first.latitude,
            longitude: first.longitude,
            country: first.country,
            admin1: first.admin1,
          };
        } else {
          // If no results in current language, try without language parameter
          const fallbackGeoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchName)}&count=1`;
          const fallbackGeoRes = await firstValueFrom(
            this.http.get<{ results?: any[] }>(fallbackGeoUrl).pipe(timeout(5000)),
          );
          if (fallbackGeoRes?.results && fallbackGeoRes.results.length > 0) {
            const first = fallbackGeoRes.results[0];
            geo = {
              name: first.name,
              latitude: first.latitude,
              longitude: first.longitude,
              country: first.country,
              admin1: first.admin1,
            };
          } else {
            throw new Error(`Location not found: ${clean}`);
          }
        }
      } catch (e: any) {
        throw new Error(e?.message || `Location search failed: ${clean}`);
      }
    }

    const forecastUrl = `https://api.open-meteo.com/v1/forecast?latitude=${geo.latitude}&longitude=${geo.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,cloud_cover,surface_pressure,wind_speed_10m,wind_direction_10m&hourly=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation_probability,precipitation,weather_code,surface_pressure,cloud_cover,wind_speed_10m,wind_direction_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max&timezone=auto&forecast_days=3`;

    const rawForecast = await firstValueFrom(this.http.get<any>(forecastUrl).pipe(timeout(6000)));
    return transformOpenMeteoToWttr(rawForecast, geo, lang);
  }

  private generateSyntheticTerminal(query: string): string {
    const data = this.weatherData();
    const cur = data?.current_condition?.[0];
    const area = data?.nearest_area?.[0];
    const city = area?.areaName?.[0]?.value || query;
    if (!cur) {
      return `Weather report: ${city}\n[wttr.hub fallback mirror active]`;
    }
    const temp = this.formatTemp(cur.temp_C, cur.temp_F);
    const feels = this.formatTemp(cur.FeelsLikeC, cur.FeelsLikeF);
    const desc =
      this.currentLang() === 'ru'
        ? cur.lang_ru?.[0]?.value || cur.weatherDesc?.[0]?.value || 'Ясно'
        : cur.weatherDesc?.[0]?.value || 'Clear';
    const wind = `${cur.windspeedKmph} km/h ${cur.winddir16Point}`;
    const humidity = `${cur.humidity}%`;
    const pressure = `${cur.pressure} hPa`;

    const days = data?.weather || [];
    const forecastLines = days.map((d) => {
      const min = this.formatTemp(d.mintempC, d.mintempF);
      const max = this.formatTemp(d.maxtempC, d.maxtempF);
      const sun = d.astronomy?.[0];
      const sunInfo = sun ? ` (Sunrise: ${sun.sunrise}, Sunset: ${sun.sunset})` : '';
      return `  ${d.date}: ${min} .. ${max}${sunInfo}`;
    });

    return [
      `Weather report: ${city}`,
      ``,
      `    \\   /     ${desc}`,
      `     .-.      ${temp} (feels like ${feels})`,
      `  ― (   ) ―   Wind: ${wind}`,
      `     \`-\`      Humidity: ${humidity} | Pressure: ${pressure}`,
      `    /   \\     Cloud cover: ${cur.cloudcover}% | UV: ${cur.uvIndex}`,
      ``,
      ...(forecastLines.length > 0 ? ['Forecast:', ...forecastLines, ''] : []),
      `[wttr.hub mirror active (Open-Meteo)]`,
    ].join('\n');
  }

  private generateSyntheticWebHtml(query: string): string {
    const data = this.weatherData();
    const cur = data?.current_condition?.[0];
    const area = data?.nearest_area?.[0];
    const city = area?.areaName?.[0]?.value || query;
    const temp = cur ? this.formatTemp(cur.temp_C, cur.temp_F) : '';
    const desc = cur
      ? this.currentLang() === 'ru'
        ? cur.lang_ru?.[0]?.value || cur.weatherDesc?.[0]?.value
        : cur.weatherDesc?.[0]?.value
      : '';

    return `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-align: center; padding: 2rem; color: #94a3b8;">
        <h2 style="color: #38bdf8; margin-bottom: 0.5rem;">${city}</h2>
        <div style="font-size: 2.5rem; font-weight: bold; color: #f8fafc; margin: 1rem 0;">${temp}</div>
        <div style="font-size: 1.1rem; color: #cbd5e1; margin-bottom: 1.5rem;">${desc}</div>
        <p style="font-size: 0.85rem; opacity: 0.8;">wttr.in прямой веб-отчет недоступен на данной сети.<br>Данные отображаются через резервное зеркало wttr.hub.</p>
      </div>
    `;
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

  // Comparison Dialog Actions
  openCompare(targetCity?: string): void {
    if (targetCity) {
      this.compareTargetCity.set(targetCity);
    }
    this.isCompareOpen.set(true);
  }

  closeCompare(): void {
    this.isCompareOpen.set(false);
  }

  toggleCompare(): void {
    if (this.isCompareOpen()) {
      this.closeCompare();
    } else {
      this.openCompare();
    }
  }

  // Language Menu Actions
  toggleLangMenu(): void {
    this.isLangMenuOpen.update((v) => !v);
  }

  closeLangMenu(): void {
    this.isLangMenuOpen.set(false);
  }

  openLangMenu(): void {
    this.isLangMenuOpen.set(true);
  }

  async refreshCurrentWeather(): Promise<void> {
    this.wttrBlockedInSession = false;
    if (this.window?.sessionStorage) {
      try {
        this.window.sessionStorage.removeItem('wttr_fallback_active');
      } catch {}
    }
    if (this.window?.localStorage) {
      try {
        this.window.localStorage.removeItem('wttr_fallback_active');
      } catch {}
    }
    const cur = this.currentQuery();
    const cacheKey = `${cur.toLowerCase()}_${this.currentLang()}`;
    this.cache.delete(cacheKey);
    await this.fetchWeather(cur, true);
    if (this.webHtml()) {
      this.fetchWebHtml(cur, true);
    }
  }

  async fetchComparisonWeather(query: string): Promise<WttrResponse> {
    const cleanQuery = query.trim() || 'Sochi';
    const cacheKey = `compare_${cleanQuery.toLowerCase()}_${this.currentLang()}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTtlMs) {
      return cached.data;
    }

    let data: WttrResponse;
    if (this.wttrBlockedInSession) {
      data = await this.fetchOpenMeteoFallback(cleanQuery, this.currentLang());
    } else {
      try {
        data = await this.requestWithFallback<WttrResponse>(
          `${this.primaryBase}/${encodeURIComponent(cleanQuery)}?format=j1&lang=${this.currentLang()}`,
          `${this.fallbackBase}/${encodeURIComponent(cleanQuery)}?format=j1&lang=${this.currentLang()}`,
        );
      } catch {
        data = await this.fetchOpenMeteoFallback(cleanQuery, this.currentLang());
      }
    }

    this.cache.set(cacheKey, { data, timestamp: Date.now() });
    return data;
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

  clearHistory(): void {
    this.searchHistory.set([]);
    try {
      this.window?.localStorage?.removeItem(this.historyKey);
    } catch {}
  }

  removeFromHistory(query: string): void {
    const q = query.trim().toLowerCase();
    const updated = this.searchHistory().filter((item) => item.toLowerCase() !== q);
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

  // Offline data persistence & retrieval
  saveOfflineData(cacheKey: string, data: WttrResponse): void {
    if (!this.window?.localStorage) return;
    try {
      const payload = JSON.stringify({ data, timestamp: Date.now() });
      this.window.localStorage.setItem(this.offlineDataKeyPrefix + cacheKey, payload);
      this.window.localStorage.setItem(this.offlineLatestKey, payload);
    } catch {}
  }

  getOfflineData(
    cacheKey: string,
    allowGeneralFallback = false,
  ): { data: WttrResponse; timestamp: number } | null {
    if (!this.window?.localStorage) return null;
    try {
      const raw = this.window.localStorage.getItem(this.offlineDataKeyPrefix + cacheKey);
      if (raw) return JSON.parse(raw);
      if (allowGeneralFallback) {
        const latest = this.window.localStorage.getItem(this.offlineLatestKey);
        if (latest) return JSON.parse(latest);
      }
    } catch {}
    return null;
  }

  formatOfflineTimestamp(timestamp: number | null): string {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  reloadWeather(): Promise<void> {
    return this.fetchWeather(this.currentQuery(), true);
  }
}
