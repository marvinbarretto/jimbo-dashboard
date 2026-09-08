// Fleet prototype fixture — real production data (snapshot 2026-09-08T14:51Z)
// plus a reconstructed incident, so a monitoring redesign can be judged on the
// case it exists for. Every instant is stored as "minutes before now" and
// rebuilt at load: the calm state stays calm-looking whenever this is opened.
//
// Not a module — these pages open straight off the filesystem, and file://
// blocks module scripts.

const RAW = {
 "recent": [
  {
   "id": "5445",
   "task_id": "doc:auth",
   "skill": "code/doc-refresh",
   "flow": "fold",
   "executor": "boris",
   "status": "completed",
   "completed_model": "claude-sonnet-5",
   "error_message": null,
   "started_at": "2026-09-08T14:38:11.894Z",
   "completed_at": "2026-09-08T14:41:28.713Z",
   "turns": 1,
   "input_tokens": 48,
   "output_tokens": 10909,
   "cache_read_tokens": 1395614,
   "estimated_cost": 0.77323317527771,
   "_ago_started": 13.27,
   "_ago_completed": 9.99
  },
  {
   "id": "5465",
   "task_id": "note_e436eacd",
   "skill": "dispatch/intake-quality",
   "flow": "groom",
   "executor": "jeffrey",
   "status": "completed",
   "completed_model": "claude-haiku-4-5-20251001",
   "error_message": null,
   "started_at": "2026-09-08T14:28:33.390Z",
   "completed_at": "2026-09-08T14:29:12.305Z",
   "turns": 1,
   "input_tokens": 3510,
   "output_tokens": 2521,
   "cache_read_tokens": 174768,
   "estimated_cost": 0.07291054725646973,
   "_ago_started": 22.91,
   "_ago_completed": 22.26
  },
  {
   "id": "5444",
   "task_id": "doc:activity-events",
   "skill": "code/doc-refresh",
   "flow": "fold",
   "executor": "boris",
   "status": "completed",
   "completed_model": "claude-sonnet-5",
   "error_message": null,
   "started_at": "2026-09-08T14:25:09.761Z",
   "completed_at": "2026-09-08T14:28:10.408Z",
   "turns": 1,
   "input_tokens": 62,
   "output_tokens": 9976,
   "cache_read_tokens": 1941609,
   "estimated_cost": 0.9508174657821655,
   "_ago_started": 26.3,
   "_ago_completed": 23.29
  },
  {
   "id": "5464",
   "task_id": "note_fdb7900c",
   "skill": "dispatch/vault-classify",
   "flow": "groom",
   "executor": "jeffrey",
   "status": "completed",
   "completed_model": "claude-haiku-4-5-20251001",
   "error_message": null,
   "started_at": "2026-09-08T14:25:37.075Z",
   "completed_at": "2026-09-08T14:26:27.193Z",
   "turns": 1,
   "input_tokens": 3099,
   "output_tokens": 3422,
   "cache_read_tokens": 204170,
   "estimated_cost": 0.08058974891901016,
   "_ago_started": 25.85,
   "_ago_completed": 25.01
  },
  {
   "id": "5463",
   "task_id": "briefing-afternoon",
   "skill": "briefing/daily-v2",
   "flow": "recon",
   "executor": "boris",
   "status": "completed",
   "completed_model": "claude-opus-5",
   "error_message": null,
   "started_at": "2026-09-08T14:10:08.539Z",
   "completed_at": "2026-09-08T14:15:05.187Z",
   "turns": 1,
   "input_tokens": 62,
   "output_tokens": 19929,
   "cache_read_tokens": 1695903,
   "estimated_cost": 1.7816427946090698,
   "_ago_started": 41.32,
   "_ago_completed": 36.38
  },
  {
   "id": "5462",
   "task_id": "note_abf22a3b",
   "skill": "dispatch/intake-quality",
   "flow": "groom",
   "executor": "jeffrey",
   "status": "completed",
   "completed_model": "claude-haiku-4-5-20251001",
   "error_message": null,
   "started_at": "2026-09-08T13:58:26.385Z",
   "completed_at": "2026-09-08T13:58:57.390Z",
   "turns": 1,
   "input_tokens": 3497,
   "output_tokens": 1892,
   "cache_read_tokens": 78132,
   "estimated_cost": 0.03938769921660423,
   "_ago_started": 53.03,
   "_ago_completed": 52.51
  },
  {
   "id": "5461",
   "task_id": "note_0e704bea",
   "skill": "dispatch/vault-classify",
   "flow": "groom",
   "executor": "jeffrey",
   "status": "completed",
   "completed_model": "claude-haiku-4-5-20251001",
   "error_message": null,
   "started_at": "2026-09-08T13:55:30.838Z",
   "completed_at": "2026-09-08T13:56:22.297Z",
   "turns": 1,
   "input_tokens": 3104,
   "output_tokens": 3433,
   "cache_read_tokens": 175389,
   "estimated_cost": 0.07799790054559708,
   "_ago_started": 55.95,
   "_ago_completed": 55.09
  },
  {
   "id": "5443",
   "task_id": "assertion-scan-loop",
   "skill": "think/assertion-scan",
   "flow": "fold",
   "executor": "boris",
   "status": "completed",
   "completed_model": "claude-sonnet-5",
   "error_message": null,
   "started_at": "2026-09-08T13:46:01.543Z",
   "completed_at": "2026-09-08T13:50:34.261Z",
   "turns": 1,
   "input_tokens": 50,
   "output_tokens": 21086,
   "cache_read_tokens": 1537146,
   "estimated_cost": 1.032865047454834,
   "_ago_started": 65.44,
   "_ago_completed": 60.9
  },
  {
   "id": "5442",
   "task_id": "note_fdb7900c",
   "skill": "dispatch/intake-quality",
   "flow": "groom",
   "executor": "jeffrey",
   "status": "completed",
   "completed_model": "claude-haiku-4-5-20251001",
   "error_message": null,
   "started_at": "2026-09-08T13:28:17.531Z",
   "completed_at": "2026-09-08T13:28:51.275Z",
   "turns": 1,
   "input_tokens": 3502,
   "output_tokens": 2032,
   "cache_read_tokens": 108145,
   "estimated_cost": 0.042692750692367554,
   "_ago_started": 83.17,
   "_ago_completed": 82.61
  },
  {
   "id": "5441",
   "task_id": "note_43345692",
   "skill": "dispatch/vault-classify",
   "flow": "groom",
   "executor": "jeffrey",
   "status": "completed",
   "completed_model": "claude-haiku-4-5-20251001",
   "error_message": null,
   "started_at": "2026-09-08T13:25:35.300Z",
   "completed_at": "2026-09-08T13:26:12.654Z",
   "turns": 1,
   "input_tokens": 3087,
   "output_tokens": 2230,
   "cache_read_tokens": 106720,
   "estimated_cost": 0.05266774818301201,
   "_ago_started": 85.88,
   "_ago_completed": 85.26
  },
  {
   "id": "5440",
   "task_id": "note_0e704bea",
   "skill": "dispatch/intake-quality",
   "flow": "groom",
   "executor": "jeffrey",
   "status": "completed",
   "completed_model": "claude-haiku-4-5-20251001",
   "error_message": null,
   "started_at": "2026-09-08T12:58:22.862Z",
   "completed_at": "2026-09-08T12:58:55.068Z",
   "turns": 1,
   "input_tokens": 3507,
   "output_tokens": 1944,
   "cache_read_tokens": 73675,
   "estimated_cost": 0.04403325170278549,
   "_ago_started": 113.09,
   "_ago_completed": 112.55
  },
  {
   "id": "5439",
   "task_id": "note_73f34079",
   "skill": "dispatch/vault-classify",
   "flow": "groom",
   "executor": "jeffrey",
   "status": "completed",
   "completed_model": "claude-haiku-4-5-20251001",
   "error_message": null,
   "started_at": "2026-09-08T12:55:22.652Z",
   "completed_at": "2026-09-08T12:56:17.240Z",
   "turns": 1,
   "input_tokens": 3103,
   "output_tokens": 3676,
   "cache_read_tokens": 120386,
   "estimated_cost": 0.07936160266399384,
   "_ago_started": 116.09,
   "_ago_completed": 115.18
  },
  {
   "id": "5438",
   "task_id": "note_43345692",
   "skill": "dispatch/intake-quality",
   "flow": "groom",
   "executor": "jeffrey",
   "status": "completed",
   "completed_model": "claude-haiku-4-5-20251001",
   "error_message": null,
   "started_at": "2026-09-08T12:28:06.546Z",
   "completed_at": "2026-09-08T12:28:43.016Z",
   "turns": 1,
   "input_tokens": 3514,
   "output_tokens": 2125,
   "cache_read_tokens": 174371,
   "estimated_cost": 0.07043235003948212,
   "_ago_started": 143.36,
   "_ago_completed": 142.75
  },
  {
   "id": "5437",
   "task_id": "note_8a71e35f",
   "skill": "dispatch/vault-classify",
   "flow": "groom",
   "executor": "jeffrey",
   "status": "completed",
   "completed_model": "claude-haiku-4-5-20251001",
   "error_message": null,
   "started_at": "2026-09-08T12:25:17.166Z",
   "completed_at": "2026-09-08T12:26:01.977Z",
   "turns": 1,
   "input_tokens": 3114,
   "output_tokens": 2745,
   "cache_read_tokens": 174620,
   "estimated_cost": 0.0741647481918335,
   "_ago_started": 146.18,
   "_ago_completed": 145.43
  },
  {
   "id": "5436",
   "task_id": "note_73f34079",
   "skill": "dispatch/intake-quality",
   "flow": "groom",
   "executor": "jeffrey",
   "status": "completed",
   "completed_model": "claude-haiku-4-5-20251001",
   "error_message": null,
   "started_at": "2026-09-08T11:58:06.082Z",
   "completed_at": "2026-09-08T11:58:37.590Z",
   "turns": 1,
   "input_tokens": 3514,
   "output_tokens": 1955,
   "cache_read_tokens": 78052,
   "estimated_cost": 0.03931545093655586,
   "_ago_started": 173.36,
   "_ago_completed": 172.84
  },
  {
   "id": "5435",
   "task_id": "note_2bb73997",
   "skill": "dispatch/vault-classify",
   "flow": "groom",
   "executor": "jeffrey",
   "status": "completed",
   "completed_model": "claude-haiku-4-5-20251001",
   "error_message": null,
   "started_at": "2026-09-08T11:55:21.129Z",
   "completed_at": "2026-09-08T11:56:00.888Z",
   "turns": 1,
   "input_tokens": 3076,
   "output_tokens": 2437,
   "cache_read_tokens": 173327,
   "estimated_cost": 0.07153995335102081,
   "_ago_started": 176.11,
   "_ago_completed": 175.45
  },
  {
   "id": "5434",
   "task_id": "note_8a71e35f",
   "skill": "dispatch/intake-quality",
   "flow": "groom",
   "executor": "jeffrey",
   "status": "completed",
   "completed_model": "claude-haiku-4-5-20251001",
   "error_message": null,
   "started_at": "2026-09-08T11:27:33.792Z",
   "completed_at": "2026-09-08T11:28:10.254Z",
   "turns": 1,
   "input_tokens": 3533,
   "output_tokens": 2254,
   "cache_read_tokens": 152058,
   "estimated_cost": 0.07422004640102386,
   "_ago_started": 203.9,
   "_ago_completed": 203.3
  },
  {
   "id": "5433",
   "task_id": "note_413573a6",
   "skill": "dispatch/vault-classify",
   "flow": "groom",
   "executor": "jeffrey",
   "status": "completed",
   "completed_model": "claude-haiku-4-5-20251001",
   "error_message": null,
   "started_at": "2026-09-08T11:24:51.927Z",
   "completed_at": "2026-09-08T11:25:30.074Z",
   "turns": 1,
   "input_tokens": 3087,
   "output_tokens": 2401,
   "cache_read_tokens": 169208,
   "estimated_cost": 0.07640154659748077,
   "_ago_started": 206.6,
   "_ago_completed": 205.96
  },
  {
   "id": "5432",
   "task_id": "note_2bb73997",
   "skill": "dispatch/intake-quality",
   "flow": "groom",
   "executor": "jeffrey",
   "status": "completed",
   "completed_model": "claude-haiku-4-5-20251001",
   "error_message": null,
   "started_at": "2026-09-08T11:00:20.839Z",
   "completed_at": "2026-09-08T11:00:47.432Z",
   "turns": 1,
   "input_tokens": 3487,
   "output_tokens": 1603,
   "cache_read_tokens": 108242,
   "estimated_cost": 0.040043700486421585,
   "_ago_started": 231.12,
   "_ago_completed": 230.68
  },
  {
   "id": "5431",
   "task_id": "note_fd6ad39e",
   "skill": "dispatch/vault-classify",
   "flow": "groom",
   "executor": "jeffrey",
   "status": "completed",
   "completed_model": "claude-haiku-4-5-20251001",
   "error_message": null,
   "started_at": "2026-09-08T10:57:46.106Z",
   "completed_at": "2026-09-08T10:58:16.999Z",
   "turns": 1,
   "input_tokens": 3085,
   "output_tokens": 1852,
   "cache_read_tokens": 73200,
   "estimated_cost": 0.04280874878168106,
   "_ago_started": 233.7,
   "_ago_completed": 233.18
  }
 ],
 "burn": [
  {
   "actor": "boris",
   "model": "claude-opus-5",
   "turns": 2,
   "input_tokens": 142,
   "output_tokens": 43285,
   "estimated_cost": 3.9872145652770996
  },
  {
   "actor": "boris",
   "model": "claude-sonnet-5",
   "turns": 3,
   "input_tokens": 160,
   "output_tokens": 41971,
   "estimated_cost": 2.75691556930542
  },
  {
   "actor": "jeffrey",
   "model": "claude-haiku-4-5-20251001",
   "turns": 19,
   "input_tokens": 62938,
   "output_tokens": 45074,
   "estimated_cost": 1.1389434337615967
  }
 ],
 "folds": [
  {
   "skill": "code/doc-refresh",
   "last_enqueued_at": "2026-09-08T13:47:17.034Z",
   "last_completed_at": "2026-09-08T14:41:28.713Z",
   "last_status": "approved",
   "runs_7d": 17,
   "_ago_enq": 64.18,
   "_ago_done": 9.99
  },
  {
   "skill": "dispatch/project-steward",
   "last_enqueued_at": "2026-09-07T16:50:01.525Z",
   "last_completed_at": "2026-09-07T16:52:51.656Z",
   "last_status": "completed",
   "runs_7d": 6,
   "_ago_enq": 1321.44,
   "_ago_done": 1318.61
  },
  {
   "skill": "research/travel-planning",
   "last_enqueued_at": "2026-09-07T03:40:34.292Z",
   "last_completed_at": "2026-09-07T03:41:33.891Z",
   "last_status": "completed",
   "runs_7d": 3,
   "_ago_enq": 2110.89,
   "_ago_done": 2109.9
  },
  {
   "skill": "think/assertion-scan",
   "last_enqueued_at": "2026-09-08T13:45:56.921Z",
   "last_completed_at": "2026-09-08T13:50:34.261Z",
   "last_status": "completed",
   "runs_7d": 21,
   "_ago_enq": 65.52,
   "_ago_done": 60.9
  }
 ],
 "workers": [
  {
   "id": "boris",
   "machine": "m2",
   "status": "cooldown",
   "checked_at": "2026-09-08T14:41:28.780Z",
   "next_poll_at": "2026-09-08T14:51:28.780Z",
   "reason": null,
   "suspended": null,
   "_ago": 9.99,
   "_next": -0.01
  },
  {
   "id": "jeffrey",
   "machine": "m2",
   "status": "polling",
   "checked_at": "2026-09-08T14:51:22.480Z",
   "next_poll_at": null,
   "reason": null,
   "suspended": null,
   "_ago": 0.09,
   "_next": null
  },
  {
   "id": "kipper",
   "machine": "m4",
   "status": "gated",
   "checked_at": "2026-09-08T14:46:52.003Z",
   "next_poll_at": null,
   "reason": "on battery \u2014 waiting for mains",
   "suspended": null,
   "_ago": 4.6,
   "_next": null
  },
  {
   "id": "steward",
   "machine": "m2",
   "status": "polling",
   "checked_at": "2026-09-08T14:51:14.460Z",
   "next_poll_at": null,
   "reason": null,
   "suspended": null,
   "_ago": 0.23,
   "_next": null
  }
 ],
 "machines": [
  {
   "id": "m2",
   "last_seen_at": "2026-09-08T14:51:22.480Z",
   "workers": [
    "boris",
    "jeffrey",
    "steward"
   ],
   "stale": false,
   "stale_after_minutes": 10,
   "suspended": false,
   "_ago": 0.09
  },
  {
   "id": "m4",
   "last_seen_at": "2026-09-08T14:46:52.003Z",
   "workers": [
    "kipper"
   ],
   "stale": false,
   "stale_after_minutes": 1440,
   "suspended": false,
   "_ago": 4.6
  }
 ],
 "queue": [
  {
   "executor": "boris",
   "status": "approved",
   "count": 15
  },
  {
   "executor": "boris",
   "status": "proposed",
   "count": 3
  }
 ],
 "pulse": {
  "last_transition_at": "2026-09-08T14:41:28.713Z",
  "oldest_proposed_at": "2026-09-01T19:03:50.534Z",
  "last_completed_at": "2026-09-08T14:41:28.713Z",
  "approved_waiting": 15
 },
 "pump_ago": 26.05,
 "costs_by_day": [
  {
   "day": "2026-09-01",
   "total": 1.86465,
   "count": 4,
   "unpriced": 1
  },
  {
   "day": "2026-09-02",
   "total": 2.2799,
   "count": 5,
   "unpriced": 2
  },
  {
   "day": "2026-09-03",
   "total": 3.68449,
   "count": 8,
   "unpriced": 2
  },
  {
   "day": "2026-09-04",
   "total": 22.0187,
   "count": 97,
   "unpriced": 3
  },
  {
   "day": "2026-09-05",
   "total": 20.1136,
   "count": 150,
   "unpriced": 0
  },
  {
   "day": "2026-09-06",
   "total": 19.4449,
   "count": 146,
   "unpriced": 0
  },
  {
   "day": "2026-09-07",
   "total": 12.1969,
   "count": 65,
   "unpriced": 0
  },
  {
   "day": "2026-09-08",
   "total": 7.88307,
   "count": 28,
   "unpriced": 4
  }
 ],
 "costs_total": 89.486176,
 "costs_unpriced": 12,
 "lanes": [
  {
   "lane": "commission",
   "gate": "throttled",
   "reason": "throughput capped at 1 item(s) per tick.",
   "totals": {
    "intake": {
     "value": 213,
     "state": "measured",
     "n": 213,
     "as_of": "2026-08-31",
     "note": null
    },
    "started": {
     "value": 20,
     "state": "measured",
     "n": 213,
     "as_of": "2026-08-31",
     "note": "Pull requests opened, merged or not."
    },
    "output": {
     "value": 9,
     "state": "measured",
     "n": 213,
     "as_of": "2026-08-31",
     "note": null
    },
    "wip": {
     "value": 3,
     "state": "measured",
     "n": 3,
     "as_of": null,
     "note": null
    },
    "lead_time_weeks": {
     "value": 4,
     "state": "measured",
     "n": 3,
     "as_of": null,
     "note": "Little's Law: WIP divided by output rate."
    },
    "conversion": {
     "value": 0.042,
     "state": "measured",
     "n": 213,
     "as_of": null,
     "note": "Output divided by intake over the window."
    }
   },
   "weeks": [
    {
     "week_start": "2026-07-13",
     "intake": 35,
     "output": 0,
     "opened": 0
    },
    {
     "week_start": "2026-07-20",
     "intake": 37,
     "output": 0,
     "opened": 0
    },
    {
     "week_start": "2026-07-27",
     "intake": 42,
     "output": 0,
     "opened": 0
    },
    {
     "week_start": "2026-08-03",
     "intake": 12,
     "output": 0,
     "opened": 0
    },
    {
     "week_start": "2026-08-10",
     "intake": 2,
     "output": 0,
     "opened": 0
    },
    {
     "week_start": "2026-08-17",
     "intake": 1,
     "output": 0,
     "opened": 0
    },
    {
     "week_start": "2026-08-24",
     "intake": 18,
     "output": 1,
     "opened": 5
    },
    {
     "week_start": "2026-08-31",
     "intake": 12,
     "output": 0,
     "opened": 0
    }
   ]
  },
  {
   "lane": "recon",
   "gate": "open",
   "reason": null,
   "totals": {
    "intake": {
     "value": 180,
     "state": "measured",
     "n": 180,
     "as_of": "2026-09-07",
     "note": null
    },
    "started": {
     "value": 0,
     "state": "measured",
     "n": 180,
     "as_of": "2026-09-07",
     "note": "Pull requests opened, merged or not."
    },
    "output": {
     "value": 0,
     "state": "measured",
     "n": 180,
     "as_of": "2026-09-07",
     "note": null
    },
    "wip": {
     "value": 0,
     "state": "measured",
     "n": 0,
     "as_of": null,
     "note": null
    },
    "lead_time_weeks": {
     "value": null,
     "state": "not_measured",
     "n": 0,
     "as_of": null,
     "note": "No output in 10 week(s), so lead time is undefined rather than infinite. If this lane is deliberately paused, declare it: settings key pipeline.gate.recon."
    },
    "conversion": {
     "value": 0,
     "state": "measured",
     "n": 180,
     "as_of": null,
     "note": "Output divided by intake over the window."
    }
   },
   "weeks": [
    {
     "week_start": "2026-07-20",
     "intake": 17,
     "output": 0,
     "opened": 0
    },
    {
     "week_start": "2026-07-27",
     "intake": 16,
     "output": 0,
     "opened": 0
    },
    {
     "week_start": "2026-08-03",
     "intake": 22,
     "output": 0,
     "opened": 0
    },
    {
     "week_start": "2026-08-10",
     "intake": 26,
     "output": 0,
     "opened": 0
    },
    {
     "week_start": "2026-08-17",
     "intake": 28,
     "output": 0,
     "opened": 0
    },
    {
     "week_start": "2026-08-24",
     "intake": 28,
     "output": 0,
     "opened": 0
    },
    {
     "week_start": "2026-08-31",
     "intake": 28,
     "output": 0,
     "opened": 0
    },
    {
     "week_start": "2026-09-07",
     "intake": 7,
     "output": 0,
     "opened": 0
    }
   ]
  },
  {
   "lane": "groom",
   "gate": "throttled",
   "reason": "pipeline.deepread_items_per_tick, pipeline.decompose_items_per_tick set to 0; throughput capped at 2 item(s) per tick.",
   "totals": {
    "intake": {
     "value": 4124,
     "state": "measured",
     "n": 4124,
     "as_of": "2026-09-07",
     "note": null
    },
    "started": {
     "value": null,
     "state": "not_applicable",
     "n": 4124,
     "as_of": null,
     "note": null
    },
    "output": {
     "value": null,
     "state": "not_applicable",
     "n": 4124,
     "as_of": null,
     "note": "This lane prepares work; it is not supposed to ship anything."
    },
    "wip": {
     "value": 15,
     "state": "measured",
     "n": 15,
     "as_of": null,
     "note": null
    },
    "lead_time_weeks": {
     "value": null,
     "state": "not_applicable",
     "n": 15,
     "as_of": null,
     "note": "Lead time needs an output rate."
    },
    "conversion": {
     "value": null,
     "state": "not_applicable",
     "n": 4124,
     "as_of": null,
     "note": null
    }
   },
   "weeks": [
    {
     "week_start": "2026-07-20",
     "intake": 40,
     "output": 0,
     "opened": 0
    },
    {
     "week_start": "2026-07-27",
     "intake": 472,
     "output": 0,
     "opened": 0
    },
    {
     "week_start": "2026-08-03",
     "intake": 1031,
     "output": 0,
     "opened": 0
    },
    {
     "week_start": "2026-08-10",
     "intake": 869,
     "output": 0,
     "opened": 0
    },
    {
     "week_start": "2026-08-17",
     "intake": 388,
     "output": 0,
     "opened": 0
    },
    {
     "week_start": "2026-08-24",
     "intake": 288,
     "output": 0,
     "opened": 0
    },
    {
     "week_start": "2026-08-31",
     "intake": 377,
     "output": 0,
     "opened": 0
    },
    {
     "week_start": "2026-09-07",
     "intake": 114,
     "output": 0,
     "opened": 2
    }
   ]
  },
  {
   "lane": "vault",
   "gate": "open",
   "reason": null,
   "totals": {
    "intake": {
     "value": 2201,
     "state": "measured",
     "n": 2201,
     "as_of": "2026-09-07",
     "note": null
    },
    "started": {
     "value": null,
     "state": "not_applicable",
     "n": 2201,
     "as_of": null,
     "note": null
    },
    "output": {
     "value": 239,
     "state": "measured",
     "n": 2201,
     "as_of": "2026-09-07",
     "note": null
    },
    "wip": {
     "value": 1725,
     "state": "measured",
     "n": 1725,
     "as_of": null,
     "note": null
    },
    "lead_time_weeks": {
     "value": 93.8,
     "state": "measured",
     "n": 1725,
     "as_of": null,
     "note": "Little's Law: WIP divided by output rate."
    },
    "conversion": {
     "value": 0.109,
     "state": "measured",
     "n": 2201,
     "as_of": null,
     "note": "Output divided by intake over the window."
    }
   },
   "weeks": [
    {
     "week_start": "2026-07-20",
     "intake": 22,
     "output": 146,
     "opened": 0
    },
    {
     "week_start": "2026-07-27",
     "intake": 294,
     "output": 2,
     "opened": 0
    },
    {
     "week_start": "2026-08-03",
     "intake": 580,
     "output": 4,
     "opened": 0
    },
    {
     "week_start": "2026-08-10",
     "intake": 359,
     "output": 5,
     "opened": 0
    },
    {
     "week_start": "2026-08-17",
     "intake": 103,
     "output": 8,
     "opened": 0
    },
    {
     "week_start": "2026-08-24",
     "intake": 258,
     "output": 12,
     "opened": 0
    },
    {
     "week_start": "2026-08-31",
     "intake": 213,
     "output": 9,
     "opened": 0
    },
    {
     "week_start": "2026-09-07",
     "intake": 21,
     "output": 4,
     "opened": 0
    }
   ]
  }
 ],
 "warnings": [
  "Lane \"recon\" took 180 item(s) in the last 12 weeks, produced no output, and its valves are fully open. This one is worth investigating.",
  "2 pull request(s) are still recorded as open. Several repos have no pull_request webhook installed, so their merges were never delivered \u2014 output is undercounted until POST /api/state/pipeline/reconcile has run."
 ]
};

