// Reads + mutates shopping items via dashboard-api at /dashboard-api/api/shopping
// (jimbo_pg-backed via Drizzle). The same table is also exposed to the Hermes
// agent through jimbo-api on port 3100; both APIs are thin wrappers over the
// shoppingItems Drizzle schema.

import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { ToastService } from '@shared/components/toast/toast.service';

export type ShoppingStatus = 'active' | 'bought';

export interface ShoppingItem {
  id: number;
  name: string;
  qty: number;
  unit: string | null;
  note: string | null;
  url: string | null;
  store: string | null;
  status: ShoppingStatus;
  added_at: string;
  checked_at: string | null;
}

export interface CreateShoppingItemPayload {
  name: string;
  qty?: number;
  unit?: string | null;
  note?: string | null;
  url?: string | null;
  store?: string | null;
}

@Injectable({ providedIn: 'root' })
export class ShoppingService {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);
  private readonly url = `${environment.dashboardApiUrl}/api/shopping`;

  private readonly _items = signal<ShoppingItem[]>([]);
  private readonly _loading = signal(true);

  readonly items = this._items.asReadonly();
  readonly active = computed(() => this._items().filter(i => i.status === 'active'));
  readonly bought = computed(() => this._items().filter(i => i.status === 'bought'));
  readonly isLoading = this._loading.asReadonly();

  constructor() { this.load(); }

  load(filter: 'active' | 'bought' | 'all' = 'all'): void {
    this._loading.set(true);
    this.http.get<{ items: ShoppingItem[] }>(`${this.url}?status=${filter}`).subscribe({
      next: ({ items }) => { this._items.set(items); this._loading.set(false); },
      error: ()         => { this._loading.set(false); this.toast.error('Failed to load shopping list'); },
    });
  }

  add(payload: CreateShoppingItemPayload): void {
    this.http.post<ShoppingItem>(this.url, payload).subscribe({
      next: (created) => this._items.update(xs => [created, ...xs]),
      error: () => this.toast.error(`Failed to add "${payload.name}"`),
    });
  }

  markBought(id: number): void {
    this.patch(id, { status: 'bought' });
  }

  markActive(id: number): void {
    this.patch(id, { status: 'active' });
  }

  remove(id: number): void {
    const item = this._items().find(i => i.id === id);
    this.http.delete(`${this.url}/${id}`).subscribe({
      next: () => this._items.update(xs => xs.filter(i => i.id !== id)),
      error: () => this.toast.error(`Failed to delete "${item?.name ?? id}"`),
    });
  }

  private patch(id: number, body: Partial<ShoppingItem>): void {
    const item = this._items().find(i => i.id === id);
    this.http.patch<ShoppingItem>(`${this.url}/${id}`, body).subscribe({
      next: (updated) => this._items.update(xs => xs.map(i => i.id === id ? updated : i)),
      error: () => this.toast.error(`Failed to update "${item?.name ?? id}"`),
    });
  }
}
