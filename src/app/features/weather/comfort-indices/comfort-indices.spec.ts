import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { WeatherDay, WttrResponse } from '../weather.model';
import { WeatherService } from '../weather.service';
import { ComfortIndicesComponent } from './comfort-indices';

describe('ComfortIndicesComponent', () => {
  let fixture: ComponentFixture<ComfortIndicesComponent>;
  let component: ComfortIndicesComponent;
  let element: HTMLElement;
  let weatherService: WeatherService;

  const mockWeatherResponse: WttrResponse = {
    current_condition: [
      {
        temp_C: '15',
        temp_F: '59',
        FeelsLikeC: '14',
        FeelsLikeF: '57',
        cloudcover: '25',
        humidity: '65',
        observation_time: '12:00 PM',
        precipInches: '0.0',
        precipMM: '0.2',
        pressure: '1013',
        pressureInches: '30',
        uvIndex: '5',
        visibility: '10',
        visibilityMiles: '6',
        weatherCode: '113',
        weatherDesc: [{ value: 'Sunny' }],
        weatherIconUrl: [{ value: '' }],
        winddir16Point: 'WSW',
        winddirDegree: '240',
        windspeedKmph: '18',
        windspeedMiles: '11',
      },
    ],
    nearest_area: [
      {
        areaName: [{ value: 'Obninsk' }],
        country: [{ value: 'Russia' }],
        region: [{ value: 'Kaluga' }],
        latitude: '55.097',
        longitude: '36.610',
        population: '105000',
      },
    ],
    weather: [
      {
        date: '2026-10-10',
        avgtempC: '15',
        avgtempF: '59',
        maxtempC: '19',
        maxtempF: '66',
        mintempC: '11',
        mintempF: '52',
        sunHour: '8.0',
        totalSnow_cm: '0.0',
        uvIndex: '5',
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
            tempC: '18',
            tempF: '64',
            FeelsLikeC: '17',
            FeelsLikeF: '63',
            weatherCode: '113',
            weatherDesc: [{ value: 'Sunny' }],
            weatherIconUrl: [{ value: '' }],
            windspeedKmph: '18',
            windspeedMiles: '11',
            winddir16Point: 'WSW',
            winddirDegree: '240',
            humidity: '65',
            precipMM: '0.2',
            precipInches: '0.0',
            pressure: '1013',
            pressureInches: '30',
            cloudcover: '25',
            HeatIndexC: '18',
            HeatIndexF: '64',
            DewPointC: '11',
            DewPointF: '52',
            WindChillC: '18',
            WindChillF: '64',
            WindGustKmph: '35',
            WindGustMiles: '22',
            chanceoffog: '0',
            chanceoffrost: '0',
            chanceofhightemp: '0',
            chanceofovercast: '10',
            chanceofrain: '25',
            chanceofremdry: '75',
            chanceofsnow: '0',
            chanceofsunshine: '80',
            chanceofthunder: '5',
            chanceofwindy: '40',
            uvIndex: '5',
            visibility: '10',
            visibilityMiles: '6',
          },
        ],
      } as unknown as WeatherDay,
    ],
  };

  beforeEach(async () => {
    localStorage.clear();
    TestBed.resetTestingModule();

    await TestBed.configureTestingModule({
      imports: [ComfortIndicesComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        WeatherService,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ComfortIndicesComponent);
    component = fixture.componentInstance;
    element = fixture.nativeElement as HTMLElement;
    weatherService = TestBed.inject(WeatherService);
    weatherService.setLanguage('ru');
    weatherService.weatherData.set(mockWeatherResponse);
    await fixture.whenStable();
  });

  it('should create and render all 4 comfort bento cards', () => {
    expect(component).toBeTruthy();
    expect(element.textContent).toContain('Индексы комфорта и безопасность');
    expect(element.textContent).toContain('УФ-индекс');
    expect(element.textContent).toContain('Ветер и порывы');
    expect(element.textContent).toContain('Осадки и грозы');
    expect(element.textContent).toContain('Воздух и точка росы');
  });

  it('should compute correct UV index information', () => {
    const uv = component.uvInfo();
    expect(uv.value).toBe(5);
    expect(uv.label).toBe('Умеренный');
    expect(uv.advice).toContain('SPF 15+');
    expect(uv.percent).toBe(45);
  });

  it('should compute zero percent for UV index 0 without offset', () => {
    const zeroUvResponse = JSON.parse(JSON.stringify(mockWeatherResponse)) as WttrResponse;
    zeroUvResponse.current_condition[0].uvIndex = '0';
    weatherService.weatherData.set(zeroUvResponse);

    const uv = component.uvInfo();
    expect(uv.value).toBe(0);
    expect(uv.label).toBe('Низкий');
    expect(uv.percent).toBe(0);
  });

  it('should compute wind gusts and warning', () => {
    const wind = component.windInfo();
    expect(wind.speed).toBe('5 м/с');
    expect(wind.gustSpeed).toBe('9.7 м/с');
    expect(wind.hasGustWarning).toBe(true);
    expect(wind.degree).toBe(240);
    expect(wind.dir16).toBe('WSW');

    // When switched to kmh
    weatherService.setWindUnit('kmh');
    const windKmh = component.windInfo();
    expect(windKmh.speed).toBe('18 км/ч');
    expect(windKmh.gustSpeed).toBe('35 км/ч');
  });

  it('should compute precipitation chances and amounts', () => {
    const precip = component.precipInfo();
    expect(precip.rainChance).toBe(25);
    expect(precip.thunderChance).toBe(5);
    expect(precip.snowChance).toBe(0);
    expect(precip.amountMM).toBe('0.2');
  });

  it('should compute air comfort and dew point', () => {
    const air = component.airInfo();
    expect(air.dewPoint).toBe('+11°C');
    expect(air.dewPointC).toBe(11);
    expect(air.humidity).toBe(65);
    expect(air.comfortLabel).toBe('Идеально комфортно');
  });

  it('should adapt to English language', async () => {
    weatherService.setLanguage('en');
    await fixture.whenStable();

    expect(element.textContent).toContain('Comfort & Safety Indices');
    expect(element.textContent).toContain('UV Index');
    expect(element.textContent).toContain('Wind & Gusts');
  });
});
