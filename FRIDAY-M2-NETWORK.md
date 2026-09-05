# Friday session — fix m2's network

**You will be physically at m2 (`marvins-macbook-air`, tailnet `100.121.128.3`).
That is the point of this session: every item below needs local access, and none
of it can be done remotely.**

Written 2026-09-01. Everything here is measured, not inferred — the commands
that produced each number are included so you can re-run them first.

---

## The one finding

**m2's network connection drops intermittently. It is not sleeping, and
Tailscale is not the disease.**

That single fault produces three symptoms that were previously diagnosed as
three separate problems:

| symptom | previously blamed on | actually |
|---|---|---|
| Tailscale peer flaps `offline` | m2 being asleep / down | link dropping |
| `API Error: Your computer went to sleep mid-response` on dispatches | m2 sleeping | link dropping mid-request |
| 66 × `reaper: timeout` on `dispatch/vault-decompose` | m2 running stale skills | link dropping mid-dispatch |

## The evidence against "it sleeps"

Captured from m2 itself on 2026-09-01 at 16:25 and 17:41:

```
up 45 days, 40 mins
sleep  0  (sleep prevented by powerd, powerd, dasd)
Now drawing from 'AC Power' — 80%, AC attached
tailscaled process age: 45 days
boris 98624 · jeffrey 78006 · steward 32352   (all three lanes running)
```

**45 days of uptime with sleep already prevented.** It has not slept once. Yet
7 dispatches between 27 Aug and 1 Sep failed with *"Your computer went to sleep
mid-response"* — that is the Claude CLI's wording for a long network stall, not
a real sleep event.

```sql
-- roughly one a day, on a machine that never slept
SELECT created_at::date, count(*) FROM dispatch_queue
WHERE error_message ILIKE '%went to sleep%' GROUP BY 1 ORDER BY 1 DESC;
```

## The evidence pointing at the network

```
tailscale netcheck (run on m2):
  * UDP: true
  * IPv4: yes, 94.9.125.82:2030
  * PortMapping:                 ← EMPTY: no UPnP, no NAT-PMP, no PCP
  * Nearest DERP: London, 8.7ms

tailscale status (from m4):
  m2   active; relay "lhr"; offline, last seen 15m ago
  vps  active; direct 167.99.206.214:41641      ← control: direct works elsewhere
```

Two independent signals:

1. **`PortMapping` is empty**, so Tailscale can never negotiate a direct path
   from that network and is permanently relayed. The VPS gets `direct`; m2
   never does.
2. **The node keeps losing its control-plane registration** — `active` and
   `offline` simultaneously — while the machine and daemon are both up.

Reachability windows measured at roughly **1–3 minutes, ~75 minutes apart** —
unchanged by a Tailscale restart (see step 5).

**Also worth checking:** m2's worker heartbeats stopped at 16:58 UTC on
2026-09-01 and had not resumed 30 minutes later, spanning the restart. The
workers talk to jimbo-api over HTTPS, not the tailnet, so this is a separate
read on the same underlying link. Confirm on arrival whether the three lanes are
actually running or merely unable to reach the API:

```bash
launchctl list | grep -iE "boris|jeffrey|steward"
curl -s -o /dev/null -w "%{http_code} %{time_total}s\n" https://jimbo.fourfoldmedia.uk/api/health
```

## What to check, in order

Everything here needs to be at the keyboard. There is **no passwordless sudo**
on m2, which is why none of it could be done from here.

1. **Wi-Fi or ethernet?** If Wi-Fi, this is the most likely cause. Plug into
   ethernet and re-run `tailscale netcheck` — if `PortMapping` populates and
   the peer goes `direct`, that is the answer.
2. **Interface power management.** System Settings → Network → the interface →
   check for power-saving / "Wake for network access" behaviour on the adapter.
3. **The router in front of it.** `PortMapping:` empty means UPnP/NAT-PMP are
   disabled or unsupported. Enabling either would let Tailscale go direct.
4. **DHCP lease / IP churn.** `ipconfig getpacket en0` — a short or contested
   lease would produce exactly this drop pattern.
