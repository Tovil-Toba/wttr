import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { I18nService } from '../../../core/i18n';
import { WttrResponse } from '../weather.model';
import { WeatherService } from '../weather.service';
import { WeatherCompareModalComponent } from './weather-compare-modal';

const mockCity1Response = {
  current_condition: [
    {
      temp_C: '10',
      temp_F: '50',
      FeelsLikeC: '8',
      FeelsLikeF: '46',
      humidity: '70',
      windspeedKmph: '15',
      windspeedMiles: '9',
      pressure: '1013',
      uvIndex: '3',
      weatherCode: '116',
      weatherDesc: [{ value: 'Partly Cloudy' }],
      observation_time: '12:00 PM',
    },
  ],
  weather: [
    {
      date: '2026-10-10',
      maxtempC: '14',
      mintempC: '6',
      sunHour: '7.5',
      hourly: [
        {
          time: '700',
          tempC: '10',
          FeelsLikeC: '8',
          chanceofrain: '20',
          weatherCode: '116',
          weatherDesc: [{ value: 'Partly Cloudy' }],
        },
      ],
    },
  ],
  nearest_area: [
    {
      areaName: [{ value: 'Moscow' }],
      country: [{ value: 'Russia' }],
      region: [{ value: 'Moscow' }],
    },
  ],
} as unknown as WttrResponse;

const mockCity2Response = {
  current_condition: [
    {
      temp_C: '18',
      temp_F: '64',
      FeelsLikeC: '19',
      FeelsLikeF: '66',
      humidity: '55',
      windspeedKmph: '8',
      windspeedMiles: '5',
      pressure: '1018',
      uvIndex: '6',
      weatherCode: '113',
      weatherDesc: [{ value: 'Sunny' }],
      observation_time: '12:00 PM',
    },
  ],
  weather: [
    {
      date: '2026-10-10',
      maxtempC: '21',
      mintempC: '12',
      sunHour: '9.0',
      hourly: [
        {
          time: '700',
          tempC: '18',
          FeelsLikeC: '19',
          chanceofrain: '5',
          weatherCode: '113',
          weatherDesc: [{ value: 'Sunny' }],
        },
      ],
    },
  ],
  nearest_area: [
    {
      areaName: [{ value: 'Sochi' }],
      country: [{ value: 'Russia' }],
      region: [{ value: 'Krasnodar' }],
    },
  ],
} as unknown as WttrResponse;

describe('WeatherCompareModalComponent', () => {
  let component: WeatherCompareModalComponent;
  let fixture: ComponentFixture<WeatherCompareModalComponent>;
  let weatherService: WeatherService;
  let element: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WeatherCompareModalComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        WeatherService,
        I18nService,
      ],
    }).compileComponents();

    weatherService = TestBed.inject(WeatherService);
    weatherService.setLanguage('ru');
    weatherService.weatherData.set(mockCity1Response);
    weatherService.currentQuery.set('Moscow');

    // Spy on fetchComparisonWeather to return mock city 2 response
    vi.spyOn(weatherService, 'fetchComparisonWeather').mockResolvedValue(mockCity2Response);

    fixture = TestBed.createComponent(WeatherCompareModalComponent);
    component = fixture.componentInstance;
    element = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  it('should create and display comparison modal with header and search', () => {
    expect(component).toBeTruthy();
    expect(element.textContent).toContain('Сравнение погоды двух городов');
    expect(element.querySelector('input[name="compareQuery"]')).toBeTruthy();
  });

  it('should calculate temperature differences and summary banner', async () => {
    await component.loadCompareCity('Sochi');
    fixture.detectChanges();
    await fixture.whenStable();

    const d = component.delta();
    expect(d).toBeTruthy();
    expect(d?.tempDiff).toBe(8); // 18 - 10 = +8
    expect(d?.feelsDiff).toBe(11); // 19 - 8 = +11
    expect(d?.headlineType).toBe('warmer');
    expect(d?.headline).toContain('Сочи: на +8° теплее, чем Москва');
  });

  it('should display comparison cards for both cities', async () => {
    await component.loadCompareCity('Sochi');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(element.textContent).toContain('Москва');
    expect(element.textContent).toContain('Сочи');
    expect(element.textContent).toContain('VS');
  });

  it('should support swapping cities', async () => {
    const fetchSpy = vi.spyOn(weatherService, 'fetchWeather');
    component.compareCity.set('Sochi');

    component.swapCities();
    expect(fetchSpy).toHaveBeenCalledWith('Sochi');
  });

  it('should support making comparison city the primary city', () => {
    const fetchSpy = vi.spyOn(weatherService, 'fetchWeather');
    let closed = false;
    component.close.subscribe(() => (closed = true));
    component.compareCity.set('Sochi');

    component.makePrimary();
    expect(fetchSpy).toHaveBeenCalledWith('Sochi');
    expect(closed).toBe(true);
  });

  it('should emit close when escape key is pressed', () => {
    let closed = false;
    component.close.subscribe(() => (closed = true));

    component.onEscape();
    expect(closed).toBe(true);
  });
});
