import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ThemeService } from '../../core/theme.service';
import { WeatherService } from '../../features/weather/weather.service';
import { NavbarComponent } from './navbar';

describe('NavbarComponent', () => {
  let fixture: ComponentFixture<NavbarComponent>;
  let component: NavbarComponent;
  let element: HTMLElement;
  let weatherService: WeatherService;
  let themeService: ThemeService;

  beforeEach(async () => {
    localStorage.clear();
    TestBed.resetTestingModule();

    await TestBed.configureTestingModule({
      imports: [NavbarComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        WeatherService,
        ThemeService,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NavbarComponent);
    component = fixture.componentInstance;
    element = fixture.nativeElement as HTMLElement;
    weatherService = TestBed.inject(WeatherService);
    weatherService.setLanguage('ru');
    themeService = TestBed.inject(ThemeService);
    await fixture.whenStable();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should create navbar and render search input and quick presets', () => {
    expect(component).toBeTruthy();
    const input = element.querySelector('input[type="text"]') as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input.getAttribute('autocomplete')).toBe('off');
    expect(element.textContent).toContain('Обнинск');
    expect(element.textContent).toContain('Москва');
    expect(element.textContent).toContain('Шереметьево (SVO)');

    const logoContainer = element.querySelector('img[alt="wttr.hub"]')?.closest('div.order-1');
    expect(logoContainer).toBeTruthy();
    expect(logoContainer?.classList.contains('cursor-pointer')).toBe(false);
  });

  it('should submit search form, trigger fetchWeather with trimmed query and clear input', () => {
    const fetchSpy = vi.spyOn(weatherService, 'fetchWeather');
    component.searchQuery.set('  Владивосток  ');

    component.onSearch();

    expect(fetchSpy).toHaveBeenCalledWith('Владивосток');
    expect(component.searchQuery()).toBe('');
  });

  it('should not search if query is empty or whitespace', () => {
    const fetchSpy = vi.spyOn(weatherService, 'fetchWeather');
    component.searchQuery.set('   ');

    component.onSearch();

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('should call fetchWeather and keep search input clean when clicking quick preset chip', () => {
    const fetchSpy = vi.spyOn(weatherService, 'fetchWeather');
    component.selectPreset('Tokyo');

    expect(fetchSpy).toHaveBeenCalledWith('Tokyo');
    expect(component.searchQuery()).toBe('');
  });

  it('should trigger locateMe when clicking geolocation button', () => {
    const locateSpy = vi.spyOn(weatherService, 'fetchByCurrentLocation');
    component.locateMe();

    expect(locateSpy).toHaveBeenCalled();
  });

  it('should toggle theme when clicking theme toggle button', () => {
    const themeSpy = vi.spyOn(themeService, 'toggleTheme');
    component.toggleTheme();

    expect(themeSpy).toHaveBeenCalled();
  });

  it('should toggle settings dropdown and allow changing units', () => {
    expect(component.isSettingsOpen()).toBe(false);

    component.toggleSettings();
    expect(component.isSettingsOpen()).toBe(true);

    const tempSpy = vi.spyOn(weatherService, 'setTempUnit');
    component.setTempUnit('F');
    expect(tempSpy).toHaveBeenCalledWith('F');

    const windSpy = vi.spyOn(weatherService, 'setWindUnit');
    component.setWindUnit('mph');
    expect(windSpy).toHaveBeenCalledWith('mph');

    const pressureSpy = vi.spyOn(weatherService, 'setPressureUnit');
    component.setPressureUnit('hPa');
    expect(pressureSpy).toHaveBeenCalledWith('hPa');
  });

  it('should render equilateral rounded-xl buttons for settings and theme', () => {
    const actionButtons = element.querySelectorAll('.shrink-0 button');
    expect(actionButtons.length).toBeGreaterThanOrEqual(2);

    for (let i = 0; i < 2; i++) {
      const btn = actionButtons[i] as HTMLButtonElement;
      expect(btn.className).toContain('w-10');
      expect(btn.className).toContain('h-10');
      expect(btn.className).toContain('rounded-xl');
    }
  });

  it('should switch logo between light and dark variants based on active theme', async () => {
    themeService.setTheme('dark');
    await fixture.whenStable();
    const img = element.querySelector('img[alt="wttr.hub"]') as HTMLImageElement;
    expect(img.getAttribute('src')).toBe('logo-dark.jpg');

    themeService.setTheme('light');
    await fixture.whenStable();
    expect(img.getAttribute('src')).toBe('logo-light.jpg');
  });

  it('should toggle language dropdown menu and select language', () => {
    expect(component.isLangMenuOpen()).toBe(false);

    component.toggleLangMenu();
    expect(component.isLangMenuOpen()).toBe(true);

    const langSpy = vi.spyOn(weatherService, 'setLanguage');
    component.selectLanguage('de');

    expect(langSpy).toHaveBeenCalledWith('de');
    expect(component.isLangMenuOpen()).toBe(false);
  });

  it('should dynamically update navbar labels when language changes', async () => {
    weatherService.setLanguage('ru');
    await fixture.whenStable();
    expect(element.textContent).toContain('Найти');
    expect(element.textContent).toContain('Быстро:');
    expect(element.textContent).toContain('RU');
    expect(component.i18n.dict().navbar.langTooltip).toBe('Выбор языка');
    expect(component.i18n.dict().navbar.langTooltip).not.toContain('wttr.in');
    expect(component.i18n.dict().navbar.langHeader).toBe('Язык');

    component.isLangMenuOpen.set(true);
    await fixture.whenStable();
    expect(element.textContent).toContain('Язык');
    expect(element.textContent).not.toContain('Язык wttr.in');

    weatherService.setLanguage('en');
    await fixture.whenStable();
    expect(element.textContent).toContain('Search');
    expect(element.textContent).toContain('Quick:');
    expect(element.textContent).toContain('EN');
    expect(component.i18n.dict().navbar.langTooltip).toBe('Choose language');
    expect(component.i18n.dict().navbar.langTooltip).not.toContain('wttr.in');
    expect(element.textContent).toContain('Language');
  });

  it('should reactively translate quick presets when language changes', async () => {
    weatherService.setLanguage('ru');
    await fixture.whenStable();
    expect(element.textContent).toContain('Москва');
    expect(element.textContent).toContain('Санкт-Петербург');
    expect(element.textContent).toContain('Лондон');
    expect(element.textContent).toContain('Токио');

    weatherService.setLanguage('en');
    await fixture.whenStable();
    expect(element.textContent).toContain('Moscow');
    expect(element.textContent).toContain('Saint Petersburg');
    expect(element.textContent).toContain('London');
    expect(element.textContent).toContain('Tokyo');

    weatherService.setLanguage('de');
    await fixture.whenStable();
    expect(element.textContent).toContain('Moskau');
    expect(element.textContent).toContain('Sankt Petersburg');
    expect(element.textContent).toContain('Tokio');
  });

  describe('Quick City Chips & Search Suggestions (Phase 3.4)', () => {
    it('should open and close suggestions dropdown', async () => {
      expect(component.isSuggestionsOpen()).toBe(false);

      component.openSuggestions();
      await fixture.whenStable();
      expect(component.isSuggestionsOpen()).toBe(true);

      const dropdown = element.querySelector('.shadow-2xl');
      expect(dropdown).toBeTruthy();
      expect(element.textContent).toContain('Популярные города');

      component.closeSuggestions();
      await fixture.whenStable();
      expect(component.isSuggestionsOpen()).toBe(false);
    });

    it('should select popular city and trigger fetchWeather', async () => {
      const fetchSpy = vi.spyOn(weatherService, 'fetchWeather');
      component.openSuggestions();
      await fixture.whenStable();

      component.selectCity('Dubai');
      expect(fetchSpy).toHaveBeenCalledWith('Dubai');
      expect(component.searchQuery()).toBe('');
      expect(component.isSuggestionsOpen()).toBe(false);
    });

    it('should clear search input when clicking clearSearch', () => {
      component.searchQuery.set('Москва');
      component.clearSearch();
      expect(component.searchQuery()).toBe('');
      expect(component.isSuggestionsOpen()).toBe(true);
    });

    it('should keep search bar empty by default and clear it on search submission', () => {
      expect(component.searchQuery()).toBe('');

      component.searchQuery.set('London');
      component.onSearch();
      expect(component.searchQuery()).toBe('');
      expect(component.isSuggestionsOpen()).toBe(false);
    });

    it('should display recent searches and allow clearing or removing items', async () => {
      weatherService.searchHistory.set(['Sochi', 'London', 'Paris']);
      component.openSuggestions();
      await fixture.whenStable();

      expect(element.textContent).toContain('Недавние поиски');
      expect(element.textContent).toContain('Сочи');

      // Remove single item
      const stopPropagation = vi.fn();
      component.removeRecentItem('Sochi', { stopPropagation } as unknown as MouseEvent);
      expect(stopPropagation).toHaveBeenCalled();
      expect(weatherService.searchHistory()).toEqual(['London', 'Paris']);

      // Clear all
      component.clearRecentHistory({ stopPropagation } as unknown as MouseEvent);
      expect(weatherService.searchHistory()).toEqual([]);
    });

    it('should filter matching cities from dictionary when typing query', async () => {
      component.openSuggestions();
      component.searchQuery.set('лон'); // 'лон' matches 'London' in Russian aliases/names
      await fixture.whenStable();

      const matches = component.matchingCities();
      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].query).toBe('London');
      expect(matches[0].displayName).toBe('Лондон');

      // Empty match state
      component.searchQuery.set('xyz123nonexistentcity');
      await fixture.whenStable();
      expect(component.matchingCities().length).toBe(0);
      expect(element.textContent).toContain('Ничего не найдено в словаре');
    });
  });
});
