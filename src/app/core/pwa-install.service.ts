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

  constructor() {
    this.initPwaListeners();
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
    });
  }

  async install(): Promise<boolean> {
    if (!this.deferredPrompt) {
      return false;
    }

    try {
      await this.deferredPrompt.prompt();
      const choice = await this.deferredPrompt.userChoice;

      if (choice.outcome === 'accepted') {
        this.canInstall.set(false);
        this.deferredPrompt = null;
        return true;
      }
      return false;
    } catch (err) {
      console.warn('[PWA] Error launching install prompt:', err);
      return false;
    }
  }
}
