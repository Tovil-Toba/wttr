import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { WeatherConditionType, WeatherIconComponent, WeatherIconSize } from './weather-icon';

describe('WeatherIconComponent', () => {
  let fixture: ComponentFixture<WeatherIconComponent>;
  let component: WeatherIconComponent;
  let element: HTMLElement;

  beforeEach(async () => {
    TestBed.resetTestingModule();

    await TestBed.configureTestingModule({
      imports: [WeatherIconComponent],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(WeatherIconComponent);
    component = fixture.componentInstance;
    element = fixture.nativeElement as HTMLElement;
  });

  const conditions: WeatherConditionType[] = [
    'sunny',
    'clear-night',
    'partly-cloudy-day',
    'partly-cloudy-night',
    'cloudy',
    'overcast',
    'drizzle',
    'rain',
    'heavy-rain',
    'snow',
    'blizzard',
    'sleet',
    'thunder',
    'wind',
    'fog',
  ];

  conditions.forEach((cond) => {
    it(`should render SVG for condition: ${cond}`, async () => {
      fixture.componentRef.setInput('condition', cond);
      await fixture.whenStable();

      const svg = element.querySelector('svg');
      expect(svg).toBeTruthy();
    });
  });

  it('should apply size classes correctly', async () => {
    fixture.componentRef.setInput('condition', 'sunny');

    const sizeChecks: Array<{ size: WeatherIconSize; expectedClass: string }> = [
      { size: 'sm', expectedClass: 'w-5' },
      { size: 'md', expectedClass: 'w-8' },
      { size: 'lg', expectedClass: 'w-12' },
      { size: 'xl', expectedClass: 'w-20' },
    ];

    for (const { size, expectedClass } of sizeChecks) {
      fixture.componentRef.setInput('size', size);
      await fixture.whenStable();
      const container = element.querySelector('div');
      expect(container?.className).toContain(expectedClass);
    }
  });

  it('should disable animation classes when animated is false', async () => {
    fixture.componentRef.setInput('condition', 'sunny');
    fixture.componentRef.setInput('animated', false);
    await fixture.whenStable();

    const animRays = element.querySelector('.anim-sun-rays');
    expect(animRays).toBeNull();
  });
});
