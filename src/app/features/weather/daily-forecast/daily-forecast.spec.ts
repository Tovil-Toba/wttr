import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { WeatherDay, WttrResponse } from '../weather.model';
import { WeatherService } from '../weather.service';
import { DailyForecastComponent } from './daily-forecast';

describe('DailyForecastComponent', () => {
  let fixture: ComponentFixture<DailyForecastComponent>;
  let component: DailyForecastComponent;
  let element: HTMLElement;
  let weatherService: WeatherService;

  const mockForecastDay = {
    date: '2026-10-10',
    maxtempC: '20',
    maxtempF: '68',
    mintempC: '10',
    mintempF: '50',
    sunHour: '7.5',
    uvIndex: '4',
    astronomy: [
      {
        sunrise: '06:30 AM',
        sunset: '06:45 PM',
        moonrise: '08:00 PM',
        moonset: '05:00 AM',
        moon_phase: 'Full Moon',
        moon_illumination: '100',
      },
    ],
    hourly: [
      {
        time: '1200',
        tempC: '19',
        tempF: '66',
        weatherCode: '113',
        weatherDesc: [{ value: 'Sunny' }],
        windspeedKmph: '10',
        winddir16Point: 'N',
        humidity: '50',
        visibility: '10',
        pressure: '1015',
        cloudcover: '10',
        chanceofrain: '0',
      } as any,
    ],
  } as unknown as WeatherDay;

  beforeEach(async () => {
    localStorage.clear();
    TestBed.resetTestingModule();

    await TestBed.configureTestingModule({
      imports: [DailyForecastComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        WeatherService,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DailyForecastComponent);
    component = fixture.componentInstance;
    element = fixture.nativeElement as HTMLElement;
    weatherService = TestBed.inject(WeatherService);
    weatherService.setLanguage('ru');

    const mockResponse = {
      weather: [
        mockForecastDay,
        { ...mockForecastDay, date: '2026-10-11' },
        { ...mockForecastDay, date: '2026-10-12' },
      ],
    } as unknown as WttrResponse;

    weatherService.weatherData.set(mockResponse);
    await fixture.whenStable();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should create and render 3 forecast cards', () => {
    expect(component).toBeTruthy();
    expect(element.textContent).toContain('Прогноз на 3 дня и астрономия');
    expect(element.textContent).toContain('Сегодня');
    expect(element.textContent).toContain('Завтра');
    expect(element.textContent).toContain('Послезавтра');
  });

  it('should format labels correctly based on day index', () => {
    expect(component.formatDateRu('2026-10-10', 0).dayLabel).toBe('Сегодня');
    expect(component.formatDateRu('2026-10-11', 1).dayLabel).toBe('Завтра');
    expect(component.formatDateRu('2026-10-12', 2).dayLabel).toBe('Послезавтра');
  });

  it('should extract midday condition and moon info', () => {
    const midday = component.getMiddayCondition(mockForecastDay);
    expect(midday.descRu).toBe('Солнечно');
    expect(midday.theme.icon).toBe('pi pi-sun');

    const moon = component.getMoonInfo(mockForecastDay);
    expect(moon.nameRu).toBe('Полнолуние');
    expect(moon.icon).toBe('🌕');
  });

  it('should dynamically switch forecast labels to English', async () => {
    weatherService.setLanguage('en');
    await fixture.whenStable();

    expect(element.textContent).toContain('3-Day Forecast & Astronomy');
    expect(element.textContent).toContain('Today');
    expect(element.textContent).toContain('Tomorrow');
    expect(element.textContent).toContain('Day after tomorrow');
    expect(component.formatDateRu('2026-10-10', 0).dayLabel).toBe('Today');
    const moon = component.getMoonInfo(mockForecastDay);
    expect(moon.nameRu).toBe('Full Moon');
  });
});
