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
});
