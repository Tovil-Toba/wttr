import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { WeatherDay, WttrResponse } from '../weather.model';
import { WeatherService } from '../weather.service';
import { SunMoonTrackerComponent } from './sun-moon-tracker';

describe('SunMoonTrackerComponent', () => {
  let fixture: ComponentFixture<SunMoonTrackerComponent>;
  let component: SunMoonTrackerComponent;
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
        sunHour: '8.5',
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
        hourly: [],
      } as unknown as WeatherDay,
    ],
  };

  beforeEach(async () => {
    localStorage.clear();
    TestBed.resetTestingModule();

    await TestBed.configureTestingModule({
      imports: [SunMoonTrackerComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        WeatherService,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SunMoonTrackerComponent);
    component = fixture.componentInstance;
    element = fixture.nativeElement as HTMLElement;
    weatherService = TestBed.inject(WeatherService);
    weatherService.setLanguage('ru');
    weatherService.weatherData.set(mockWeatherResponse);
    await fixture.whenStable();
  });

  it('should create and render sun and moon tracker cards', () => {
    expect(component).toBeTruthy();
    expect(element.textContent).toContain('Астрономия: Солнце & Луна');
    expect(element.textContent).toContain('Траектория солнца');
    expect(element.textContent).toContain('Фаза и цикл луны');
  });

  it('should compute sun trajectory with valid coordinates and duration', () => {
    const sun = component.sunPath();
    expect(sun).toBeTruthy();
    expect(sun?.sunrise).toBe('06:30');
    expect(sun?.sunset).toBe('18:45');
    expect(sun?.daylightDuration).toContain('12');
    expect(sun?.sunHour).toContain('8.5');
    expect(sun?.sunX).toBeGreaterThanOrEqual(35);
    expect(sun?.sunX).toBeLessThanOrEqual(285);
    expect(sun?.sunY).toBeGreaterThanOrEqual(20);
    expect(sun?.sunY).toBeLessThanOrEqual(105);
  });

  it('should compute moon tracker with full moon phase', () => {
    const moon = component.moonTracker();
    expect(moon).toBeTruthy();
    expect(moon?.phaseName).toBe('Полнолуние');
    expect(moon?.illumination).toBe(100);
    expect(moon?.isFull).toBe(true);
    expect(moon?.moonrise).toBe('20:00');
    expect(moon?.moonset).toBe('05:00');
  });

  it('should compute valid SVG path for crescent moon phase', () => {
    const crescentResponse = JSON.parse(JSON.stringify(mockWeatherResponse)) as WttrResponse;
    crescentResponse.weather[0].astronomy[0].moon_phase = 'Waxing Crescent';
    crescentResponse.weather[0].astronomy[0].moon_illumination = '25';
    weatherService.weatherData.set(crescentResponse);

    const moon = component.moonTracker();
    expect(moon?.phaseName).toBe('Растущий серп');
    expect(moon?.illumination).toBe(25);
    expect(moon?.isFull).toBe(false);
    expect(moon?.pathD).toContain('M 50,16');
  });

  it('should adapt to English language', async () => {
    weatherService.setLanguage('en');
    await fixture.whenStable();

    expect(element.textContent).toContain('Astronomy: Sun & Moon');
    expect(element.textContent).toContain('Solar Trajectory');
    expect(element.textContent).toContain('Lunar Phase & Cycle');
  });
});
