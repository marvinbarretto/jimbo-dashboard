import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  private readonly _user = signal<string | null>(null);
  private readonly _checked = signal(false);

  readonly currentUser = this._user.asReadonly();
  readonly isAuthenticated = computed(() => this._user() !== null);
  readonly isChecked = this._checked.asReadonly();

  constructor() { this.check(); }

  check(): void {
    this.http.get<{ user: string | null }>('/auth/me', { withCredentials: true }).subscribe({
      next: ({ user }) => { this._user.set(user); this._checked.set(true); },
      error: ()         => this._checked.set(true),
    });
  }

  logout(): void {
    this.http.post('/auth/logout', {}, { withCredentials: true }).subscribe({
      next: () => { this._user.set(null); window.location.href = '/auth/login'; },
    });
  }
}
