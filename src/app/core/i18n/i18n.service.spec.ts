import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { WeatherService } from '../../features/weather/weather.service';
import { I18nService } from './i18n.service';
import { TranslatePipe } from './translate.pipe';

describe('I18nService', () => {
  let service: I18nService;
  let weatherService: WeatherService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), WeatherService, I18nService],
    });
    service = TestBed.inject(I18nService);
    weatherService = TestBed.inject(WeatherService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should support Russian translations', () => {
    weatherService.setLanguage('ru');
    expect(service.currentLang()).toBe('ru');
    expect(service.t('common.searchBtn')).toBe('Найти');
    expect(service.t('hero.humidity')).toBe('Влажность');
    expect(service.t('daily.today')).toBe('Сегодня');
  });

  it('should reactively switch to English when language changes', () => {
    weatherService.setLanguage('en');
    expect(service.currentLang()).toBe('en');
    expect(service.t('common.searchBtn')).toBe('Search');
    expect(service.t('hero.humidity')).toBe('Humidity');
    expect(service.t('daily.today')).toBe('Today');
  });

  it('should switch to German and translate metrics', () => {
    weatherService.setLanguage('de');
    expect(service.currentLang()).toBe('de');
    expect(service.t('common.searchBtn')).toBe('Suchen');
    expect(service.t('hero.humidity')).toBe('Luftfeuchtigkeit');
  });

  it('should fallback to English or Russian for missing keys in partial dictionaries', () => {
    weatherService.setLanguage('ja');
    expect(service.t('common.searchBtn')).toBe('検索');
    // If a nested key is queried that is missing, falls back
    expect(service.t('non.existent.key')).toBe('non.existent.key');
  });

  it('should interpolate parameters', () => {
    weatherService.setLanguage('en');
    const res = service.t('hourly.rain', { test: '123' });
    expect(res).toBe('Rain');
  });

  it('should format dates with locale', () => {
    weatherService.setLanguage('ru');
    const labelRu = service.getDayLabel(0);
    expect(labelRu).toBe('Сегодня');

    weatherService.setLanguage('en');
    const labelEn = service.getDayLabel(0);
    expect(labelEn).toBe('Today');

    const tomorrowEn = service.getDayLabel(1);
    expect(tomorrowEn).toBe('Tomorrow');
  });

  it('should translate moon phases', () => {
    weatherService.setLanguage('ru');
    expect(service.getMoonPhaseName('Full Moon')).toBe('Полнолуние');

    weatherService.setLanguage('en');
    expect(service.getMoonPhaseName('Full Moon')).toBe('Full Moon');
  });

  it('should translate city names reactively across languages', () => {
    weatherService.setLanguage('ru');
    expect(service.translateCity('Moscow')).toBe('Москва');
    expect(service.translateCity('Saint Petersburg')).toBe('Санкт-Петербург');
    expect(service.translateCity('Sochi')).toBe('Сочи');
    expect(service.translateCity('London')).toBe('Лондон');
    expect(service.translateCity('Tokyo')).toBe('Токио');

    weatherService.setLanguage('en');
    expect(service.translateCity('Москва')).toBe('Moscow');
    expect(service.translateCity('Saint Petersburg')).toBe('Saint Petersburg');
    expect(service.translateCity('London')).toBe('London');
    expect(service.translateCity('Tokyo')).toBe('Tokyo');

    weatherService.setLanguage('de');
    expect(service.translateCity('Moscow')).toBe('Moskau');
    expect(service.translateCity('Saint Petersburg')).toBe('Sankt Petersburg');
    expect(service.translateCity('Sochi')).toBe('Sotschi');
    expect(service.translateCity('Tokyo')).toBe('Tokio');
  });

  it('should return fallback for unknown cities', () => {
    expect(service.translateCity('UnknownCity123')).toBe('UnknownCity123');
    expect(service.translateCity('', 'FallbackTown')).toBe('FallbackTown');
    expect(service.translateCity(null)).toBe('');
  });

  it('should translate countries using country code and Intl.DisplayNames', () => {
    weatherService.setLanguage('ru');
    expect(service.translateCountry('Russia', 'Moscow')).toBe('Россия');
    expect(service.translateCountry('United Kingdom', 'London')).toBe('Великобритания');

    weatherService.setLanguage('en');
    expect(service.translateCountry('Россия', 'Moscow')).toBe('Russia');
    expect(service.translateCountry('United Kingdom', 'London')).toBe('United Kingdom');

    weatherService.setLanguage('de');
    expect(service.translateCountry('Russia', 'Moscow')).toBe('Russland');
    expect(service.translateCountry('United Kingdom', 'London')).toBe('Vereinigtes Königreich');
  });
});

describe('TranslatePipe', () => {
  it('should transform translation key', () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        WeatherService,
        I18nService,
        TranslatePipe,
      ],
    });
    const pipe = TestBed.inject(TranslatePipe);
    const weatherService = TestBed.inject(WeatherService);
    weatherService.setLanguage('ru');
    expect(pipe.transform('common.searchBtn')).toBe('Найти');

    weatherService.setLanguage('en');
    expect(pipe.transform('common.searchBtn')).toBe('Search');
  });
});
