import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WeatherService } from '../../../features/weather/weather.service';
import { AboutModalComponent } from './about-modal';

describe('AboutModalComponent', () => {
  let fixture: ComponentFixture<AboutModalComponent>;
  let component: AboutModalComponent;
  let element: HTMLElement;
  let weatherService: WeatherService;

  beforeEach(async () => {
    localStorage.clear();
    TestBed.resetTestingModule();

    await TestBed.configureTestingModule({
      imports: [AboutModalComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        WeatherService,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AboutModalComponent);
    component = fixture.componentInstance;
    element = fixture.nativeElement as HTMLElement;
    weatherService = TestBed.inject(WeatherService);
    weatherService.setLanguage('ru');
    await fixture.whenStable();
  });

  afterEach(() => {
    localStorage.clear();
    weatherService.setLanguage('ru');
  });

  it('should create and render О проекте header', () => {
    expect(component).toBeTruthy();
    expect(element.textContent).toContain('О проекте');
    expect(element.textContent).toContain('Google Antigravity 2.0');
    expect(element.textContent).toContain('Gemini 3.8 Flash');
    expect(element.textContent).toContain('2026');
    expect(element.textContent).toContain('Илья Кондратьев');
  });

  it('should display the migrated tech stack items', () => {
    expect(element.textContent).toContain('Angular 22');
    expect(element.textContent).toContain('PrimeNG 22 & PrimeIcons');
    expect(element.textContent).toContain('Tailwind CSS 3.4');
    expect(element.textContent).toContain('Dart Sass (SCSS)');
    expect(element.textContent).toContain('Vitest');
    expect(element.textContent).toContain('wttr.in Weather API');
    expect(element.textContent).toContain('Reactive i18n (Signals)');
    expect(element.textContent).toContain('TypeScript 5.8');
  });

  it('should emit close on close button click in header', () => {
    let closed = false;
    component.close.subscribe(() => {
      closed = true;
    });

    const closeBtn = element.querySelector('button[title*="Закрыть"]') as HTMLButtonElement;
    expect(closeBtn).toBeTruthy();
    closeBtn.click();

    expect(closed).toBe(true);
  });

  it('should emit close on footer button click', () => {
    let closed = false;
    component.close.subscribe(() => {
      closed = true;
    });

    const footerBtn = element.querySelector('button.bg-sky-600') as HTMLButtonElement;
    expect(footerBtn).toBeTruthy();
    footerBtn.click();

    expect(closed).toBe(true);
  });

  it('should emit close on Escape key', () => {
    let closed = false;
    component.close.subscribe(() => {
      closed = true;
    });

    component.onEscape();
    expect(closed).toBe(true);
  });

  it('should emit close on backdrop click', () => {
    let closed = false;
    component.close.subscribe(() => {
      closed = true;
    });

    const backdrop = element.querySelector('[role="dialog"]') as HTMLElement;
    expect(backdrop).toBeTruthy();
    backdrop.click();

    expect(closed).toBe(true);
  });

  it('should reactively update text content when language changes', async () => {
    weatherService.setLanguage('ru');
    await fixture.whenStable();
    expect(element.textContent).toContain('О проекте');
    expect(element.textContent).toContain('Технологический стек проекта');
    expect(element.textContent).toContain('Автор проекта:');

    weatherService.setLanguage('en');
    await fixture.whenStable();
    expect(element.textContent).toContain('About Project');
    expect(element.textContent).toContain('Project Tech Stack');
    expect(element.textContent).toContain('Project Author:');
  });
});
