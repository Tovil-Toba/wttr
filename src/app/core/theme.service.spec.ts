import { DOCUMENT } from '@angular/common';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  let service: ThemeService;
  let mockDoc: Document;

  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.classList.remove('dark');

    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), ThemeService],
    });

    service = TestBed.inject(ThemeService);
    mockDoc = TestBed.inject(DOCUMENT);
    TestBed.flushEffects();
  });

  afterEach(() => {
    window.localStorage.clear();
    document.documentElement.classList.remove('dark');
    TestBed.resetTestingModule();
  });

  it('should be created and have a default theme', () => {
    expect(service).toBeTruthy();
    expect(['light', 'dark']).toContain(service.currentTheme());
  });

  it('should toggle theme from dark to light and vice versa', () => {
    service.setTheme('dark');
    TestBed.flushEffects();
    expect(service.currentTheme()).toBe('dark');
    expect(window.localStorage.getItem('wttr_theme')).toBe('dark');

    service.toggleTheme();
    TestBed.flushEffects();
    expect(service.currentTheme()).toBe('light');
    expect(window.localStorage.getItem('wttr_theme')).toBe('light');

    service.toggleTheme();
    TestBed.flushEffects();
    expect(service.currentTheme()).toBe('dark');
  });

  it('should apply dark class to document element when dark theme is set', () => {
    service.setTheme('dark');
    TestBed.flushEffects();
    expect(mockDoc.documentElement.classList.contains('dark')).toBe(true);

    service.setTheme('light');
    TestBed.flushEffects();
    expect(mockDoc.documentElement.classList.contains('dark')).toBe(false);
  });

  it('should load saved theme from localStorage upon initialization', () => {
    TestBed.resetTestingModule();
    window.localStorage.setItem('wttr_theme', 'light');

    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), ThemeService],
    });
    const customService = TestBed.inject(ThemeService);
    TestBed.flushEffects();

    expect(customService.currentTheme()).toBe('light');
  });
});
