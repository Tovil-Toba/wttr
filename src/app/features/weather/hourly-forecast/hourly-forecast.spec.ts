import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WeatherDay, WttrResponse } from '../weather.model';
import { WeatherService } from '../weather.service';
import { HourlyForecastComponent } from './hourly-forecast';

describe('HourlyForecastComponent', () => {
  let fixture: ComponentFixture<HourlyForecastComponent>;
  let component: HourlyForecastComponent;
  let element: HTMLElement;
  let weatherService: WeatherService;

  const mockDay = {
    date: '2026-10-10',
    maxtempC: '20',
    maxtempF: '68',
    mintempC: '10',
    mintempF: '50',
    sunHour: '8',
    uvIndex: '4',
    astronomy: [],
    hourly: [
      {
        time: '300',
        tempC: '12',
        tempF: '54',
        FeelsLikeC: '12',
        FeelsLikeF: '54',
        weatherCode: '116',
        weatherDesc: [{ value: 'Partly cloudy' }],
        windspeedKmph: '10',
        winddir16Point: 'N',
        humidity: '60',
        visibility: '10',
        pressure: '1015',
        cloudcover: '20',
        chanceofrain: '15',
      } as any,
      {
        time: '1200',
        tempC: '19',
        tempF: '66',
        FeelsLikeC: '19',
        FeelsLikeF: '66',
        weatherCode: '113',
        weatherDesc: [{ value: 'Sunny' }],
        windspeedKmph: '15',
        winddir16Point: 'NE',
        humidity: '45',
        visibility: '10',
        pressure: '1014',
        cloudcover: '5',
        chanceofrain: '0',
      } as any,
    ],
  } as unknown as WeatherDay;

  beforeEach(async () => {
    localStorage.clear();
    TestBed.resetTestingModule();

    // Mock scroll functions on DOM element prototype for jsdom
    Element.prototype.scrollBy = vi.fn();
    Element.prototype.scrollTo = vi.fn();

    await TestBed.configureTestingModule({
      imports: [HourlyForecastComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        WeatherService,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HourlyForecastComponent);
    component = fixture.componentInstance;
    element = fixture.nativeElement as HTMLElement;
    weatherService = TestBed.inject(WeatherService);
    weatherService.setLanguage('ru');

    const mockResponse = {
      weather: [mockDay, { ...mockDay, date: '2026-10-11' }, { ...mockDay, date: '2026-10-12' }],
    } as unknown as WttrResponse;

    weatherService.weatherData.set(mockResponse);
    await fixture.whenStable();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('should create and render hourly forecast section', () => {
    expect(component).toBeTruthy();
    expect(element.textContent).toContain('Почасовой прогноз');
    expect(component.selectedDayIndex()).toBe(0);
  });

  it('should switch selected day index and update hourly list', async () => {
    expect(component.selectedDayIndex()).toBe(0);

    component.selectDay(1);
    await fixture.whenStable();

    expect(component.selectedDayIndex()).toBe(1);
    expect(component.hourlyList().length).toBe(2);
  });

  it('should format hour strings into 24h format', () => {
    expect(component.formatHourTime('300')).toBe('03:00');
    expect(component.formatHourTime('1200')).toBe('12:00');
    expect(component.formatHourTime('0')).toBe('00:00');
  });

  it('should handle scroll operations safely and call DOM scroll APIs', () => {
    expect(() => component.checkScroll()).not.toThrow();

    component.scrollLeft();
    expect(Element.prototype.scrollBy).toHaveBeenCalledWith({ left: -280, behavior: 'smooth' });

    component.scrollRight();
    expect(Element.prototype.scrollBy).toHaveBeenCalledWith({ left: 280, behavior: 'smooth' });
  });

  it('should toggle view mode between cards and chart and compute SVG chart points', async () => {
    expect(component.viewMode()).toBe('cards');
    expect(element.querySelector('[data-testid="hourly-chart-svg"]')).toBeNull();

    component.setViewMode('chart');
    await fixture.whenStable();

    expect(component.viewMode()).toBe('chart');
    expect(element.querySelector('[data-testid="hourly-chart-svg"]')).not.toBeNull();

    // Verify computed chart points
    const points = component.chartPoints();
    expect(points.length).toBe(2);
    expect(points[0].time).toBe('03:00');
    expect(points[0].tempFormatted).toBe('+12°C');
    expect(points[0].rainChance).toBe(15);
    expect(points[1].time).toBe('12:00');
    expect(points[1].tempFormatted).toBe('+19°C');
    expect(points[1].rainChance).toBe(0);

    // Verify smooth path generated
    expect(component.smoothLinePath()).toContain('M ');
    expect(component.smoothAreaPath()).toContain('L ');

    // Test hovering
    component.setHoveredPoint(1);
    expect(component.hoveredPointIndex()).toBe(1);
    expect(component.hoveredPoint()?.time).toBe('12:00');
  });
});
