# Dashboard Capabilities Map

This is the current Jimbo API capability map, framed for the Dashboard
frontend.

It is intentionally split into:

- available now
- gaps that matter

The point is to stop bouncing between backend additions and UI work without an
explicit contract for what the next layer actually needs.

## Available Now

### Health / Observability

Backend capability:

- current health snapshot
- health history
- trends
- token expiry visibility
- duplicate-message detection
- cost tracking
- activity tracking
- experiment tracking

Dashboard uses:

- `System`
- `Today`
- `Stream`

### Dispatch / Execution

Backend capability:

- queue
- approval
- rejection
- start / complete / fail
- history
- public approval links

Dashboard uses:

- `Board`
- `Today`
- `Grooming`

### Email Intake

Backend capability:

- submit reports
- list reports
- undecided queue
- stats
- decide
- forwarded flag

Dashboard uses:

- `Emails`
- `Today`
- future task generation flows

### Briefing

Backend capability:

- push analysis
- latest analysis
- history
- rating

Dashboard uses:

- `Today`

### Vault

Backend capability:

- list notes
- create note
- get note
- patch note
- stats
- ingest notes from disk

Dashboard uses:

- `Vault`
- `Tasks`
- `Grooming`
- `Today`
- `Stream`

### Context / Knowledge

Backend capability:

- list context files
- create/update/delete file
- sections/items CRUD

Dashboard uses:

- `Projects`
- `Today`
- `System`

### Settings

Backend capability:

- raw settings
- structured settings

Dashboard uses:

- `System`
- `Grooming`
- future feature flags / control knobs

### Fitness

Backend capability:

- sync
- summary
- records

Dashboard uses:

- `System`
- possibly `Today` if you want a morning signal layer

### Product Summaries

Backend capability:

- list summaries
- ingest summaries

Dashboard uses:

- future cross-product control surfaces
- current operator visibility

### Uploads / Webhooks

Backend capability:

- presigned upload URLs
- GitHub webhook ingestion

Dashboard uses:

- future file input flows
- future automation control flows

## Gaps That Matter

These are the gaps I would treat as strategically important.

### No first-class dashboard command layer

The API exposes routes, but the Dashboard needs a clearer command vocabulary
for user-facing workflows.

Examples:

- promote email to task
- create task from vault note
- move item to grooming
- return item to reservoir
- convert analysis into proposal

Why it matters:

- it keeps the UI thin
- it gives the application layer a stable action model
- it makes tests easier to write

### No explicit dashboard projection endpoints

The backend has primitives, but the Dashboard still needs a stable set of
composite reads for:

- Today briefing
- Board snapshot
- Grooming pipeline snapshot
- system/operator home

Why it matters:

- avoids overfetching in the shell
- keeps projections consistent across views
- reduces duplicated aggregation logic in the UI

### Limited explicit relationships between domains

The backend has the pieces, but the cross-links need to be formalized.

Examples:

- email → vault note → task → grooming → dispatch
- context item → project goal → related vault items
- briefing item → source domain references

Why it matters:

- Dashboard is a control plane, not isolated pages
- the product becomes much stronger when workflows are connected

### No obvious configurable workflow policy layer

If the goal is a product later, we eventually need the ability to define:

- what counts as ready
- what counts as a task
- what categories exist
- which workflow steps are automated vs manual

Why it matters:

- personalization becomes configuration instead of code
- the system becomes productizable without rewriting everything

### No unified entity reference model across surfaces

The system needs a clear internal reference model for:

- vault item IDs
- sequence numbers
- email IDs
- context slugs
- dispatch IDs
- briefing session IDs

Why it matters:

- deep linking gets easier
- cross-surface navigation gets safer
- agents can follow references reliably

### No single operator-action audit surface

There is observability, but the dashboard will benefit from a clearer view of:

- what changed
- who changed it
- what it affected
- which downstream workflows were triggered

Why it matters:

- debugging becomes faster
- agent behavior becomes easier to trust
- the control plane becomes more explainable

