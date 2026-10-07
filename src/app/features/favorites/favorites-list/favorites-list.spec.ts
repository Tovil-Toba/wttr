import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { WeatherService } from '../../weather/weather.service';
import { FavoritesListComponent } from './favorites-list';

describe('FavoritesListComponent', () => {
  let fixture: ComponentFixture<FavoritesListComponent>;
  let component: FavoritesListComponent;
  let element: HTMLElement;
  let weatherService: WeatherService;

  beforeEach(async () => {
    TestBed.resetTestingModule();

    await TestBed.configureTestingModule({
      imports: [FavoritesListComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        WeatherService,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FavoritesListComponent);
    component = fixture.componentInstance;
    element = fixture.nativeElement as HTMLElement;
    weatherService = TestBed.inject(WeatherService);
    weatherService.setLanguage('ru');
    await fixture.whenStable();
  });

  it('should create and render favorites header', () => {
    expect(component).toBeTruthy();
    expect(element.textContent).toContain('Избранные локации');
    expect(element.textContent).toContain('Недавние запросы');
  });

  it('should show empty message when favorites list is empty', async () => {
    weatherService.favorites.set([]);
    await fixture.whenStable();

    expect(element.textContent).toContain(
      'Нажмите на звёздочку рядом с городом, чтобы сохранить его в избранное.',
    );
  });

  it('should render favorite items when present', async () => {
    weatherService.favorites.set([
      { name: 'Казань', query: 'Kazan', country: 'Россия', addedAt: Date.now() },
    ]);
    await fixture.whenStable();

    expect(element.textContent).toContain('Казань');
    expect(element.textContent).toContain('Россия');
  });

  it('should call fetchWeather when selecting a location', async () => {
    const fetchSpy = vi.spyOn(weatherService, 'fetchWeather');
    weatherService.favorites.set([
      { name: 'Сочи', query: 'Sochi', country: 'Россия', addedAt: Date.now() },
    ]);
    await fixture.whenStable();

    component.selectLocation('Sochi');
    expect(fetchSpy).toHaveBeenCalledWith('Sochi');
  });

  it('should remove favorite and stop event propagation when clicking remove', async () => {
    const removeSpy = vi.spyOn(weatherService, 'removeFavorite');
    const mockEvent = {
      stopPropagation: vi.fn(),
    } as unknown as Event;

    component.removeFavorite(mockEvent, 'Sochi');

    expect(mockEvent.stopPropagation).toHaveBeenCalled();
    expect(removeSpy).toHaveBeenCalledWith('Sochi');
  });

  it('should render search history items and allow clicking them', async () => {
    weatherService.searchHistory.set(['Москва', 'Владивосток']);
    const fetchSpy = vi.spyOn(weatherService, 'fetchWeather');
    await fixture.whenStable();

    expect(element.textContent).toContain('Москва');
    expect(element.textContent).toContain('Владивосток');

    const historyButtons = element.querySelectorAll('div.flex-wrap button');
    expect(historyButtons.length).toBeGreaterThanOrEqual(2);

    (historyButtons[0] as HTMLButtonElement).click();
    expect(fetchSpy).toHaveBeenCalledWith('Москва');
  });

  it('should reactively localize favorite locations and countries on language switch', async () => {
    weatherService.setLanguage('ru');
    weatherService.favorites.set([
      { name: 'Москва', query: 'Moscow', country: 'Россия', addedAt: Date.now() },
      { name: 'Лондон', query: 'London', country: 'United Kingdom', addedAt: Date.now() },
    ]);
    await fixture.whenStable();

    expect(element.textContent).toContain('Москва');
    expect(element.textContent).toContain('Россия');
    expect(element.textContent).toContain('Лондон');
    expect(element.textContent).toContain('Великобритания');

    weatherService.setLanguage('en');
    await fixture.whenStable();

    expect(element.textContent).toContain('Moscow');
    expect(element.textContent).toContain('Russia');
    expect(element.textContent).toContain('London');
    expect(element.textContent).toContain('United Kingdom');

    weatherService.setLanguage('de');
    await fixture.whenStable();

    expect(element.textContent).toContain('Moskau');
    expect(element.textContent).toContain('Russland');
    expect(element.textContent).toContain('London');
    expect(element.textContent).toContain('Vereinigtes Königreich');
  });
});