5. **Do not bother bouncing Tailscale — it was tried on 2026-09-01 and did not
   work.** Recorded here so the session does not repeat it. The restart itself
   succeeded cleanly:

   ```
   [Tue 1 Sep 2026 18:11:19 BST] --- restart requested ---
   [Tue 1 Sep 2026 18:11:25 BST] up OK on attempt 1
   ```

   The node re-registered and the `offline` suffix cleared — `active; relay
   "lhr"` with 0% packet loss at 79ms, where minutes earlier it had been
   `offline, last seen 15m ago` at 100% loss. **Then it dropped again within
   about two minutes.** Recovery took ~15 minutes, so allow for that if you do
   restart it for another reason.

   This is the clearest evidence that the fault is below Tailscale: bouncing the
   daemon demonstrably re-registers the node, and the link still fails.

## What this is blocking

The steward lane — the per-project PM tick — went live today and is jammed on
exactly this fault:

```
4941  approved  15:50:02   ← the new hourly cron fired correctly
4940  approved  14:58:14   "went to sleep mid-response"
```

m2 claims the dispatch, the link drops mid-run, the row returns to `approved`,
and the pump's **global in-flight cap of 1** then blocks every later tick. The
trigger and roster are both working; only the connection is not.

## Second job while you are there — nothing restarts the workers

Separate from the network, and cheap to fix:

`~/.local/bin/git-pull-dev` pulls every repo in `~/development` every 15 minutes
with `--ff-only`, skipping any repo with uncommitted changes. **It contains no
`launchctl kickstart`.** The boris plist claimed it did; that comment was wrong
and is corrected in hub `15c4e84`.

So new code lands on disk every 15 minutes and **no worker ever restarts**. All
three lanes have 45 days of process uptime against a checkout current to the
minute — which is why a dispatch claimed on m2 recorded a NULL `skill_version`
half an hour after version stamping shipped.

**SKILL.md edits are unaffected** — `SkillLoader` re-reads the file per
dispatch, so skills are always current. Only the worker's own TypeScript is
frozen at process start. (The routing handoff concluded the opposite: "m2 runs
stale skills". It runs stale *workers* and fresh skills.)

Fix: add a kickstart for each lane to `git-pull-dev` when hub is among the
updated repos. The plists already carry a 65-minute `ExitTimeOut` so a
kickstart drains the in-flight dispatch rather than killing it.

```bash
launchctl kickstart -k gui/$(id -u)/com.marvinbarretto.boris-dispatch-worker
launchctl kickstart -k gui/$(id -u)/com.marvinbarretto.jeffrey-groomer-worker
launchctl kickstart -k gui/$(id -u)/com.marvinbarretto.steward-pm-worker
```

**`git-pull-dev` exists only on m2 and is in no repository.** If m2 is ever
rebuilt, the thing that keeps every lane current goes with it. Worth committing
to hub while you are there.

## Verify before you finish

```bash
# 1. link is stable and ideally direct
tailscale netcheck | grep -E "PortMapping|UDP"
tailscale status | grep macbook-air        # want: direct, not "offline"

# 2. a steward tick completes end to end
ssh jimbo '. ~/.hermes/.env; curl -sS -X POST -H "X-API-Key: $JIMBO_API_KEY" \
  http://localhost:3100/api/steward/tick'

# 3. the claim now carries a version (proves the worker restarted)
#    NULL here means the worker is still running pre-2026-09-01 code
SELECT id, status, skill_version FROM dispatch_queue
WHERE skill='dispatch/project-steward' ORDER BY id DESC LIMIT 3;
```

## If the network cannot be fixed

m2's **outbound** path is reliable — its three lanes have polled jimbo-api over
HTTPS continuously for 45 days. Only inbound admin access is broken.

So the fallback is a **reverse tunnel from m2 out to the VPS**, giving stable
inbound access that never depends on NAT traversal. It needs one setup session
at the machine, which is Friday either way.

## Context worth having open

- `dashboard/docs/architecture/llm-billing-surfaces.md` — spend, engines, what is flat
- Skill registry audit — https://claude.ai/code/artifact/06b9924b-b3ca-4586-834e-47ffac805acf
- Job layers map — https://claude.ai/code/artifact/2daefbc7-ea49-4acd-8d83-3c143e11c585
- `hub/scripts/produces-audit.ts` — which skills honour their declared output
