import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { I18nService } from '../../../core/i18n';
import { IosInstallModalComponent } from './ios-install-modal';

describe('IosInstallModalComponent', () => {
  let fixture: ComponentFixture<IosInstallModalComponent>;
  let component: IosInstallModalComponent;
  let element: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IosInstallModalComponent],
      providers: [I18nService],
    }).compileComponents();

    fixture = TestBed.createComponent(IosInstallModalComponent);
    component = fixture.componentInstance;
    element = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  it('should create and render iOS install instructions steps', () => {
    expect(component).toBeTruthy();
    expect(element.textContent).toContain('1');
    expect(element.textContent).toContain('2');
    expect(element.textContent).toContain('3');
  });

  it('should emit close when close button is clicked', () => {
    let closed = false;
    component.close.subscribe(() => {
      closed = true;
    });

    const closeBtn = element.querySelector('button') as HTMLButtonElement;
    closeBtn.click();
    expect(closed).toBe(true);
  });
});
