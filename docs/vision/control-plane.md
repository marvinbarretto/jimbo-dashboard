# Dashboard Control Plane Vision

Dashboard is a control plane for one operator and their agent fleet.

The UI is not a generic dashboard. It is a work surface for:

- surfacing the most important thing happening now
- maintaining canonical memory and project context
- turning intake into work
- grooming work into ready state
- dispatching work to humans and agents
- observing the system while it runs

## Core Surfaces

- **Today**: the first screen of the morning. It synthesizes the most
  important events, risks, and action items across the rest of the system.
- **Projects**: long-lived project memory, goals, interests, and priorities.
  This is context data for the whole system, not a simple project list.
- **Vault**: canonical memory for notes, references, email-derived items,
  agent ideas, and general recall.
- **Tasks**: a filtered operational view over Vault focused on scrum/task work.
- **Grooming**: readiness workflow for Vault tasks. This is where items are
  analyzed, questioned, revised, and promoted to ready state.
- **Stream**: operational observability for seeing what is happening in the
  moving parts.
- **Board**: the execution kanban for ready work.
- **Emails**: inbox-to-work intake, analysis, and downstream task generation.
- **System**: raw API output and health/diagnostic visibility.

## Product Rules

- Domains come before screens.
- Screens are projections of domains.
- The UI should not invent business rules.
- If a rule matters, it belongs in the domain or application layer.

