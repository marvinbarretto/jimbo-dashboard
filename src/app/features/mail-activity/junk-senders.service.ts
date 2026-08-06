import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

/** Mirrors SenderStat in jimbo-api/routes/emails.ts. */
export interface SenderStat {
  from_email: string;
  from_name: string | null;
  total: number;
  tossed: number;
  kept: number;
  pending: number;
  /** tossed / decided. Pending rows are excluded — a new noisy sender whose
   *  backlog is still queued must not look harmless. */
  toss_rate: number;
  has_unsubscribe: boolean;
  first_seen: string;
  last_seen: string;
  blocked: boolean;
  trusted: boolean;
}

export interface EmailGateConfig {
  blocked_senders: string[];
  trusted_senders: string[];
}

@Injectable({ providedIn: 'root' })
export class JunkSendersService {
  private readonly http = inject(HttpClient);

  readonly senders = signal<SenderStat[]>([]);
  readonly config = signal<EmailGateConfig>({ blocked_senders: [], trusted_senders: [] });
  readonly loading = signal(false);
  readonly lastError = signal<string | null>(null);

  async load(minTotal = 5, sort: 'junk' | 'volume' = 'junk'): Promise<void> {
    this.loading.set(true);
    this.lastError.set(null);
    try {
      const [stats, cfg] = await Promise.all([
        firstValueFrom(this.http.get<{ items: SenderStat[] }>(
          `/api/emails/reports/senders?min_total=${minTotal}&limit=200&sort=${sort}`,
        )),
        // 404s if nobody has ever saved the gate config — that is "no lists
        // yet", not an error, so the page still renders the stats.
        firstValueFrom(this.http.get<{ value: EmailGateConfig }>(
          '/api/settings/structured/email_gate_config',
        )).catch(() => null),
      ]);
      this.senders.set(stats.items);
      if (cfg?.value) this.config.set(cfg.value);
    } catch (err: unknown) {
      this.lastError.set(err instanceof Error ? err.message : 'Failed to load senders');
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Add a sender to the blocklist. The gate matches blocked_senders as a
   * case-insensitive SUBSTRING against from_email and from_name, so we store
   * the narrowest token that still catches every variant — the full address
   * where it is stable, rather than a bare brand word that could over-match.
   *
   * Writes the whole config back: the settings API stores a single JSON value,
   * so a partial write would drop the trusted list.
   */
  async block(needle: string): Promise<void> {
    const current = this.config();
    const lower = needle.toLowerCase();
    if (current.blocked_senders.some((s) => s.toLowerCase() === lower)) return;
    const next: EmailGateConfig = {
      ...current,
      blocked_senders: [...current.blocked_senders, needle],
    };
    await firstValueFrom(this.http.put('/api/settings/email_gate_config', { value: next }));
    this.config.set(next);
  }

  async unblock(needle: string): Promise<void> {
    const current = this.config();
    const lower = needle.toLowerCase();
    const next: EmailGateConfig = {
      ...current,
      blocked_senders: current.blocked_senders.filter((s) => s.toLowerCase() !== lower),
    };
    await firstValueFrom(this.http.put('/api/settings/email_gate_config', { value: next }));
    this.config.set(next);
  }
}
