import { DOCUMENT } from '@angular/common';
import { inject, Injectable, signal } from '@angular/core';

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

@Injectable({
  providedIn: 'root',
})
export class PwaInstallService {
  private readonly document = inject(DOCUMENT);
  private readonly window = this.document.defaultView;

  private deferredPrompt: BeforeInstallPromptEvent | null = null;

  readonly canInstall = signal<boolean>(false);
  readonly isInstalled = signal<boolean>(false);
  readonly isIos = signal<boolean>(false);
  readonly isIosModalOpen = signal<boolean>(false);

  constructor() {
    this.initPwaListeners();
  }

  private detectIos(): boolean {
    if (!this.window) return false;
    const nav = this.window.navigator;
    const userAgent = nav.userAgent || '';
    // iPhone, iPad, iPod, or iPad on iOS 13+ reporting Macintosh with touch points
    const isIos =
      /iPad|iPhone|iPod/.test(userAgent) ||
      (userAgent.includes('Macintosh') &&
        typeof nav.maxTouchPoints === 'number' &&
        nav.maxTouchPoints > 1);
    return isIos;
  }

  private initPwaListeners(): void {
    if (!this.window) return;

    // Check if the application is already running in standalone mode (desktop or mobile PWA)
    const isStandalone =
      (typeof this.window.matchMedia === 'function' &&
        this.window.matchMedia('(display-mode: standalone)').matches) ||
      (this.window.navigator as unknown as { standalone?: boolean })?.standalone === true;

    if (isStandalone) {
      this.isInstalled.set(true);
      this.canInstall.set(false);
      return;
    }

    // Detect iOS devices (Safari doesn't support beforeinstallprompt)
    if (this.detectIos()) {
      this.isIos.set(true);
      this.canInstall.set(true);
    }

    // Check if beforeinstallprompt was already captured prior to Angular bootstrapping
    const win = this.window as unknown as { __pwaInstallPrompt?: BeforeInstallPromptEvent };
    if (win?.__pwaInstallPrompt) {
      this.deferredPrompt = win.__pwaInstallPrompt;
      this.canInstall.set(true);
    }

    this.window.addEventListener('pwa-prompt-ready', () => {
      if (win?.__pwaInstallPrompt) {
        this.deferredPrompt = win.__pwaInstallPrompt;
        this.canInstall.set(true);
      }
    });

    // Intercept native browser beforeinstallprompt
    this.window.addEventListener('beforeinstallprompt', (event: Event) => {
      // Prevent the mini-infobar / ambient banner from popping up arbitrarily
      event.preventDefault();
      this.deferredPrompt = event as BeforeInstallPromptEvent;
      this.canInstall.set(true);
    });

    // Listen for successful installation
    this.window.addEventListener('appinstalled', () => {
      this.deferredPrompt = null;
      this.canInstall.set(false);
      this.isInstalled.set(true);
      this.isIosModalOpen.set(false);
    });
  }

  openIosModal(): void {
    this.isIosModalOpen.set(true);
  }

  closeIosModal(): void {
    this.isIosModalOpen.set(false);
  }

  async install(): Promise<boolean> {
    if (this.deferredPrompt) {
      try {
        await this.deferredPrompt.prompt();
        const choice = await this.deferredPrompt.userChoice;

        if (choice.outcome === 'accepted') {
          this.canInstall.set(false);
          this.deferredPrompt = null;
          this.isInstalled.set(true);
          return true;
        }
        return false;
      } catch (err) {
        console.warn('[PWA] Error launching install prompt:', err);
        return false;
      }
    }

    if (this.isIos()) {
      this.isIosModalOpen.set(true);
      return true;
    }

    return false;
  }
}
