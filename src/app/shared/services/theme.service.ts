import { DOCUMENT } from '@angular/common';
import { Injectable, computed, effect, inject, signal } from '@angular/core';

type ThemeMode = 'light' | 'dark';

const STORAGE_KEY = 'dashboard.theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly doc = inject(DOCUMENT);

  private readonly _mode = signal<ThemeMode>(this.readPersisted());
  readonly mode = this._mode.asReadonly();
  readonly isLight = computed(() => this._mode() === 'light');

  constructor() {
    effect(() => this.applyTo(this.doc.documentElement, this._mode()));
  }

  toggle(): void {
    this._mode.update(m => (m === 'light' ? 'dark' : 'light'));
  }

  private applyTo(root: HTMLElement, mode: ThemeMode): void {
    if (mode === 'light') root.setAttribute('data-theme', 'light');
    else root.removeAttribute('data-theme');

    try {
      this.doc.defaultView?.localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // localStorage can throw in private modes / restricted contexts — best-effort persist.
    }
  }

  private readPersisted(): ThemeMode {
    try {
      const v = this.doc.defaultView?.localStorage.getItem(STORAGE_KEY);
      return v === 'light' ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  }
}
