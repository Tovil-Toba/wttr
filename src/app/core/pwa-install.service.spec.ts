import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BeforeInstallPromptEvent, PwaInstallService } from './pwa-install.service';

describe('PwaInstallService', () => {
  let service: PwaInstallService;

  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  it('should initialize and detect canInstall false by default', () => {
    service = TestBed.inject(PwaInstallService);
    expect(service.canInstall()).toBe(false);
    expect(service.isInstalled()).toBe(false);
  });

  it('should handle beforeinstallprompt event, prevent default, and enable canInstall', () => {
    service = TestBed.inject(PwaInstallService);

    const mockEvent = {
      preventDefault: vi.fn(),
      prompt: vi.fn().mockResolvedValue(undefined),
      userChoice: Promise.resolve({ outcome: 'accepted', platform: 'web' }),
    } as unknown as BeforeInstallPromptEvent;

    window.dispatchEvent(Object.assign(new Event('beforeinstallprompt'), mockEvent));

    expect(service.canInstall()).toBe(true);
  });

  it('should call prompt() on install and set canInstall false on acceptance', async () => {
    service = TestBed.inject(PwaInstallService);

    const promptSpy = vi.fn().mockResolvedValue(undefined);
    const mockEvent = {
      preventDefault: vi.fn(),
      prompt: promptSpy,
      userChoice: Promise.resolve({ outcome: 'accepted', platform: 'web' }),
    } as unknown as BeforeInstallPromptEvent;

    window.dispatchEvent(Object.assign(new Event('beforeinstallprompt'), mockEvent));

    expect(service.canInstall()).toBe(true);

    const result = await service.install();
    expect(result).toBe(true);
    expect(promptSpy).toHaveBeenCalled();
    expect(service.canInstall()).toBe(false);
  });

  it('should handle appinstalled event and disable canInstall', () => {
    service = TestBed.inject(PwaInstallService);

    window.dispatchEvent(new Event('appinstalled'));
    expect(service.canInstall()).toBe(false);
    expect(service.isInstalled()).toBe(true);
  });

  it('should pickup early prompt if already present on window', () => {
    const mockEvent = {
      preventDefault: vi.fn(),
      prompt: vi.fn(),
      userChoice: Promise.resolve({ outcome: 'accepted', platform: 'web' }),
    } as unknown as BeforeInstallPromptEvent;

    (window as unknown as { __pwaInstallPrompt?: BeforeInstallPromptEvent }).__pwaInstallPrompt =
      mockEvent;

    service = TestBed.inject(PwaInstallService);
    expect(service.canInstall()).toBe(true);

    delete (window as unknown as { __pwaInstallPrompt?: BeforeInstallPromptEvent })
      .__pwaInstallPrompt;
  });
});
