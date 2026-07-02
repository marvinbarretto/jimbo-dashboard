// Shared fixture — real content from the live Priorities + Ambient context
// files (snapshot taken 2026-07-02), ages computed from actual updated_at.
// Duplicated inline into each prototype file per the docs/prototypes
// convention (self-contained, no build step) — this file is a reference
// copy only, not loaded by the HTML files.
const ITEMS = [
  // ── now ──────────────────────────────────────────────────────────────
  { bucket: 'now', section: 'Notes', label: null, content: "Hammersmith drinks are on tonight if nothing better comes up.", age: 0, status: null },
  { bucket: 'now', section: 'Notes', label: null, content: "Marvin has a Hinge date block on July 2nd, 6–11pm, but the match hasn't confirmed yet — keep the block active/busy.", age: 0, status: null },
  { bucket: 'now', section: 'This Week', label: null, content: "Keep at it with Hinge — at the very least 10 mins", age: 0, status: null },
  { bucket: 'now', section: 'This Week', label: 'One friend reach-out', content: "Before next reflect session: one unprompted text to a specific human, one specific low-effort thing.", age: 50, status: 'active' },
  { bucket: 'now', section: 'This Week', label: 'Do not bail on the Mat holiday', content: "25 May–2 June 2026. Currently feeling numb about it — commitment is to go regardless.", age: 50, status: 'active' },
  { bucket: 'now', section: 'This Week', label: 'Finances', content: "Look at the finances properly — open the bank app, get aware of where things stand. Avoided this commitment last session.", age: 75, status: 'active' },
  { bucket: 'now', section: 'This Week', label: 'Fix LinkedIn positioning', content: "Current profile says Frontend Developer / Angular specialist — massively undersells what I actually do. Update: (1) Headline → Product Engineer | AI, Full-Stack, React/Next.js, (2) About → rewrite to lead with end-to-end product building, kill Angular/CSS pitch, (3) Add Independent Product Engineer role for LocalShout + Jimbo, (4) Update featured skills, (5) Update current role headline at BuzzFeed.", age: 100, status: 'active' },
  { bucket: 'now', section: 'This Week', label: 'Note hygeine', content: "Clean up your todos and your notes, we have a vault now, we should use it", age: 106, status: 'deferred' },

  // ── ongoing ──────────────────────────────────────────────────────────
  { bucket: 'ongoing', section: 'Active Projects', label: 'Hinge X', content: "Unpaused as of June 2026. Active dating — engage with the app, start conversations, see what happens.", age: 13, status: 'active' },
  { bucket: 'ongoing', section: 'Active Projects', label: 'Jimbo/Hermes', content: "AI assistant. Daily briefing pipeline running well. Hermes framework is maturing and genuinely exciting.", age: 49, status: 'active' },
  { bucket: 'ongoing', section: 'Active Projects', label: 'LocalShout', content: "Community platform (Next.js). Close to shipping but has been haphazard — scope kept expanding.", age: 64, status: 'active' },
  { bucket: 'ongoing', section: 'Ongoing', label: null, content: "BuzzFeed contract finished April 2026. Intentional gap — using it to focus on LocalShout + Jimbo.", age: 64, status: null },
  { bucket: 'ongoing', section: 'Ongoing', label: 'Deferral pattern', content: "Recurring tendency to defer social life, dating, friendships, health, and balance behind “once I ship LocalShout.”", age: 64, status: 'active' },
  { bucket: 'ongoing', section: 'Active Projects', label: 'Explore leaving Watford', content: "Feeling invisible and restless. Airbnb guest staying long-term opens space to think about this.", age: 90, status: 'active' },
  { bucket: 'ongoing', section: 'Active Projects', label: 'NZ Passport', content: "Application started but stalled. Two hours of admin work. Keeps getting forgotten — needs a nudge.", age: 115, status: 'active' },
  { bucket: 'ongoing', section: 'Active Projects', label: 'SpoonsCount', content: "pub check-in app (Angular/Firebase/Capacitor). On hold until LocalShout alpha ships.", age: 117, status: 'paused' },
  { bucket: 'ongoing', section: 'Ongoing', label: null, content: "Get finances in order — YNAB setup, track spending", age: 117, status: null },

  // ── recurring ────────────────────────────────────────────────────────
  { bucket: 'recurring', section: 'Recurring Nudges', label: 'Body care floor', content: "Grooming, room hygiene, basic body care as non-negotiables — the floor, not the ceiling, of self-care.", age: 49, status: 'active' },
  { bucket: 'recurring', section: 'Recurring Nudges', label: 'Gym', content: "Been a few times. Target 2–3x/week. Half an hour is enough — keep it simple.", age: 64, status: 'active' },
  { bucket: 'recurring', section: 'Recurring Nudges', label: 'Act!', content: "Stop being the guy that thinks something nice to say / good to do, and then doesn't do it", age: 100, status: null },
  { bucket: 'recurring', section: 'Recurring Nudges', label: 'Pool', content: "Sundays/Mondays/Tuesdays work best", age: 117, status: 'active' },
  { bucket: 'recurring', section: 'Recurring Nudges', label: 'Spanish', content: "should be daily, even 10 mins", age: 117, status: 'active' },
  { bucket: 'recurring', section: 'Recurring Nudges', label: 'Walking', content: "good weather? Suggest a walk (walkingclub.org.uk for routes)", age: 117, status: 'active' },
  { bucket: 'recurring', section: 'Recurring Nudges', label: 'Cooking', content: "try recipes again: baba ganoush, other hits. Nudge when it's been a while.", age: 117, status: 'active' },
  { bucket: 'recurring', section: 'Recurring Nudges', label: 'Decluttering', content: "KonMari method in progress. Nudge to keep going.", age: 117, status: 'active' },

  // ── someday ──────────────────────────────────────────────────────────
  { bucket: 'someday', section: 'Deferred', label: null, content: "Sentry bug alerts — irrelevant until LocalShout goes live.", age: 115, status: 'deferred' },
  { bucket: 'someday', section: 'Deferred', label: null, content: "Artemis repo notifications — useful reference but too noisy for regular consumption", age: 117, status: 'deferred' },
  { bucket: 'someday', section: 'Deferred', label: null, content: "Long-form reading (Taibbi, Steve Baker deep pieces) — want to but rarely have time", age: 117, status: 'deferred' },
];
