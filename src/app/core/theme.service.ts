import { DOCUMENT } from '@angular/common';
import { computed, effect, inject, Injectable, signal } from '@angular/core';

export type AppTheme = 'light' | 'dark';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly window = this.document.defaultView;
  private readonly storageKey = 'wttr_theme';

  // Signal for reactive theme state
  readonly currentTheme = signal<AppTheme>(this.getInitialTheme());
  readonly isDark = computed(() => this.currentTheme() === 'dark');

  constructor() {
    // Apply theme on state change
    effect(() => {
      const theme = this.currentTheme();
      this.applyTheme(theme);
    });

    // Listen to OS preference changes
    if (this.window && typeof this.window.matchMedia === 'function') {
      const mediaQuery = this.window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', (e) => {
        // Only change automatically if user hasn't explicitly set preference
        if (this.window?.localStorage && !this.window.localStorage.getItem(this.storageKey)) {
          this.currentTheme.set(e.matches ? 'dark' : 'light');
        }
      });
    }
  }

  private getInitialTheme(): AppTheme {
    if (!this.window) return 'dark';

    try {
      const saved = this.window.localStorage?.getItem(this.storageKey) as AppTheme | null;
      if (saved === 'light' || saved === 'dark') {
        return saved;
      }
    } catch {
      // Storage access blocked or restricted
    }

    const prefersDark =
      typeof this.window.matchMedia === 'function' &&
      this.window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'light';
  }

  toggleTheme(): void {
    const nextTheme: AppTheme = this.currentTheme() === 'dark' ? 'light' : 'dark';
    this.setTheme(nextTheme);
  }

  setTheme(theme: AppTheme): void {
    this.currentTheme.set(theme);
    try {
      this.window?.localStorage?.setItem(this.storageKey, theme);
    } catch {
      // Ignore localStorage errors
    }
  }

  private applyTheme(theme: AppTheme): void {
    const root = this.document?.documentElement;
    if (!root) return;

    if (theme === 'dark') {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }

    // Update meta tag for browser UI
    const metaTag = this.document?.querySelector('meta[name="color-scheme"]');
    if (metaTag) {
      metaTag.setAttribute('content', theme);
    }

    // Update favicon to match theme
    const iconLink = this.document?.querySelector('link[rel="icon"]');
    if (iconLink) {
      iconLink.setAttribute('href', theme === 'dark' ? 'logo-dark.jpg' : 'logo-light.jpg');
    }
  }
}