// ─────────────────────────────────────────────────────────────────────────
//  Time helpers — offsets are minutes before "now", resolved at load.
// ─────────────────────────────────────────────────────────────────────────
const NOW = Date.now();
const at = m => (m === null || m === undefined) ? null : new Date(NOW - m * 60_000).toISOString();

/** "3m" / "4h 10m" / "2d 5h" — matches formatAge() in fleet-health.ts. */
function age(mins) {
  if (mins === null || mins === undefined) return '—';
  const m = Math.max(0, Math.round(mins));
  // "0m ago" is not a reading, it is a rounding artefact.
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${m % 60}m`;
  return `${Math.floor(h / 24)}d ${h % 24}h`;
}
const ago = mins => {
  if (mins === null || mins === undefined) return 'never';
  const a = age(mins);
  return a === 'just now' ? a : `${a} ago`;
};

/** Tokens, k/M — matches formatTokens() on the board. */
function tok(v) {
  if (v >= 1e6) return (v / 1e6).toFixed(1) + 'M';
  if (v >= 1e3) return (v / 1e3).toFixed(1) + 'k';
  return String(v);
}

/**
 * INVARIANT: an unpriced model is unknown, never free. `null` renders as an
 * em-dash — showing $0.00 would read as "this cost nothing".
 */
function cost(v) {
  if (v === null || v === undefined) return '—';
  if (v >= 0.005) return '$' + v.toFixed(2);
  return v > 0 ? '<$0.01' : '$0.00';
}

// ─────────────────────────────────────────────────────────────────────────
//  The two states.
// ─────────────────────────────────────────────────────────────────────────

/** CALM — the live production snapshot, unedited. */
function calmState() {
  return {
    label: 'calm',
    workers: RAW.workers.map(w => ({ ...w, ago: w._ago, nextIn: w._next === null ? null : -w._next })),
    machines: RAW.machines.map(m => ({ ...m, ago: m._ago })),
    queue: RAW.queue,
    pulse: {
      approved_waiting: 15,
      // Something finished 10 minutes ago: the queue is moving.
      transition_ago: 10, completed_ago: 10, oldest_proposed_ago: 9948,
    },
    pumpAgo: RAW.pump_ago,
    now: [],
    failures: [],
    stuck: [],
    recent: RAW.recent.map(r => ({ ...r, startedAgo: r._ago_started, completedAgo: r._ago_completed })),
    burn: RAW.burn,
    folds: RAW.folds.map(f => ({ ...f, enqAgo: f._ago_enq, doneAgo: f._ago_done })),
    hermes: { active: 9, paused: 2, disabled: 1, failing: 0, staleErrors: 2,
              oldestStale: { name: 'x-bookmark-sweep', ago: 60 * 24 * 42 } },
  };
}

/**
 * INCIDENT — the 2026-09-04 shape the production code's comments keep
 * referring to, reconstructed: m2 drops, its three workers go silent with it,
 * approved work jams behind them, the pump stops, and a fold dies quietly.
 * Kipper is fine throughout and must not read as a fourth alarm.
 */
function incidentState() {
  const s = calmState();
  s.label = 'incident';

  s.machines = [
    { id: 'm2', workers: ['boris', 'jeffrey', 'steward'], stale: true,
      stale_after_minutes: 10, suspended: false, ago: 197 },
    { id: 'm4', workers: ['kipper'], stale: false,
      stale_after_minutes: 1440, suspended: false, ago: 4 },
  ];
  s.workers = [
    { id: 'boris',   machine: 'm2', status: 'executing', ago: 197, nextIn: null, reason: null, suspended: null },
    { id: 'jeffrey', machine: 'm2', status: 'polling',   ago: 201, nextIn: null, reason: null, suspended: null },
    { id: 'steward', machine: 'm2', status: 'polling',   ago: 199, nextIn: null, reason: null, suspended: null },
    { id: 'kipper',  machine: 'm4', status: 'gated',     ago: 4,   nextIn: null,
      reason: 'on battery — waiting for mains', suspended: null },
  ];

  s.queue = [
    { executor: 'boris',   status: 'approved', count: 21 },
    { executor: 'boris',   status: 'proposed', count: 3 },
    { executor: 'boris',   status: 'running',  count: 1 },
    { executor: 'jeffrey', status: 'approved', count: 6 },
  ];
  // INVARIANT: approved work sitting still past two commission ticks (240m)
  // is a jam. Proposed work sitting still is just unapproved.
  s.pulse = { approved_waiting: 27, transition_ago: 313, completed_ago: 313, oldest_proposed_ago: 9948 };
  s.pumpAgo = 244;

  // A job claimed just before the machine dropped, still nominally running.
  s.now = [{ id: '5471', task_id: 'note_a91c33de', executor: 'boris', flow: 'commission',
             skill: 'code/commission-item', startedAgo: 203,
             note_title: 'Port the grooming pump onto the dispatch queue' }];

  s.failures = [
    { id: '5470', task_id: 'note_71ba0c02', skill: 'dispatch/deep-read', flow: 'groom', executor: 'jeffrey',
      note_title: 'Audit film entity schema against the vault', retry_count: 3, completedAgo: 208,
      error_message: 'session exited 143 (SIGTERM) after 0 turns' },
    { id: '5469', task_id: 'note_2f0aa714', skill: 'dispatch/deep-read', flow: 'groom', executor: 'jeffrey',
      note_title: 'Collectr — decide the pack-opening animation budget', retry_count: 3, completedAgo: 212,
      error_message: 'session exited 143 (SIGTERM) after 0 turns' },
    { id: '5468', task_id: 'doc:dispatch', skill: 'code/doc-refresh', flow: 'fold', executor: 'boris',
      note_title: null, retry_count: 1, completedAgo: 244,
      error_message: 'ETIMEDOUT connecting to 100.72.4.19:8787' },
  ];
  s.stuck = [
    { note_id: 'note_71ba0c02', seq: 'JIM-1841', title: 'Audit film entity schema against the vault',
      grooming_status: 'deep_read', retry_count: 3, lockedAgo: 208 },
    { note_id: 'note_2f0aa714', seq: 'COL-233', title: 'Collectr — decide the pack-opening animation budget',
      grooming_status: 'deep_read', retry_count: 3, lockedAgo: 212 },
  ];

  // Everything shifted back past the outage, with the failures spliced in.
  s.recent = RAW.recent.map(r => ({
    ...r, startedAgo: r._ago_started + 200, completedAgo: r._ago_completed + 200,
  }));
  const asRow = f => ({ id: f.id, task_id: f.task_id, skill: f.skill, flow: f.flow, executor: f.executor,
    status: 'failed', completed_model: null, error_message: f.error_message,
    turns: 0, input_tokens: 0, output_tokens: 0, cache_read_tokens: 0, estimated_cost: null,
    startedAgo: f.completedAgo + 2, completedAgo: f.completedAgo });
  s.recent = [...s.failures.map(asRow), ...s.recent].sort((a, b) => a.completedAgo - b.completedAgo);

  // INVARIANT: an unpriced model contributes an unknown, not a zero — the
  // burn total must be readable as a floor, not as complete.
  s.burn = [
    ...RAW.burn,
    { actor: 'jeffrey', model: 'haiku', turns: 4, input_tokens: 14200, output_tokens: 6100, estimated_cost: null },
  ];

  // The fail-closed transport broke: nothing enqueued, so the queue shows
  // nothing, which looks exactly like "no work due".
  s.folds = RAW.folds.map(f =>
    f.skill === 'research/travel-planning'
      ? { ...f, enqAgo: 60 * 24 * 5.2, doneAgo: 60 * 24 * 5.2, last_status: 'completed', runs_7d: 1 }
      : { ...f, enqAgo: f._ago_enq + 200, doneAgo: f._ago_done + 200 });

  s.hermes = { active: 9, paused: 2, disabled: 1, failing: 2, staleErrors: 2,
               oldestStale: { name: 'x-bookmark-sweep', ago: 60 * 24 * 42 } };
  return s;
}

// ─────────────────────────────────────────────────────────────────────────
//  Verdict engine — the roll-up /fleet does not currently have.
//
//  Ported from src/app/features/journal/utils/fleet-health.ts, which already
//  encodes every one of these judgements and is used by the journal widget
//  but NOT by /fleet. The page hand-rolls its own heartbeatTone() instead,
//  so the two surfaces can disagree about the same fleet.
// ─────────────────────────────────────────────────────────────────────────
const IDLE_BY_DESIGN = new Set(['cooldown', 'gated']);
const QUEUE_JAM_MIN = 240;   // two commission ticks
const PUMP_STALE_MIN = 70;   // two pump ticks
const FOLD_STALE_MIN = 60 * 24 * 3;

/** Per-worker tone. Deliberately quiet is never an alarm. */
function workerTone(w, machines) {
  const m = machines.find(x => x.id === w.machine);
  if (m && m.stale) return 'covered';               // the machine owns this outage
  if (w.suspended) return 'parked';
  if (IDLE_BY_DESIGN.has(w.status)) {
    if (w.status === 'cooldown' && w.nextIn !== null && w.nextIn > -3) return 'parked';
    if (w.status === 'gated') return 'parked';
  }
  if (w.status === 'executing') return w.ago < 65 ? 'live' : 'lost';
  if (w.ago === null) return 'lost';
  const lost = w.id === 'kipper' ? 1440 : 60;
  const late = w.id === 'kipper' ? 600 : 15;
  if (w.ago >= lost) return 'lost';
  if (w.ago >= late) return 'late';
  return 'live';
}

/** Every fault, loudest first. Empty means genuinely nothing is wrong. */
function faults(s) {
  const out = [];
  for (const m of s.machines.filter(m => m.stale && !m.suspended)) {
    out.push({ tone: 'alert', key: 'machine-' + m.id,
      title: `${m.id} is unreachable`,
      // INVARIANT: one outage, one alarm. The machine owns it and its workers
      // defer — otherwise a single dropped box reads as four separate faults.
      detail: `silent for ${age(m.ago)}, past its ${m.stale_after_minutes}m threshold — its ${m.workers.length} workers (${m.workers.join(', ')}) are silent because it is, not because they crashed`,
      expect: `a heartbeat every ${m.stale_after_minutes}m` });
  }
  for (const w of s.workers) {
    // INVARIANT: only blame the worker when its machine is demonstrably up.
    if (workerTone(w, s.machines) !== 'lost') continue;
    out.push({ tone: 'alert', key: 'worker-' + w.id,
      title: `${w.id} has stopped`,
      detail: `silent for ${age(w.ago)} while ${w.machine} is up and its other workers are still checking in — the worker is the fault`,
      expect: 'a heartbeat every 15m' });
  }
  const approved = s.pulse.approved_waiting;
  // INVARIANT: a still queue is only a jam when APPROVED work is waiting.
  // Proposed work is supposed to sit until a human clears it.
  if (approved > 0 && s.pulse.transition_ago > QUEUE_JAM_MIN) {
    out.push({ tone: 'alert', key: 'jam',
      title: `${approved} approved jobs are jammed`,
      detail: `cleared to run, but nothing has moved for ${age(s.pulse.transition_ago)} — past two commission ticks, so this is a jam, not idling`,
      expect: 'the queue drains continuously' });
  }
  if (s.failures.length) {
    out.push({ tone: 'alert', key: 'failures',
      title: `${s.failures.length} dispatches failed in 24h`,
      detail: s.failures.slice(0, 2).map(f => `${f.skill} — ${f.error_message}`).join(' · '),
      expect: 'failures retry and clear' });
  }
  if (s.stuck.length) {
    out.push({ tone: 'alert', key: 'stuck',
      title: `${s.stuck.length} notes are grooming-locked with no dispatch`,
      detail: 'past the reap window and at the retry cap — the reaper refuses these, so nothing will ever pick them up without a human',
      expect: 'a lock is released or reaped' });
  }
  const hung = s.now.filter(j => j.startedAgo >= 120);
  for (const j of hung) {
    out.push({ tone: 'alert', key: 'hung-' + j.id,
      title: `${j.skill} has been running ${age(j.startedAgo)}`,
      detail: `${j.executor} · ${j.note_title ?? j.task_id} — dispatches are minutes of work, so this is hung, and it holds the slot behind it`,
      expect: 'under 2h' });
  }
  if (s.pumpAgo === null || s.pumpAgo > PUMP_STALE_MIN) {
    out.push({ tone: 'warn', key: 'pump',
      title: 'the grooming pump has gone silent',
      // INVARIANT: pump-dead and queue-empty look identical from the queue.
      detail: `last enqueued ${ago(s.pumpAgo)} — two ticks missed. An empty queue means nothing is being offered, not that there is nothing to do`,
      expect: 'a tick every 30m' });
  }
  for (const f of s.folds.filter(f => f.enqAgo === null || f.enqAgo > FOLD_STALE_MIN)) {
    out.push({ tone: 'warn', key: 'fold-' + f.skill,
      title: `${f.skill} has not been enqueued for ${age(f.enqAgo)}`,
      detail: 'the Hermes→queue transport fails closed, so a broken fold shows up as an empty queue rather than an error',
      expect: 'recurs every 2 days' });
  }
  if (s.hermes.failing > 0) {
    out.push({ tone: 'alert', key: 'hermes',
      title: `${s.hermes.failing} hermes jobs are failing`,
      detail: 'enabled, scheduled, and erroring on a recent run — the ambient lane on the VPS',
      expect: 'runs clean' });
  }
  const proposed = s.queue.filter(q => q.status === 'proposed').reduce((a, b) => a + b.count, 0);
  if (proposed > 0) {
    // Shown, never as a fault: this queue is waiting on Marvin, not a worker.
    out.push({ tone: 'yours', key: 'approval',
      title: `${proposed} dispatches await your approval`,
      detail: `proposed for ${[...new Set(s.queue.filter(q => q.status === 'proposed').map(q => q.executor))].join(', ')} — waiting on a decision, not on a worker`,
      expect: 'yours to approve or reject' });
  }
  const order = { alert: 0, warn: 1, yours: 2 };
  return out.sort((a, b) => order[a.tone] - order[b.tone]);
}

/** The one line at the top of the page. */
function verdict(s) {
  const f = faults(s);
  const alerts = f.filter(x => x.tone === 'alert');
  const warns  = f.filter(x => x.tone === 'warn');
  if (alerts.length) {
    return { tone: 'alert', head: 'Fleet degraded',
             line: alerts.map(a => a.title).join(' · '), faults: f };
  }
  if (warns.length) {
    return { tone: 'warn', head: 'Fleet running, with caveats',
             line: warns.map(a => a.title).join(' · '), faults: f };
  }
  // Actor-first: who shipped what, how recently. The old line led with
  // "2 machines up", which is the rack — and counted four workers directly
  // above a strip showing six actors.
  const cast = actorNow(s);
  const shipped = cast.filter(a => a.last).slice(0, 2)
    .map(a => `${a.id} shipped ${ago(a.last.completedAgo)}`);
  // Don't name the same actor twice: "boris shipped 10m ago · boris throttled"
  // is one actor's state split across two clauses.
  const named = new Set(shipped.map(t => t.split(' ')[0]));
  const standing = cast.filter(a => a.kind === 'parked' && !named.has(a.id))
    .map(a => `${a.id} ${a.act.verb}`);
  return { tone: 'ok', head: 'Fleet nominal',
           line: [shipped.join(', ') || 'nothing shipped in this window',
                  standing.join(', '), 'nothing failed in 24h'].filter(Boolean).join(' · '),
           faults: f };
}

/** Queue depth per executor, merged from the per-status rows. */
function lanes(s) {
  const by = new Map();
  for (const r of s.queue) {
    const k = r.executor ?? 'unassigned';
    const l = by.get(k) ?? { executor: k, approved: 0, running: 0, proposed: 0 };
    l[r.status] = (l[r.status] ?? 0) + r.count;
    by.set(k, l);
  }
  return [...by.values()].sort((a, b) => a.executor.localeCompare(b.executor));
}

/** Colour family per flow — one hue per lane, used by every direction. */
const FLOW_HUE = { fold: 'var(--color-info)', groom: 'var(--actor-color-jeffrey)',
                   recon: 'var(--actor-color-jimbo)', commission: 'var(--color-success)' };
const flowHue = f => FLOW_HUE[f] ?? 'var(--color-text-muted)';

// ── Prototype chrome: the calm/incident switch every page carries. ──
function mountSwitch(render) {
  let state = 'calm';
  const paint = () => render(state === 'calm' ? calmState() : incidentState(), state);
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-state]');
    if (!b) return;
    state = b.dataset.state;
    document.querySelectorAll('[data-state]').forEach(x =>
      x.setAttribute('aria-pressed', String(x.dataset.state === state)));
    paint();
  });
  paint();
}

const SWITCH_HTML = `
  <div class="proto-switch" role="group" aria-label="Fixture state">
    <button type="button" data-state="calm" aria-pressed="true">calm — live snapshot</button>
    <button type="button" data-state="incident" aria-pressed="false">incident — m2 drops</button>
  </div>`;

// The valves. Real settings keys from GET /api/state/pipeline — every lane
// already ships its own controls in the payload, and no page renders one.
const VALVES = [
 {
  "key": "pipeline.commission_enabled",
  "label": "Commissioning on",
  "value": "true",
  "is_default": false,
  "lane": "commission"
 },
 {
  "key": "pipeline.autonomous_projects",
  "label": "Projects that may be commissioned",
  "value": "[\"*\"]",
  "is_default": false,
  "lane": "commission"
 },
 {
  "key": "pipeline.autonomous_projects_excluded",
  "label": "Projects held back from commissioning",
  "value": "[]",
  "is_default": true,
  "lane": "commission"
 },
 {
  "key": "pipeline.commission_concurrency_cap",
  "label": "Commission concurrency cap",
  "value": "10",
  "is_default": false,
  "lane": "commission"
 },
 {
  "key": "pipeline.auto_update_pr_branches",
  "label": "Refresh stale PR branches",
  "value": "true",
  "is_default": false,
  "lane": "commission"
 },
 {
  "key": "pipeline.commission_items_per_tick",
  "label": "Commissions per tick",
  "value": "1",
  "is_default": false,
  "lane": "commission"
 },
 {
  "key": "pipeline.commission_tick_minutes",
  "label": "Commission tick interval (minutes)",
  "value": "120",
  "is_default": false,
  "lane": "commission"
 },
 {
  "key": "pipeline.enabled",
  "label": "Grooming pump on",
  "value": "true",
  "is_default": false,
  "lane": "groom"
 },
 {
  "key": "pipeline.scope",
  "label": "Grooming scope",
  "value": "all",
  "is_default": false,
  "lane": "groom"
 },
 {
  "key": "pipeline.scope_projects",
  "label": "Projects grooming may touch",
  "value": "[]",
  "is_default": false,
  "lane": "groom"
 },
 {
  "key": "pipeline.concurrency_cap",
  "label": "Grooming concurrency cap",
  "value": "3",
  "is_default": false,
  "lane": "groom"
 },
 {
  "key": "pipeline.intake_items_per_tick",
  "label": "Intake per tick",
  "value": "1",
  "is_default": false,
  "lane": "groom"
 },
 {
  "key": "pipeline.deepread_items_per_tick",
  "label": "Deep-read per tick",
  "value": "0",
  "is_default": false,
  "lane": "groom"
 },
 {
  "key": "pipeline.classify_items_per_tick",
  "label": "Classify per tick",
  "value": "1",
  "is_default": false,
  "lane": "groom"
 },
 {
  "key": "pipeline.decompose_items_per_tick",
  "label": "Decompose per tick",
  "value": "0",
  "is_default": false,
  "lane": "groom"
 },
 {
  "key": "pipeline.stranded_fallback_actor",
  "label": "Fallback actor for stranded work",
  "value": "boris",
  "is_default": true,
  "lane": "groom"
 },
 {
  "key": "pipeline.stranded_after_minutes",
  "label": "Stranded after (minutes)",
  "value": "180",
  "is_default": true,
  "lane": "groom"
 }
];

// ─────────────────────────────────────────────────────────────────────────
//  ACTORS — the fleet is a cast, not a rack.
//
//  A machine is infrastructure: it matters exactly twice, when it explains a
//  silence and when you need to go and restart it. The thing you actually
//  watch is WHO is doing WHAT. So the actor is the row, and the machine is an
//  attribute of it that surfaces only when it becomes the diagnosis.
// ─────────────────────────────────────────────────────────────────────────

const ACTOR_ROLE = {
  boris:   'commissions, folds and briefings — the expensive work, in bursts',
  jeffrey: 'grooming — high volume, short haiku runs',
  steward: 'project stewardship — one sit-down per project',
  kipper:  'the laptop lane — runs only awake and on mains',
  hermes:  'ambient jobs on the VPS — the metered half',
  marvin:  'approvals and decisions — the only lane a worker cannot drain',
};

/**
 * What every actor is doing at this instant, or — since dispatches are minutes
 * of work and the running list is usually empty — the freshest thing it just
 * did.
 *
 * "Nothing is running" is true most of the time and useless on its own. The
 * question behind it is "is anyone getting anything done", and that is answered
 * by pairing the live job with the last completed one.
 *
 * @param s Fixture state
 * @returns One row per actor, ordered by how recently it moved
 */
function actorNow(s) {
  const q = new Map(lanes(s).map(l => [l.executor, l]));
  const rows = s.workers.map(w => {
    const live = s.now.find(j => j.executor === w.id) ?? null;
    const last = s.recent.filter(r => r.executor === w.id)
      .sort((a, b) => a.completedAgo - b.completedAgo)[0] ?? null;
    const tone = workerTone(w, s.machines);
    const lane = q.get(w.id) ?? { approved: 0, proposed: 0, running: 0 };

    let act, kind;
    if (live) {
      // Hung is still "doing" — it is the holding of the slot that is the
      // problem, and hiding it under an idle label loses that.
      kind = live.startedAgo >= 120 ? 'hung' : 'running';
      act = { verb: kind === 'hung' ? 'stuck on' : 'running', skill: live.skill,
              what: live.note_title ?? live.task_id, ago: live.startedAgo };
    } else if (tone === 'covered') {
      kind = 'covered';
      act = { verb: 'unreachable', skill: null, what: `${w.machine} is down`, ago: w.ago };
    } else if (tone === 'lost') {
      kind = 'lost';
      act = { verb: 'stopped', skill: null, what: `silent while ${w.machine} is up`, ago: w.ago };
    } else if (tone === 'parked') {
      kind = 'parked';
      act = { verb: w.status === 'gated' ? 'standing by' : 'throttled', skill: null,
              what: w.status === 'gated' ? (w.reason ?? 'gated')
                : `quota cooldown, back ${w.nextIn <= 0 || age(w.nextIn) === 'just now' ? 'now' : `in ${age(w.nextIn)}`}`, ago: w.ago };
    } else {
      kind = 'idle';
      act = { verb: 'idle', skill: null, what: 'polling — nothing claimed', ago: w.ago };
    }

    // Order = what is happening, then what happened most recently. Live work
    // first; after that, recency of the last thing shipped. An actor that has
    // done nothing in the window sorts to the back rather than to the front on
    // a missing timestamp.
    return { id: w.id, machine: w.machine, role: ACTOR_ROLE[w.id] ?? null, kind, act, last, lane,
             sort: live ? -1e6 + live.startedAgo : (last?.completedAgo ?? 1e7) };
  });

  rows.push({
    id: 'hermes', machine: 'vps', role: ACTOR_ROLE.hermes,
    // 'ambient', never 'running'. Hermes is a scheduler, not a claimant: it is
    // continuously on and has no discrete job with a start time. Giving it the
    // live treatment made it the ONLY pulsing row in the calm state, pointing
    // the one "something is happening" signal at the actor doing nothing
    // identifiable, while the actors who actually shipped sat grey.
    kind: s.hermes.failing ? 'lost' : 'ambient',
    act: { verb: s.hermes.failing ? 'failing' : 'on schedule', skill: null,
           what: s.hermes.failing ? `${s.hermes.failing} scheduled jobs erroring`
                                  : `${s.hermes.active} ambient jobs on schedule`, ago: null },
    // Ambient, continuous, and never a discrete action — so it ranks behind
    // every actor that ships identifiable jobs, unless it is failing.
    last: null, lane: { approved: 0, proposed: 0, running: 0 },
    sort: s.hermes.failing ? -1e5 : 2e7,
  });

  // Marvin is an actor. The proposal queue is HIS lane, and drawing it as a
  // property of boris blames a worker that is polling normally.
  const mine = s.queue.filter(r => r.status === 'proposed').reduce((a, b) => a + b.count, 0);
  rows.push({
    id: 'marvin', machine: null, role: ACTOR_ROLE.marvin,
    kind: mine ? 'yours' : 'idle',
    act: { verb: mine ? 'owes' : 'clear', skill: null,
           what: mine ? `${mine} proposals waiting on a decision` : 'nothing waiting on you',
           ago: mine ? s.pulse.oldest_proposed_ago : null },
    // A queue is not an action. Marvin sits at the end of the strip however
    // much he owes — the accent tint is what makes him findable, not position.
    last: null, lane: { approved: 0, proposed: mine, running: 0 }, sort: 3e7,
  });

  return rows.sort((a, b) => a.sort - b.sort);
}

/** Tone vocabulary for an actor's current kind. */
// 'running' is the only kind that earns the live treatment, and it requires a
// dispatch with a start time behind it.
const ACT_TONE = { running: 'ok', ambient: 'ok', hung: 'alert', lost: 'alert',
                   covered: 'parked', parked: 'parked', idle: 'parked', yours: 'yours' };
