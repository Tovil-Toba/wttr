import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { LoaderComponent } from './loader';

describe('LoaderComponent', () => {
  let fixture: ComponentFixture<LoaderComponent>;
  let component: LoaderComponent;
  let element: HTMLElement;

  beforeEach(async () => {
    TestBed.resetTestingModule();

    await TestBed.configureTestingModule({
      imports: [LoaderComponent],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(LoaderComponent);
    component = fixture.componentInstance;
    element = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  it('should create with default values', () => {
    expect(component).toBeTruthy();
    expect(element.textContent).toContain('Загрузка данных...');
    expect(element.textContent).toContain('Пожалуйста, подождите...');
  });

  it('should render custom title and status', async () => {
    fixture.componentRef.setInput('title', 'Загрузка прогноза');
    fixture.componentRef.setInput('status', 'Получаем данные с метеостанции...');
    await fixture.whenStable();

    expect(element.querySelector('h4')?.textContent?.trim()).toBe('Загрузка прогноза');
    expect(element.querySelector('p')?.textContent?.trim()).toBe(
      'Получаем данные с метеостанции...',
    );
  });

  it('should display timer when seconds > 0 and showTimer is true', async () => {
    fixture.componentRef.setInput('seconds', 5);
    fixture.componentRef.setInput('showTimer', true);
    await fixture.whenStable();

    expect(element.textContent).toContain('Запрос выполняется:');
    expect(element.textContent).toContain('5');
    expect(element.textContent).toContain('сек.');
  });

  it('should hide timer when showTimer is false even if seconds > 0', async () => {
    fixture.componentRef.setInput('seconds', 5);
    fixture.componentRef.setInput('showTimer', false);
    await fixture.whenStable();

    expect(element.textContent).not.toContain('Запрос выполняется:');
  });

  it('should apply appropriate CSS classes for accents', async () => {
    fixture.componentRef.setInput('accent', 'emerald');
    await fixture.whenStable();

    expect(component.outerRingClass()).toContain('border-emerald-500');
    expect(component.statusTextClass()).toContain('text-emerald-300');

    fixture.componentRef.setInput('accent', 'sky');
    await fixture.whenStable();

    expect(component.outerRingClass()).toContain('border-sky-500');
    expect(component.statusTextClass()).toContain('text-sky-300');
  });

  it('should display retry button when seconds >= retryAfter and emit retry event on click', async () => {
    let retryEmitted = false;
    component.retry.subscribe(() => {
      retryEmitted = true;
    });

    fixture.componentRef.setInput('retryAfter', 10);
    fixture.componentRef.setInput('seconds', 9);
    await fixture.whenStable();

    // Button should not be present yet
    let retryBtn = element.querySelector('button');
    expect(retryBtn).toBeNull();

    // Now exceed timeout threshold
    fixture.componentRef.setInput('seconds', 10);
    await fixture.whenStable();

    retryBtn = element.querySelector('button');
    expect(retryBtn).toBeTruthy();
    expect(retryBtn?.textContent).toContain('Перезапустить запрос');

    retryBtn?.click();
    expect(retryEmitted).toBe(true);
  });
});
