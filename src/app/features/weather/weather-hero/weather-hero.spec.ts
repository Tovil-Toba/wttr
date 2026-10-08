import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { WttrResponse } from '../weather.model';
import { WeatherService } from '../weather.service';
import { WeatherHeroComponent } from './weather-hero';

describe('WeatherHeroComponent', () => {
  let fixture: ComponentFixture<WeatherHeroComponent>;
  let component: WeatherHeroComponent;
  let element: HTMLElement;
  let weatherService: WeatherService;

  const mockData = {
    current_condition: [
      {
        temp_C: '19',
        temp_F: '66',
        FeelsLikeC: '19',
        FeelsLikeF: '66',
        humidity: '48',
        pressure: '1016',
        visibility: '10',
        windspeedKmph: '12',
        winddir16Point: 'SSE',
        weatherCode: '113',
        weatherDesc: [{ value: 'Sunny' }],
        uvIndex: '4',
        cloudcover: '0',
        precipMM: '0.0',
        observation_time: '11:00 AM',
      },
    ],
    nearest_area: [
      {
        areaName: [{ value: 'Москва' }],
        region: [{ value: 'Москва' }],
        country: [{ value: 'Россия' }],
        latitude: '55.7522',
        longitude: '37.6156',
      },
    ],
    weather: [
      {
        maxtempC: '22',
        maxtempF: '72',
        mintempC: '14',
        mintempF: '57',
      },
    ],
  } as unknown as WttrResponse;

  beforeEach(async () => {
    localStorage.clear();
    TestBed.resetTestingModule();

    await TestBed.configureTestingModule({
      imports: [WeatherHeroComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        WeatherService,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(WeatherHeroComponent);
    component = fixture.componentInstance;
    element = fixture.nativeElement as HTMLElement;
    weatherService = TestBed.inject(WeatherService);
    weatherService.setLanguage('ru');

    weatherService.weatherData.set(mockData);
    await fixture.whenStable();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should create and display location and temperature', () => {
    expect(component).toBeTruthy();
    expect(element.textContent).toContain('Москва');
    expect(element.textContent).toContain('Россия');
    expect(element.textContent).toContain('55.7522, 37.6156');
    expect(element.textContent).toContain('+19°C');
    expect(element.querySelector('app-weather-icon')).toBeTruthy();
  });

  it('should render all 7 metric cards including humidity droplet icon', () => {
    expect(element.textContent).toContain('Влажность');
    expect(element.textContent).toContain('48%');
    expect(element.querySelector('.pi-tint')).toBeTruthy();

    expect(element.textContent).toContain('Ветер');
    expect(element.textContent).toContain('SSE');

    expect(element.textContent).toContain('Давление');
    expect(element.textContent).toContain('UV-индекс');
    expect(element.textContent).toContain('Умеренный');

    expect(element.textContent).toContain('Облачность');
    expect(element.textContent).toContain('Осадки');
    expect(element.textContent).toContain('Видимость');
  });

  it('should have square rounded-2xl favorite button and toggle on click', async () => {
    const toggleSpy = vi.spyOn(weatherService, 'toggleFavorite');
    const favButton = element.querySelector('button[aria-label*="избран"]') as HTMLButtonElement;

    expect(favButton).toBeTruthy();
    expect(favButton.className).toContain('rounded-2xl');
    expect(favButton.className).toContain('aspect-square');

    favButton.click();
    expect(toggleSpy).toHaveBeenCalled();
  });

  it('should calculate correct UV risk level', async () => {
    expect(component.uvRiskLevel().label).toBe('Умеренный');

    const highUvData = {
      ...mockData,
      current_condition: [{ ...mockData.current_condition[0], uvIndex: '9' }],
    } as unknown as WttrResponse;

    weatherService.weatherData.set(highUvData);
    await fixture.whenStable();

    expect(component.uvRiskLevel().label).toBe('Очень высокий');
  });

  it('should dynamically switch metrics labels to English', async () => {
    weatherService.setLanguage('en');
    await fixture.whenStable();

    expect(element.textContent).toContain('Humidity');
    expect(element.textContent).toContain('Wind');
    expect(element.textContent).toContain('Pressure');
    expect(element.textContent).toContain('Cloud cover');
    expect(element.textContent).toContain('Precipitation');
    expect(element.textContent).toContain('Visibility');
    expect(component.uvRiskLevel().label).toBe('Moderate');
    expect(element.textContent).toContain('Moscow');
    expect(element.textContent).toContain('Russia');

    weatherService.setLanguage('de');
    await fixture.whenStable();
    expect(element.textContent).toContain('Moskau');
    expect(element.textContent).toContain('Russland');
  });

  it('should trigger openCompare when compare button is clicked', () => {
    const spy = vi.spyOn(weatherService, 'openCompare');
    const compareBtn = element.querySelector(
      'button[aria-label="Сравнить с другим городом"]',
    ) as HTMLButtonElement;
    expect(compareBtn).toBeTruthy();
    compareBtn.click();
    expect(spy).toHaveBeenCalled();
  });

  it('should format weather share text with emojis, temperature, wind and humidity', () => {
    const shareText = component.getFormattedShareText();
    expect(shareText).toContain('Москва');
    expect(shareText).toContain('+19°C');
    expect(shareText).toContain('3.3 м/с');
    expect(shareText).toContain('48%');
    expect(shareText).toContain('Прогноз погоды на wttr.hub');
  });

  it('should handle shareForecast and toggle isShareCopied', async () => {
    const shareBtn = element.querySelector('button[aria-label*="Поделиться"]') as HTMLButtonElement;
    expect(shareBtn).toBeTruthy();

    await component.shareForecast();
    expect(component.isShareCopied()).toBe(true);
  });

  it('should handle downloadPng and toggle isPngDownloading', () => {
    const pngBtn = element.querySelector('button[aria-label*="PNG"]') as HTMLButtonElement;
    expect(pngBtn).toBeTruthy();

    component.downloadPng();
    expect(component.isPngDownloading()).toBe(true);
  });

  it('should display offline badge when weatherService.isOfflineData is true', async () => {
    weatherService.isOfflineData.set(true);
    weatherService.offlineDataTimestamp.set(new Date(2026, 9, 8, 14, 30).getTime());
    fixture.detectChanges();
    await fixture.whenStable();

    const badge = element.querySelector('.pi-wifi');
    expect(badge).toBeTruthy();
    expect(element.textContent).toContain('Офлайн-режим');
    expect(element.textContent).toContain('14:30');
  });
});
