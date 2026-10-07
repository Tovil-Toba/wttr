import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { WeatherService } from '../../../features/weather/weather.service';
import { InstructionsModalComponent } from './instructions-modal';

describe('InstructionsModalComponent', () => {
  let fixture: ComponentFixture<InstructionsModalComponent>;
  let component: InstructionsModalComponent;
  let element: HTMLElement;
  let weatherService: WeatherService;

  beforeEach(async () => {
    localStorage.clear();
    TestBed.resetTestingModule();

    await TestBed.configureTestingModule({
      imports: [InstructionsModalComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        WeatherService,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(InstructionsModalComponent);
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

  it('should create and display Справка modal header', () => {
    expect(component).toBeTruthy();
    expect(element.textContent).toContain('Справка');
    expect(component.activeSection()).toBe('search');
  });

  it('should switch tabs when clicking section navigation buttons', async () => {
    expect(component.activeSection()).toBe('search');

    component.setSection('settings');
    await fixture.whenStable();
    expect(component.activeSection()).toBe('settings');

    component.setSection('curl');
    await fixture.whenStable();
    expect(component.activeSection()).toBe('curl');
  });

  it('should emit close on close button click', async () => {
    let closeEmitted = false;
    component.close.subscribe(() => {
      closeEmitted = true;
    });

    const closeButton = element.querySelector('button[title*="Закрыть"]') as HTMLButtonElement;
    expect(closeButton).toBeTruthy();
    closeButton.click();

    expect(closeEmitted).toBe(true);
  });

  it('should emit close on Escape keypress', () => {
    let closeEmitted = false;
    component.close.subscribe(() => {
      closeEmitted = true;
    });

    component.onEscape();
    expect(closeEmitted).toBe(true);
  });

  it('should copy text to clipboard and set copiedCommand state', () => {
    const writeTextSpy = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextSpy,
      },
    });

    component.copyText('curl wttr.in/Moscow');
    expect(writeTextSpy).toHaveBeenCalledWith('curl wttr.in/Moscow');
    expect(component.copiedCommand()).toBe('curl wttr.in/Moscow');
  });

  it('should reactively update all tab labels and content on language change', async () => {
    weatherService.setLanguage('ru');
    await fixture.whenStable();
    expect(element.textContent).toContain('1. Поиск и локации');
    expect(element.textContent).toContain('Форматы поисковых запросов');

    weatherService.setLanguage('en');
    await fixture.whenStable();
    expect(element.textContent).toContain('1. Search & Locations');
    expect(element.textContent).toContain('Search Query Formats');

    component.setSection('settings');
    await fixture.whenStable();
    expect(element.textContent).toContain('Customization & Measurement Units');
    expect(element.textContent).toContain('Language Selection');

    weatherService.setLanguage('ru');
    await fixture.whenStable();
    expect(element.textContent).toContain('Персонализация и единицы измерения');
    expect(element.textContent).toContain('Выбор языка');

    component.setSection('curl');
    await fixture.whenStable();
    expect(element.textContent).toContain('Шпаргалка консольных команд (curl)');
  });
});
