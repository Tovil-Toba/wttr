import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { WeatherService } from '../weather.service';
import { WttrFeaturesComponent } from './wttr-features';

describe('WttrFeaturesComponent', () => {
  let fixture: ComponentFixture<WttrFeaturesComponent>;
  let component: WttrFeaturesComponent;
  let element: HTMLElement;
  let weatherService: WeatherService;

  beforeEach(async () => {
    localStorage.clear();
    TestBed.resetTestingModule();

    await TestBed.configureTestingModule({
      imports: [WttrFeaturesComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        WeatherService,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(WttrFeaturesComponent);
    component = fixture.componentInstance;
    element = fixture.nativeElement as HTMLElement;
    weatherService = TestBed.inject(WeatherService);
    weatherService.setLanguage('ru');
    await fixture.whenStable();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should create and default to web version tab', () => {
    expect(component).toBeTruthy();
    expect(component.activeFeatureTab()).toBe('web');
    expect(element.textContent).toContain('WEB версия');
    expect(element.textContent).toContain('Консоль (ASCII)');
    expect(element.textContent).toContain('PNG Инфографика');
    expect(element.textContent).toContain('Однострочный');
  });

  it('should switch tabs when clicking tab buttons', async () => {
    component.activeFeatureTab.set('terminal');
    await fixture.whenStable();
    expect(component.activeFeatureTab()).toBe('terminal');
    expect(element.querySelector('app-tab-terminal')).toBeTruthy();

    component.activeFeatureTab.set('png');
    await fixture.whenStable();
    expect(component.activeFeatureTab()).toBe('png');
    expect(element.querySelector('app-tab-png')).toBeTruthy();

    component.activeFeatureTab.set('oneline');
    await fixture.whenStable();
    expect(component.activeFeatureTab()).toBe('oneline');
    expect(element.querySelector('app-tab-oneline')).toBeTruthy();
  });

  it('should provide dynamic loading status description', () => {
    component.loadingSeconds.set(2);
    expect(component.loadingStatusText()).toBe('Подключение к серверу wttr.in...');

    component.loadingSeconds.set(6);
    expect(component.loadingStatusText()).toBe('Сервер формирует подробный метеоотчёт...');

    component.loadingSeconds.set(15);
    expect(component.loadingStatusText()).toBe(
      'Идёт обработка данных (высокая нагрузка на сервис)...',
    );
  });

  it('should update tab links with selected language', async () => {
    weatherService.setLanguage('de');
    await fixture.whenStable();

    // In web tab: German links, buttons, and headers
    expect(element.textContent).toContain('lang=de');
    expect(element.textContent).toContain('Aktualisieren');
    expect(element.textContent).toContain('Link kopieren');
    expect(element.textContent).toContain('In neuem Tab öffnen');
    expect(element.textContent).toContain('Interaktiver HTML-Frame');

    // In terminal tab: German curl, refresh, and copy
    component.activeFeatureTab.set('terminal');
    await fixture.whenStable();
    expect(element.textContent).toContain('lang=de');
    expect(element.textContent).toContain('Aktualisieren');
    expect(element.textContent).toContain('Kopieren');

    // In png tab: German options and download button
    component.activeFeatureTab.set('png');
    await fixture.whenStable();
    expect(element.textContent).toContain('lang=de');
    expect(element.textContent).toContain('Transparenter Hintergrund (t)');
    expect(element.textContent).toContain('PNG herunterladen');

    // In oneline tab: German format selector and copy button
    component.activeFeatureTab.set('oneline');
    await fixture.whenStable();
    expect(element.textContent).toContain('lang=de');
    expect(element.textContent).toContain('Einzeiliges Format wählen:');
    expect(element.textContent).toContain('Befehl kopieren');
  });
});
