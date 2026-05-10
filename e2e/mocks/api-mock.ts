import type { Page, Route } from '@playwright/test';
import { SEED_MODELS, SEED_STACKS, SEED_SKILLS } from './seed-data';

type Row = Record<string, unknown> & { id: string; display_name: string; updated_at: string };

// Stateful in-memory stub for the jimbo-api endpoints the dashboard talks to.
// One instance per test — fresh data every run (constructor clones SEED_*).
//
// Endpoints handled:
//   GET    /api/hub-models                          → Row[]
//   POST   /api/hub-models                          → Row (201)
//   GET    /api/hub-models/{id}                     → Row | 404
//   PATCH  /api/hub-models/{id}                     → Row | 404
//   DELETE /api/hub-models/{id}                     → 204 | 404
// Same shape for /api/hub-model-stacks and /api/skills.
//
// Migration note (2026-05): this file used to mock PostgREST endpoints
// (`/data/{table}` with `?id=eq.{id}` query strings). The dashboard moved
// to jimbo-api endpoints with id-in-path single-row responses; the mock
// now mirrors that shape. Single-row responses are objects, not arrays
// (the old PostgREST shape) — services do `http.get<T>` not `http.get<T[]>`
// on single-id reads.

export class ApiMock {
  readonly models: Row[] = structuredClone(SEED_MODELS) as unknown as Row[];
  readonly stacks: Row[] = structuredClone(SEED_STACKS) as unknown as Row[];
  readonly skills: Row[] = structuredClone(SEED_SKILLS) as unknown as Row[];

  async install(page: Page): Promise<void> {
    // Order matters: more-specific prefixes are checked at runtime via
    // exact match + path-segment boundary, but Playwright route registration
    // is matched in order — register the longer prefix first to be safe.
    await page.route(
      (u) => matchesApiPrefix(u.pathname, '/api/hub-model-stacks'),
      (r) => this.handle(r, this.stacks, '/api/hub-model-stacks'),
    );
    await page.route(
      (u) => matchesApiPrefix(u.pathname, '/api/hub-models'),
      (r) => this.handle(r, this.models, '/api/hub-models'),
    );
    await page.route(
      (u) => matchesApiPrefix(u.pathname, '/api/skills'),
      (r) => this.handle(r, this.skills, '/api/skills'),
    );
  }

  private async handle(route: Route, rows: Row[], prefix: string): Promise<void> {
    const req = route.request();
    const url = new URL(req.url());
    const id = idFromPath(url.pathname, prefix);

    switch (req.method()) {
      case 'GET': {
        if (id !== null) {
          const row = rows.find((r) => r.id === id);
          if (!row) {
            await route.fulfill({ status: 404, json: { error: 'not_found' } });
          } else {
            await route.fulfill({ json: row });
          }
        } else {
          // List response — sorted by display_name to match what services see
          // from the production DB ordering.
          const sorted = [...rows].sort((a, b) => a.display_name.localeCompare(b.display_name));
          await route.fulfill({ json: sorted });
        }
        break;
      }

      case 'POST': {
        // POST to a sub-route (e.g. /api/skills/{id}/rename) is not handled by
        // the basic CRUD mock — let it fall through to the real (or no-op) layer.
        if (id !== null) {
          await route.continue();
          break;
        }
        const body = req.postDataJSON() as Row;
        const now = new Date().toISOString();
        const created: Row = { ...body, created_at: now, updated_at: now };
        rows.push(created);
        await route.fulfill({ status: 201, json: created });
        break;
      }

      case 'PATCH': {
        if (id === null) {
          await route.continue();
          break;
        }
        const patch = req.postDataJSON() as Partial<Row>;
        const now = new Date().toISOString();
        const idx = rows.findIndex((r) => r.id === id);
        if (idx === -1) {
          await route.fulfill({ status: 404, json: { error: 'not_found' } });
          break;
        }
        rows[idx] = { ...rows[idx], ...patch, updated_at: now };
        await route.fulfill({ json: rows[idx] });
        break;
      }

      case 'DELETE': {
        if (id === null) {
          await route.continue();
          break;
        }
        const idx = rows.findIndex((r) => r.id === id);
        if (idx !== -1) rows.splice(idx, 1);
        await route.fulfill({ status: 204, body: '' });
        break;
      }

      default:
        await route.continue();
    }
  }
}

/**
 * True when `pathname` is the prefix exactly OR a child of the prefix.
 * Avoids `/api/hub-models` matching `/api/hub-model-stacks` etc.
 */
function matchesApiPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(prefix + '/');
}

/**
 * Extract the id segment from `/{prefix}/{id}` paths. Returns null for the
 * bare `/{prefix}` listing path. Multi-segment paths (e.g. `.../id/rename`)
 * return the first segment, but the caller short-circuits those by checking
 * the request method and falling through.
 */
function idFromPath(pathname: string, prefix: string): string | null {
  if (pathname === prefix) return null;
  const rest = pathname.slice(prefix.length + 1);
  if (!rest) return null;
  const slash = rest.indexOf('/');
  return decodeURIComponent(slash === -1 ? rest : rest.slice(0, slash));
}
