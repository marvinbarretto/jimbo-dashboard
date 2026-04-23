import type { Page, Route } from '@playwright/test';
import { SEED_MODELS, SEED_STACKS, SEED_SKILLS } from './seed-data';

type Row = Record<string, unknown> & { id: string; display_name: string; updated_at: string };

// Stateful in-memory PostgREST stub. One instance per test — fresh data every run.
// Handles the query patterns Angular services produce:
//   GET  /table?order=display_name
//   GET  /table?id=eq.{id}
//   POST /table                          (Prefer: return=representation)
//   PATCH /table?id=eq.{id}             (Prefer: return=representation)
//   DELETE /table?id=eq.{id}
export class ApiMock {
  readonly models: Row[] = structuredClone(SEED_MODELS) as unknown as Row[];
  readonly stacks: Row[] = structuredClone(SEED_STACKS) as unknown as Row[];
  readonly skills: Row[] = structuredClone(SEED_SKILLS) as unknown as Row[];

  async install(page: Page): Promise<void> {
    await page.route(u => u.pathname === '/data/models',       r => this.handle(r, this.models));
    await page.route(u => u.pathname === '/data/model_stacks', r => this.handle(r, this.stacks));
    await page.route(u => u.pathname === '/data/skills',       r => this.handle(r, this.skills));
  }

  private async handle(route: Route, rows: Row[]): Promise<void> {
    const req   = route.request();
    const url   = new URL(req.url());
    const idRaw = url.searchParams.get('id');
    const id    = idRaw?.startsWith('eq.') ? decodeURIComponent(idRaw.slice(3)) : null;

    switch (req.method()) {
      case 'GET': {
        let result = id ? rows.filter(r => r.id === id) : [...rows];
        if (url.searchParams.get('order') === 'display_name') {
          result = result.sort((a, b) => a.display_name.localeCompare(b.display_name));
        }
        await route.fulfill({ json: result });
        break;
      }
      case 'POST': {
        const body = req.postDataJSON() as Row;
        const now  = new Date().toISOString();
        const created: Row = { ...body, created_at: now, updated_at: now };
        rows.push(created);
        await route.fulfill({ status: 201, json: [created] });
        break;
      }
      case 'PATCH': {
        const patch = req.postDataJSON() as Partial<Row>;
        const now   = new Date().toISOString();
        const idx   = rows.findIndex(r => r.id === id);
        if (idx === -1) { await route.fulfill({ json: [] }); break; }
        rows[idx] = { ...rows[idx], ...patch, updated_at: now };
        await route.fulfill({ json: [rows[idx]] });
        break;
      }
      case 'DELETE': {
        const idx = rows.findIndex(r => r.id === id);
        if (idx !== -1) rows.splice(idx, 1);
        await route.fulfill({ status: 204, body: '' });
        break;
      }
      default:
        await route.continue();
    }
  }
}
