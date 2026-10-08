import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WttrResponse } from './weather.model';
import { WeatherService } from './weather.service';

describe('WeatherService', () => {
  let service: WeatherService;
  let httpMock: HttpTestingController;

  const mockWeatherResponse = {
    current_condition: [
      {
        temp_C: '22',
        temp_F: '72',
        FeelsLikeC: '24',
        FeelsLikeF: '75',
        humidity: '55',
        pressure: '1013',
        visibility: '10',
        windspeedKmph: '18',
        winddir16Point: 'NW',
        weatherCode: '113',
        weatherDesc: [{ value: 'Sunny' }],
        uvIndex: '5',
        cloudcover: '10',
        precipMM: '0.0',
        observation_time: '02:30 PM',
      },
    ],
    nearest_area: [
      {
        areaName: [{ value: 'Obninsk' }],
        region: [{ value: 'Kaluga' }],
        country: [{ value: 'Russia' }],
        latitude: '55.0968',
        longitude: '36.6122',
      },
    ],
    weather: [],
  } as unknown as WttrResponse;

  beforeEach(() => {
    TestBed.resetTestingModule();
    window.localStorage.clear();
    window.sessionStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        WeatherService,
      ],
    });

    service = TestBed.inject(WeatherService);
    httpMock = TestBed.inject(HttpTestingController);

    // Handle initial fetch on service creation (constructor calls fetchWeather('Obninsk') and fetchTerminalOutput)
    const initialReqs = httpMock.match((req) => req.url.includes('wttr.in'));
    for (const req of initialReqs) {
      if (req.request.url.includes('format=j1')) {
        req.flush(mockWeatherResponse);
      } else {
        req.flush('Mock terminal output');
      }
    }
  });

  afterEach(() => {
    httpMock.verify();
    window.localStorage.clear();
    window.sessionStorage.clear();
    TestBed.resetTestingModule();
  });

  describe('Formatting & Unit Conversions', () => {
    it('should format temperature in Celsius with sign', () => {
      service.setTempUnit('C');
      expect(service.formatTemp('25', '77')).toBe('+25°C');
      expect(service.formatTemp('-3', '26')).toBe('-3°C');
      expect(service.formatTemp('0', '32')).toBe('0°C');
    });

    it('should format temperature in Fahrenheit', () => {
      service.setTempUnit('F');
      expect(service.formatTemp('25', '77')).toBe('+77°F');
      expect(service.formatTemp('-20', '-4')).toBe('-4°F');
    });

    it('should format wind speed in m/s, km/h, and mph', () => {
      service.setWindUnit('ms');
      expect(service.formatWind('36')).toBe('10 м/с');

      service.setWindUnit('kmh');
      expect(service.formatWind('36')).toBe('36 км/ч');

      service.setWindUnit('mph');
      expect(service.formatWind('36')).toBe('22 mph');
    });

    it('should format atmospheric pressure in mmHg and hPa', () => {
      service.setPressureUnit('mmHg');
      expect(service.formatPressure('1013')).toBe('760 мм рт. ст.');

      service.setPressureUnit('hPa');
      expect(service.formatPressure('1013')).toBe('1013 гПа');
    });

    it('should convert 12-hour AM/PM time to 24-hour format', () => {
      expect(service.formatTo24Hour('04:15 PM')).toBe('16:15');
      expect(service.formatTo24Hour('09:40 AM')).toBe('09:40');
      expect(service.formatTo24Hour('12:00 AM')).toBe('00:00');
      expect(service.formatTo24Hour('12:30 PM')).toBe('12:30');
      expect(service.formatTo24Hour('')).toBe('');
      expect(service.formatTo24Hour('invalid')).toBe('invalid');
    });

    it('should translate weather descriptions to Russian', () => {
      expect(service.getWeatherDescriptionRu('Sunny')).toBe('Солнечно');
      expect(service.getWeatherDescriptionRu('Light rain')).toBe('Небольшой дождь');
      expect(service.getWeatherDescriptionRu('Blizzard')).toBe('Буран / Пурга');
      expect(service.getWeatherDescriptionRu('Unknown Code', 'Спец. перевод')).toBe(
        'Спец. перевод',
      );
      expect(service.getWeatherDescriptionRu('Unknown Code')).toBe('Unknown Code');
    });

    it('should return moon phase info with emoji', () => {
      const fullMoon = service.getMoonPhaseInfo('Full Moon');
      expect(fullMoon.nameRu).toBe('Полнолуние');
      expect(fullMoon.icon).toBe('🌕');

      const newMoon = service.getMoonPhaseInfo('New Moon');
      expect(newMoon.nameRu).toBe('Новолуние');
      expect(newMoon.icon).toBe('🌑');
    });

    it('should determine theme and icon by weather code', () => {
      const thunderstorm = service.getWeatherTheme('200', 'Thundery outbreaks');
      expect(thunderstorm.icon).toBe('pi pi-bolt');
      expect(thunderstorm.conditionType).toBe('thunder');
      expect(thunderstorm.badgeSeverity).toBe('danger');

      const rain = service.getWeatherTheme('300', 'Moderate rain');
      expect(rain.icon).toBe('pi pi-cloud-download');
      expect(rain.conditionType).toBe('rain');

      const snow = service.getWeatherTheme('330', 'Moderate snow');
      expect(snow.icon).toBe('pi pi-cloud');
      expect(snow.conditionType).toBe('snow');

      const fog = service.getWeatherTheme('248', 'Fog');
      expect(fog.icon).toBe('pi pi-align-justify');
      expect(fog.conditionType).toBe('fog');

      const sunny = service.getWeatherTheme('113', 'Sunny');
      expect(sunny.icon).toBe('pi pi-sun');
      expect(sunny.conditionType).toBe('sunny');

      const clearNight = service.getWeatherTheme('113', 'Clear', true);
      expect(clearNight.icon).toBe('pi pi-moon');
      expect(clearNight.conditionType).toBe('clear-night');

      const partlyDay = service.getWeatherTheme('116', 'Partly cloudy', false);
      expect(partlyDay.conditionType).toBe('partly-cloudy-day');

      const partlyNight = service.getWeatherTheme('116', 'Partly cloudy', true);
      expect(partlyNight.conditionType).toBe('partly-cloudy-night');

      const overcast = service.getWeatherTheme('122', 'Overcast');
      expect(overcast.conditionType).toBe('overcast');

      const drizzle = service.getWeatherTheme('266', 'Light drizzle');
      expect(drizzle.conditionType).toBe('drizzle');

      const heavyRain = service.getWeatherTheme('308', 'Heavy rain');
      expect(heavyRain.conditionType).toBe('heavy-rain');

      const blizzard = service.getWeatherTheme('230', 'Blizzard');
      expect(blizzard.conditionType).toBe('blizzard');

      const sleet = service.getWeatherTheme('311', 'Light freezing rain');
      expect(sleet.conditionType).toBe('sleet');

      const wind = service.getWeatherTheme('0', 'Windy');
      expect(wind.conditionType).toBe('wind');
    });

    it('should optimize wttr html by stripping external scripts and fonts and injecting scrollbar', () => {
      const dirtyHtml = `
        <html>
          <head>
            <style>body { color: white; }</style>
            <link rel="stylesheet" href="https://adobe-fonts.github.io/source-code-pro/source-code-pro.css">
            <script src="https://platform.twitter.com/widgets.js"></script>
          </head>
          <body>Weather content</body>
        </html>
      `;
      const clean = (service as any).optimizeWttrHtml(dirtyHtml);
      expect(clean).not.toContain('adobe-fonts');
      expect(clean).not.toContain('platform.twitter.com');
      expect(clean).toContain('Weather content');
      expect(clean).toContain('scrollbar-width: thin');
    });
  });

  describe('State & Favorites Management', () => {
    it('should add and remove favorites, updating isCurrentFavorite', () => {
      service.currentQuery.set('Paris');
      expect(service.isCurrentFavorite()).toBe(false);

      service.toggleFavorite();
      expect(service.isCurrentFavorite()).toBe(true);
      expect(service.favorites().some((f) => f.query === 'Paris')).toBe(true);

      // Toggling again removes it
      service.toggleFavorite();
      expect(service.isCurrentFavorite()).toBe(false);
    });

    it('should remove favorite by query name', () => {
      service.currentQuery.set('Berlin');
      service.toggleFavorite();
      expect(service.favorites().some((f) => f.query === 'Berlin')).toBe(true);

      service.removeFavorite('Berlin');
      expect(service.favorites().some((f) => f.query === 'Berlin')).toBe(false);
    });

    it('should add unique query to search history up to 10 entries', () => {
      (service as any).addToHistory('City1');
      (service as any).addToHistory('City2');
      (service as any).addToHistory('City1'); // Duplicate should move to top
      expect(service.searchHistory()[0]).toBe('City1');
      expect(service.searchHistory()[1]).toBe('City2');
    });

    it('should initialize language from system settings and allow switching', () => {
      // In jsdom environment, navigator.language is 'en-US', so it initializes to 'en'
      expect(service.currentLang()).toBe('en');
      expect(service.currentLanguageInfo().label).toBe('English');
      expect(service.currentLanguageInfo().badge).toBe('EN');

      service.setLanguage('ru');
      expect(service.currentLang()).toBe('ru');
      expect(service.currentLanguageInfo().label).toBe('Русский');
      expect(service.currentLanguageInfo().badge).toBe('RU');
      expect(window.localStorage.getItem('wttr_lang')).toBe('ru');
      expect(document.documentElement.lang).toBe('ru');

      // Flush HTTP calls triggered by setLanguage
      const ruReqs = httpMock.match((r) => r.url.includes('lang=ru'));
      for (const r of ruReqs) {
        if (r.request.url.includes('format=j1')) {
          r.flush(mockWeatherResponse);
        } else {
          r.flush('Terminal');
        }
      }

      service.setLanguage('en');
      expect(service.currentLang()).toBe('en');
      expect(service.currentLanguageInfo().code).toBe('en');
      expect(service.currentLanguageInfo().badge).toBe('EN');
      expect(window.localStorage.getItem('wttr_lang')).toBe('en');
      expect(document.documentElement.lang).toBe('en');

      // Flush HTTP calls triggered by setLanguage
      const reqs = httpMock.match((r) => r.url.includes('lang=en'));
      for (const r of reqs) {
        if (r.request.url.includes('format=j1')) {
          r.flush(mockWeatherResponse);
        } else {
          r.flush('Terminal');
        }
      }

      // Dynamic weather description in English
      expect(service.getWeatherDescription('Sunny')).toBe('Sunny');
      expect(service.getWeatherDescription('Heavy rain', 'Starker Regen')).toBe('Heavy rain');

      // Dynamic weather description in German
      service.setLanguage('de');
      const deReqs = httpMock.match((r) => r.url.includes('lang=de'));
      for (const r of deReqs) {
        r.flush(r.request.url.includes('format=j1') ? mockWeatherResponse : 'Terminal');
      }
      expect(service.getWeatherDescription('Heavy rain', 'Starker Regen')).toBe('Starker Regen');
      expect(document.documentElement.lang).toBe('de');
    });

    it('should correctly detect supported system languages', () => {
      const origLanguages = navigator.languages;
      const origLanguage = navigator.language;

      try {
        // Test exact matches and region variants
        Object.defineProperty(navigator, 'languages', {
          value: ['ru-RU', 'ru'],
          configurable: true,
        });
        Object.defineProperty(navigator, 'language', { value: 'ru-RU', configurable: true });
        expect(service.detectSystemLanguage()).toBe('ru');

        Object.defineProperty(navigator, 'languages', {
          value: ['de-DE', 'de'],
          configurable: true,
        });
        Object.defineProperty(navigator, 'language', { value: 'de-DE', configurable: true });
        expect(service.detectSystemLanguage()).toBe('de');

        Object.defineProperty(navigator, 'languages', { value: ['pt-BR'], configurable: true });
        Object.defineProperty(navigator, 'language', { value: 'pt-BR', configurable: true });
        expect(service.detectSystemLanguage()).toBe('pt-br');

        Object.defineProperty(navigator, 'languages', { value: ['zh-CN'], configurable: true });
        Object.defineProperty(navigator, 'language', { value: 'zh-CN', configurable: true });
        expect(service.detectSystemLanguage()).toBe('zh-cn');

        Object.defineProperty(navigator, 'languages', { value: ['es-ES'], configurable: true });
        Object.defineProperty(navigator, 'language', { value: 'es-ES', configurable: true });
        expect(service.detectSystemLanguage()).toBe('es');

        // Test unsupported language fallback
        Object.defineProperty(navigator, 'languages', {
          value: ['pl-PL', 'pl'],
          configurable: true,
        });
        Object.defineProperty(navigator, 'language', { value: 'pl-PL', configurable: true });
        expect(service.detectSystemLanguage()).toBeNull();
      } finally {
        Object.defineProperty(navigator, 'languages', { value: origLanguages, configurable: true });
        Object.defineProperty(navigator, 'language', { value: origLanguage, configurable: true });
      }
    });

    it('should prioritize saved localStorage language over system language', () => {
      window.localStorage.setItem('wttr_lang', 'fr');
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          provideZonelessChangeDetection(),
          provideHttpClient(),
          provideHttpClientTesting(),
          WeatherService,
        ],
      });
      const newService = TestBed.inject(WeatherService);
      const newHttpMock = TestBed.inject(HttpTestingController);
      const reqs = newHttpMock.match((r) => r.url.includes('lang=fr'));
      for (const r of reqs) {
        r.flush(r.request.url.includes('format=j1') ? mockWeatherResponse : 'Terminal');
      }

      expect(newService.currentLang()).toBe('fr');
      expect(newService.currentLanguageInfo().badge).toBe('FR');
    });
  });

  describe('HTTP API & Fallback', () => {
    it('should successfully fetch weather and update signals', async () => {
      const lang = service.currentLang();
      const fetchPromise = service.fetchWeather('London');

      const req = httpMock.expectOne(`https://wttr.in/London?format=j1&lang=${lang}`);
      expect(req.request.method).toBe('GET');
      req.flush(mockWeatherResponse);

      // Flush terminal fetch triggered in parallel
      const termReq = httpMock.expectOne(`https://wttr.in/London?T&lang=${lang}`);
      termReq.flush('ANSI Terminal London');

      await fetchPromise;

      expect(service.weatherData()).toEqual(mockWeatherResponse);
      expect(service.currentQuery()).toBe('London');
      expect(service.isLoading()).toBe(false);
      expect(service.errorMessage()).toBeNull();
    });

    it('should fallback to secondary URL when primary URL fails', async () => {
      const lang = service.currentLang();
      const fetchPromise = service.fetchWeather('Tokyo');

      // Flush terminal fetch
      const termReq = httpMock.expectOne(`https://wttr.in/Tokyo?T&lang=${lang}`);
      termReq.flush('Terminal Tokyo');

      // Primary URL fails
      const primaryReq = httpMock.expectOne(`https://wttr.in/Tokyo?format=j1&lang=${lang}`);
      primaryReq.flush('Primary failed', { status: 500, statusText: 'Server Error' });

      await Promise.resolve();

      // Fallback URL is requested
      const fallbackReq = httpMock.expectOne(`https://wttr.is/Tokyo?format=j1&lang=${lang}`);
      fallbackReq.flush(mockWeatherResponse);

      await fetchPromise;

      expect(service.weatherData()).toEqual(mockWeatherResponse);
      expect(service.errorMessage()).toBeNull();
    });

    it('should set error message when both primary and fallback fail', async () => {
      const lang = service.currentLang();
      const fetchPromise = service.fetchWeather('UnknownPlace');

      // Primary terminal fails
      const termReq = httpMock.expectOne(`https://wttr.in/UnknownPlace?T&lang=${lang}`);
      termReq.flush('Error', { status: 500, statusText: 'Server Error' });

      // Primary weather fails
      const primaryReq = httpMock.expectOne(`https://wttr.in/UnknownPlace?format=j1&lang=${lang}`);
      primaryReq.flush('Primary failed', { status: 500, statusText: 'Server Error' });

      await Promise.resolve();

      // Fallback terminal fails
      const fallbackTermReq = httpMock.expectOne(`https://wttr.is/UnknownPlace?T&lang=${lang}`);
      fallbackTermReq.flush('Error', { status: 500, statusText: 'Server Error' });

      // Fallback weather fails
      const fallbackReq = httpMock.expectOne(`https://wttr.is/UnknownPlace?format=j1&lang=${lang}`);
      fallbackReq.flush('Fallback failed', { status: 500, statusText: 'Server Error' });

      await new Promise((r) => setTimeout(r, 0));

      // Open-Meteo geocoding also fails
      const geoReq = httpMock.expectOne((r) => r.url.includes('geocoding-api.open-meteo.com'));
      geoReq.flush('Geo failed', { status: 500, statusText: 'Server Error' });

      await fetchPromise;

      expect(service.isLoading()).toBe(false);
      expect(service.errorMessage()).toBeTruthy();
    });

    it('should fallback to Open-Meteo when both wttr.in and wttr.is fail', async () => {
      const lang = service.currentLang();
      const fetchPromise = service.fetchWeather('Valencia');

      const termReq = httpMock.expectOne(`https://wttr.in/Valencia?T&lang=${lang}`);
      termReq.flush('Error', { status: 500, statusText: 'Server Error' });

      const primaryReq = httpMock.expectOne(`https://wttr.in/Valencia?format=j1&lang=${lang}`);
      primaryReq.flush('Primary failed', { status: 500, statusText: 'Server Error' });

      await Promise.resolve();

      const termFallbackReq = httpMock.expectOne(`https://wttr.is/Valencia?T&lang=${lang}`);
      termFallbackReq.flush('Error', { status: 500, statusText: 'Server Error' });

      const fallbackReq = httpMock.expectOne(`https://wttr.is/Valencia?format=j1&lang=${lang}`);
      fallbackReq.flush('Fallback failed', { status: 500, statusText: 'Server Error' });

      await new Promise((r) => setTimeout(r, 0));

      // Open-Meteo geocoding succeeds
      const geoReq = httpMock.expectOne((r) => r.url.includes('geocoding-api.open-meteo.com'));
      geoReq.flush({
        results: [
          {
            name: 'Valencia',
            latitude: 39.4699,
            longitude: -0.3763,
            country: 'Spain',
            admin1: 'Valencia',
          },
        ],
      });

      await new Promise((r) => setTimeout(r, 0));

      // Open-Meteo forecast succeeds
      const forecastReq = httpMock.expectOne((r) =>
        r.url.includes('api.open-meteo.com/v1/forecast'),
      );
      forecastReq.flush({
        current: {
          temperature_2m: 22,
          apparent_temperature: 22,
          relative_humidity_2m: 55,
          weather_code: 0,
          surface_pressure: 1015,
          wind_speed_10m: 12,
          wind_direction_10m: 180,
          cloud_cover: 10,
          precipitation: 0,
        },
        daily: {
          time: ['2026-10-08', '2026-10-09', '2026-10-10'],
          temperature_2m_max: [24, 25, 23],
          temperature_2m_min: [15, 16, 14],
          sunrise: ['2026-10-08T07:00', '2026-10-09T07:01', '2026-10-10T07:02'],
          sunset: ['2026-10-08T19:00', '2026-10-09T18:58', '2026-10-10T18:57'],
          uv_index_max: [5, 5, 4],
        },
        hourly: {
          time: new Array(72).fill('2026-10-08T00:00'),
          temperature_2m: new Array(72).fill(20),
          apparent_temperature: new Array(72).fill(20),
          weather_code: new Array(72).fill(0),
          wind_speed_10m: new Array(72).fill(10),
          wind_direction_10m: new Array(72).fill(180),
          relative_humidity_2m: new Array(72).fill(50),
          surface_pressure: new Array(72).fill(1013),
          cloud_cover: new Array(72).fill(20),
          precipitation: new Array(72).fill(0),
          precipitation_probability: new Array(72).fill(0),
        },
      });

      await fetchPromise;

      expect(service.weatherData()).toBeTruthy();
      expect(service.isFallbackMirror()).toBe(true);
      expect(service.fallbackSourceName()).toBe('Open-Meteo');
      expect(service.errorMessage()).toBeNull();
    });

    it('should serve repeated requests from in-memory cache within TTL and allow force refresh', async () => {
      const lang = service.currentLang();

      // 1. First fetch issues HTTP request
      const firstFetch = service.fetchWeather('Madrid');
      const req1 = httpMock.expectOne(`https://wttr.in/Madrid?format=j1&lang=${lang}`);
      req1.flush(mockWeatherResponse);
      const term1 = httpMock.expectOne(`https://wttr.in/Madrid?T&lang=${lang}`);
      term1.flush('Terminal Madrid');
      await firstFetch;

      expect(service.weatherData()).toEqual(mockWeatherResponse);
      expect(window.localStorage.getItem('wttr_last_city')).toBe('Madrid');

      // 2. Second fetch for same city should resolve immediately from cache WITHOUT issuing HTTP request
      await service.fetchWeather('Madrid');
      httpMock.expectNone(`https://wttr.in/Madrid?format=j1&lang=${lang}`);
      expect(service.weatherData()).toEqual(mockWeatherResponse);

      // 3. Force refresh should bypass cache and issue HTTP request
      const forceFetch = service.fetchWeather('Madrid', true);
      const reqForce = httpMock.expectOne(`https://wttr.in/Madrid?format=j1&lang=${lang}`);
      reqForce.flush(mockWeatherResponse);
      const termForce = httpMock.expectOne(`https://wttr.in/Madrid?T&lang=${lang}`);
      termForce.flush('Terminal Madrid 2');
      await forceFetch;
    });

    it('should track fallback mirror state correctly', async () => {
      const lang = service.currentLang();
      expect(service.isFallbackMirror()).toBe(false);

      // Trigger fallback
      const fetchPromise = service.fetchWeather('Kyoto');
      const termReq = httpMock.expectOne(`https://wttr.in/Kyoto?T&lang=${lang}`);
      termReq.flush('Terminal');

      const primaryReq = httpMock.expectOne(`https://wttr.in/Kyoto?format=j1&lang=${lang}`);
      primaryReq.flush('Error', { status: 500, statusText: 'Server Error' });

      await Promise.resolve();

      const fallbackReq = httpMock.expectOne(`https://wttr.is/Kyoto?format=j1&lang=${lang}`);
      fallbackReq.flush(mockWeatherResponse);

      await fetchPromise;

      expect(service.isFallbackMirror()).toBe(true);

      // Next successful primary request resets fallback mirror to false
      const nextFetch = service.fetchWeather('Rome');
      const termNext = httpMock.expectOne(`https://wttr.in/Rome?T&lang=${lang}`);
      termNext.flush('Terminal');
      const primaryNext = httpMock.expectOne(`https://wttr.in/Rome?format=j1&lang=${lang}`);
      primaryNext.flush(mockWeatherResponse);
      await nextFetch;

      expect(service.isFallbackMirror()).toBe(false);
    });

    it('should toggle, open, and close language menu and compare modal', () => {
      expect(service.isLangMenuOpen()).toBe(false);
      service.toggleLangMenu();
      expect(service.isLangMenuOpen()).toBe(true);
      service.closeLangMenu();
      expect(service.isLangMenuOpen()).toBe(false);
      service.openLangMenu();
      expect(service.isLangMenuOpen()).toBe(true);

      expect(service.isCompareOpen()).toBe(false);
      service.toggleCompare();
      expect(service.isCompareOpen()).toBe(true);
      service.toggleCompare();
      expect(service.isCompareOpen()).toBe(false);
    });

    it('should refresh current weather by bypassing cache on refreshCurrentWeather', async () => {
      const lang = service.currentLang();
      service.currentQuery.set('Valencia');

      const refreshPromise = service.refreshCurrentWeather();
      const primaryReq = httpMock.expectOne(`https://wttr.in/Valencia?format=j1&lang=${lang}`);
      primaryReq.flush(mockWeatherResponse);
      const termReq = httpMock.expectOne(`https://wttr.in/Valencia?T&lang=${lang}`);
      termReq.flush('Terminal Valencia');

      await refreshPromise;
      expect(service.weatherData()).toEqual(mockWeatherResponse);
    });

    describe('Offline Mode & Resilience', () => {
      it('should save and load offline weather data correctly', () => {
        service.saveOfflineData('rome_en', mockWeatherResponse);
        const loaded = service.getOfflineData('rome_en');
        expect(loaded).toBeTruthy();
        expect(loaded?.data).toEqual(mockWeatherResponse);
        expect(loaded?.timestamp).toBeTypeOf('number');
      });

      it('should format offline timestamp as HH:mm', () => {
        const date = new Date(2026, 9, 8, 14, 35);
        expect(service.formatOfflineTimestamp(date.getTime())).toBe('14:35');
        expect(service.formatOfflineTimestamp(null)).toBe('');
      });

      it('should immediately serve offline cached data when offline', async () => {
        service.saveOfflineData('berlin_en', mockWeatherResponse);
        service.isOffline.set(true);

        await service.fetchWeather('Berlin');

        expect(service.weatherData()).toEqual(mockWeatherResponse);
        expect(service.isOfflineData()).toBe(true);
        expect(service.offlineDataTimestamp()).toBeTypeOf('number');
        expect(service.errorMessage()).toBeNull();
      });

      it('should recover from offline cache if network request fails', async () => {
        const lang = service.currentLang();
        service.saveOfflineData('tokyo_en', mockWeatherResponse);

        const fetchPromise = service.fetchWeather('Tokyo');

        // Terminal fails
        const termReq = httpMock.expectOne(`https://wttr.in/Tokyo?T&lang=${lang}`);
        termReq.flush('Error', { status: 500, statusText: 'Server Error' });

        // Primary fails
        const primaryReq = httpMock.expectOne(`https://wttr.in/Tokyo?format=j1&lang=${lang}`);
        primaryReq.flush('Primary failed', { status: 500, statusText: 'Server Error' });

        await Promise.resolve();

        // Fallback terminal fails
        const fallbackTermReq = httpMock.expectOne(`https://wttr.is/Tokyo?T&lang=${lang}`);
        fallbackTermReq.flush('Error', { status: 500, statusText: 'Server Error' });

        // Fallback fails
        const fallbackReq = httpMock.expectOne(`https://wttr.is/Tokyo?format=j1&lang=${lang}`);
        fallbackReq.flush('Fallback failed', { status: 500, statusText: 'Server Error' });

        await new Promise((r) => setTimeout(r, 0));

        // Open-Meteo geocoding also fails
        const geoReq = httpMock.expectOne((r) => r.url.includes('geocoding-api.open-meteo.com'));
        geoReq.flush('Geo failed', { status: 500, statusText: 'Server Error' });

        await fetchPromise;

        expect(service.weatherData()).toEqual(mockWeatherResponse);
        expect(service.isOfflineData()).toBe(true);
        expect(service.errorMessage()).toBeNull();
      });
    });
  });
});
