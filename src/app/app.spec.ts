import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { App } from './app';
import { WeatherService } from './features/weather/weather.service';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render navbar and main layout', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-navbar')).toBeTruthy();
    expect(compiled.querySelector('main')).toBeTruthy();
  });

  it('should toggle About modal dialog when clicking О проекте button', async () => {
    const fixture = TestBed.createComponent(App);
    const weatherService = TestBed.inject(WeatherService);
    weatherService.setLanguage('ru');
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('app-about-modal')).toBeNull();

    const aboutBtn = Array.from(compiled.querySelectorAll('button')).find((btn) =>
      btn.textContent?.includes('О проекте'),
    );
    expect(aboutBtn).toBeTruthy();
    aboutBtn?.click();

    await fixture.whenStable();
    expect(compiled.querySelector('app-about-modal')).toBeTruthy();
  });

  it('should lock body scroll when any modal is open and unlock when closed', async () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    await fixture.whenStable();

    expect(document.body.classList.contains('overflow-hidden')).toBe(false);

    app.isAboutOpen.set(true);
    await fixture.whenStable();
    expect(document.body.classList.contains('overflow-hidden')).toBe(true);

    app.isAboutOpen.set(false);
    await fixture.whenStable();
    expect(document.body.classList.contains('overflow-hidden')).toBe(false);

    app.isInstructionsOpen.set(true);
    await fixture.whenStable();
    expect(document.body.classList.contains('overflow-hidden')).toBe(true);

    app.isInstructionsOpen.set(false);
    await fixture.whenStable();
    expect(document.body.classList.contains('overflow-hidden')).toBe(false);
  });

  describe('Keyboard Shortcuts (Phase 3.3)', () => {
    it('should toggle theme on T key', () => {
      const fixture = TestBed.createComponent(App);
      const app = fixture.componentInstance;
      const themeSpy = vi.spyOn(app.themeService, 'toggleTheme');

      const event = new KeyboardEvent('keydown', { key: 't' });
      app.handleGlobalKeydown(event);

      expect(themeSpy).toHaveBeenCalledTimes(1);
    });

    it('should toggle language menu on L key', () => {
      const fixture = TestBed.createComponent(App);
      const app = fixture.componentInstance;
      const langSpy = vi.spyOn(app.weatherService, 'toggleLangMenu');

      const event = new KeyboardEvent('keydown', { key: 'l' });
      app.handleGlobalKeydown(event);

      expect(langSpy).toHaveBeenCalledTimes(1);
    });

    it('should toggle favorite on F key', () => {
      const fixture = TestBed.createComponent(App);
      const app = fixture.componentInstance;
      const favSpy = vi.spyOn(app.weatherService, 'toggleFavorite');

      const event = new KeyboardEvent('keydown', { key: 'f' });
      app.handleGlobalKeydown(event);

      expect(favSpy).toHaveBeenCalledTimes(1);
    });

    it('should refresh current weather on R key', () => {
      const fixture = TestBed.createComponent(App);
      const app = fixture.componentInstance;
      const refreshSpy = vi.spyOn(app.weatherService, 'refreshCurrentWeather');

      const event = new KeyboardEvent('keydown', { key: 'r' });
      app.handleGlobalKeydown(event);

      expect(refreshSpy).toHaveBeenCalledTimes(1);
    });

    it('should toggle compare modal on C key', () => {
      const fixture = TestBed.createComponent(App);
      const app = fixture.componentInstance;
      const compareSpy = vi.spyOn(app.weatherService, 'toggleCompare');

      const event = new KeyboardEvent('keydown', { key: 'c' });
      app.handleGlobalKeydown(event);

      expect(compareSpy).toHaveBeenCalledTimes(1);
    });

    it('should open instructions shortcuts tab on ? or H key', () => {
      const fixture = TestBed.createComponent(App);
      const app = fixture.componentInstance;

      const eventQuestion = new KeyboardEvent('keydown', { key: '?' });
      app.handleGlobalKeydown(eventQuestion);

      expect(app.isInstructionsOpen()).toBe(true);
      expect(app.initialInstructionsSection()).toBe('shortcuts');

      app.closeInstructions();
      expect(app.isInstructionsOpen()).toBe(false);

      const eventH = new KeyboardEvent('keydown', { key: 'h' });
      app.handleGlobalKeydown(eventH);

      expect(app.isInstructionsOpen()).toBe(true);
      expect(app.initialInstructionsSection()).toBe('shortcuts');
    });

    it('should focus search input on / key', async () => {
      const fixture = TestBed.createComponent(App);
      const app = fixture.componentInstance;
      await fixture.whenStable();

      const input = document.getElementById('main-city-search') as HTMLInputElement | null;
      expect(input).toBeTruthy();
      const focusSpy = vi.spyOn(input!, 'focus');

      const event = new KeyboardEvent('keydown', { key: '/' });
      app.handleGlobalKeydown(event);

      expect(focusSpy).toHaveBeenCalled();
    });

    it('should close modals and menus on Escape key', () => {
      const fixture = TestBed.createComponent(App);
      const app = fixture.componentInstance;

      // 1. Instructions modal open
      app.isInstructionsOpen.set(true);
      app.handleGlobalKeydown(new KeyboardEvent('keydown', { key: 'Escape' }));
      expect(app.isInstructionsOpen()).toBe(false);

      // 2. About modal open
      app.isAboutOpen.set(true);
      app.handleGlobalKeydown(new KeyboardEvent('keydown', { key: 'Escape' }));
      expect(app.isAboutOpen()).toBe(false);

      // 3. Language menu open
      app.weatherService.isLangMenuOpen.set(true);
      app.handleGlobalKeydown(new KeyboardEvent('keydown', { key: 'Escape' }));
      expect(app.weatherService.isLangMenuOpen()).toBe(false);

      // 4. Compare modal open
      app.weatherService.isCompareOpen.set(true);
      app.handleGlobalKeydown(new KeyboardEvent('keydown', { key: 'Escape' }));
      expect(app.weatherService.isCompareOpen()).toBe(false);
    });

    it('should ignore shortcuts when modifier keys are pressed', () => {
      const fixture = TestBed.createComponent(App);
      const app = fixture.componentInstance;
      const refreshSpy = vi.spyOn(app.weatherService, 'refreshCurrentWeather');
      const themeSpy = vi.spyOn(app.themeService, 'toggleTheme');

      app.handleGlobalKeydown(new KeyboardEvent('keydown', { key: 'r', ctrlKey: true }));
      app.handleGlobalKeydown(new KeyboardEvent('keydown', { key: 't', metaKey: true }));
      app.handleGlobalKeydown(new KeyboardEvent('keydown', { key: 'f', altKey: true }));

      expect(refreshSpy).not.toHaveBeenCalled();
      expect(themeSpy).not.toHaveBeenCalled();
    });

    it('should display offline connectivity banner when offline', async () => {
      const fixture = TestBed.createComponent(App);
      const weatherService = TestBed.inject(WeatherService);
      weatherService.isOffline.set(true);
      fixture.detectChanges();
      await fixture.whenStable();

      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.textContent).toContain('Нет подключения к интернету');
    });
  });
});
