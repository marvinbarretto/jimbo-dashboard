# pomo-app

Standalone vanilla-TS timer that runs at `jimbo.fourfoldmedia.uk/pomo`.
Hits `jimbo-api` directly for `/api/focus-sessions/*` and `/api/projects`.
No header/footer/nav — just the timer. Caddy basic_auth gates it like the
rest of the host.

## Layout

- `index.html` — single page
- `src/main.ts` — all logic (state, API, render, tick)
- `src/styles.css` — dark mobile-first styling
- `vite.config.ts` — `base: '/pomo/'`, dev proxy to production jimbo-api

## Local dev

```bash
# Same basic_auth as the dashboard's scripts/dev.sh expects
JIMBO_BASIC_AUTH="user:password" npm run dev
```

Open http://localhost:5174/pomo/.

## Production deploy

Bundled into the parent `dashboard/deploy.sh` — running that ships the
Angular SPA, dashboard-api, and pomo-app in one go. Output rsyncs to
`/home/jimbo/pomo/` on the VPS.

## Caddy snippet (one-off, on the VPS)

The `/pomo` path needs to be served from the standalone dist instead of
falling through to the Angular SPA. Add the `handle_path` block **before**
the SPA root rule for `jimbo.fourfoldmedia.uk`:

```caddy
jimbo.fourfoldmedia.uk {
    basicauth {
        # existing creds
    }

    # Serve standalone pomo app
    handle_path /pomo* {
        root * /home/jimbo/pomo
        try_files {path} /index.html
        file_server
    }

    # ... existing handlers for /api, /dashboard-api, SPA root ...
}
```

`handle_path` strips the `/pomo` prefix so `try_files` resolves against the
standalone's own asset paths (Vite emits assets relative to `base: '/pomo/'`,
which Caddy hands back unstripped — verify in the browser network tab the
first time).
