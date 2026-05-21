# Telegram interactive layer — design

**Status:** proposal, 2026-05-21. Not built. Drafted while auditing reinvent-me where Boris ran 67 dispatches with no inbound channel for Marvin to steer.

## Problem

`sendTelegram` is wired into 6 sites (P0 classification, dispatch expiry, settings change, webhook events, coach, grooming-submit). It's strictly **outbound**. Marvin cannot:

- Approve a decompose proposal before children are created
- Steer or cancel an in-flight dispatch
- Drop a new vault note from his phone without opening the dashboard
- Ask "what's Boris doing right now?"

Result during the reinvent-me run: 13 epics decomposed into 65 children, all sitting `ungroomed`. Had decompose been a *proposal* with Telegram approval, half wouldn't exist.

## Goal

Two-way Telegram channel. Outbound messages can be replied to; replies map back to the dispatch / vault item they came from. Slash commands give read-only visibility on demand.

Non-goals: full mobile UI, voice transcription, multi-user (single chat_id, single operator).

## Inbound endpoint

`POST /webhooks/telegram` on jimbo-api. Registered with Telegram via `setWebhook` once, secured by a secret token in the URL path (Telegram supports `secret_token` header but URL-path secret is simpler and equivalently secure over TLS).

Payload is Telegram's `Update` shape. We care about three fields:

```ts
{
  message: {
    message_id: number,
    chat: { id: number },
    text: string,
    reply_to_message?: { message_id: number },  // present if it's a reply
  }
}
```

Reject any message where `chat.id !== TELEGRAM_CHAT_ID` (single-operator).

## Message linkage

Outbound `sendTelegram` returns Telegram's `message_id`. New table:

```sql
CREATE TABLE telegram_threads (
  message_id    BIGINT PRIMARY KEY,           -- Telegram's message id
  kind          TEXT NOT NULL,                -- 'dispatch-proposal' | 'dispatch-start' | 'dispatch-complete' | 'p0' | 'vault-note' | ...
  ref_table     TEXT NOT NULL,                -- 'dispatch_queue' | 'vault_notes' | NULL
  ref_id        TEXT NOT NULL,                -- the row id in ref_table
  payload       JSONB,                        -- skill-specific context (e.g. proposed children for a decompose proposal)
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

When Marvin replies, we look up `reply_to_message.message_id`, find the thread, and route to the appropriate handler keyed by `kind`.

## Reply semantics

Free-text replies are parsed as one of:

| Pattern | Effect |
|---|---|
| `yes`, `y`, `approve`, `go`, `ship` | Approve the proposal (kind-specific action) |
| `no`, `n`, `scrap`, `kill` | Reject |
| `edit: <text>` | Replace `payload` with text — handler decides what to do |
| anything else | Append as a comment on the referenced row (vault note body or dispatch result_summary) |

Per-kind handlers live in `src/services/telegram-replies.ts`. For `dispatch-proposal` kind: `yes` creates children + marks parent decomposed; `no` rolls back; `edit:` re-runs decompose with the edit appended as guidance.

## Slash commands

Non-reply messages starting with `/`:

| Command | Handler |
|---|---|
| `/status` | Last `dispatch_worker` heartbeat + count of in-flight dispatches |
| `/status <project_slug>` | Project breakdown — items by grooming_status, last activity, last artifact |
| `/queue` | Top 5 approved/proposed dispatches |
| `/pause boris` / `/resume boris` | Flip a `settings.dispatch_paused` flag the runner respects |
| `/last` | Most recent completed dispatch — summary + PR url |
| `/note <text>` | Create a `vault_notes` row with `source_kind='telegram'`, `assigned_to='marvin'`, `grooming_status='ungroomed'` |

Unknown commands echo `?` with the list.

## Outbound — events worth notifying on

Trimmed list (we don't want phone-buzz fatigue):

| Event | Currently sent? | Should send? |
|---|---|---|
| P0 classified | yes | yes |
| Dispatch proposal expired | yes | yes |
| Settings changed | yes | demote to digest |
| **Decompose proposal (NEW)** | no | **yes — gate before child creation** |
| **Dispatch failed (NEW)** | no | **yes — needs operator eyes** |
| **Artifact ready / PR opened (NEW)** | no | **yes — terminal success, has a link** |
| Dispatch start | no | no — too noisy |
| Coach nudge | varies | keep as-is |

## Open questions

- **Bot framework or hand-rolled?** Telegram's HTTP API is small enough that a 50-line handler in `services/telegram.ts` is probably cleaner than pulling in `grammy` or `telegraf`. Tilt: hand-rolled.
- **Reply timeout for decompose proposals?** If Marvin doesn't reply in 6h, do we proceed, expire, or escalate? Probably *expire and require explicit re-dispatch* — silence isn't consent.
- **Migration mechanics for the new table?** Goes in `/Users/marvinbarretto/development/jimbo/postgres/migrations/` with `@db: jimbo_pg` header. Standard.

## Build order

1. `telegram_threads` table + migration. Backfill `sendTelegram` to write rows on every outbound.
2. `POST /webhooks/telegram` with auth + chat-id guard. Just log inbound for a week to verify webhook delivery.
3. Slash commands (read-only first — `/status`, `/queue`, `/last`).
4. Reply parser + `dispatch-proposal` handler. Wire to decompose-as-proposal in vault-decompose skill.
5. Write commands (`/note`, `/pause boris`).
