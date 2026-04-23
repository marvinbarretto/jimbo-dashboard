# Dashboard Migration Checklist

## Workstream 1: Docs and Scope

**Owner:** You + Codex

### Acceptance Criteria

- [ ] repo purpose is documented
- [ ] phase 2 architecture is documented
- [ ] Angular repo skeleton is documented
- [ ] migration plan is documented
- [ ] decisions are logged

## Workstream 2: Domain Core

**Owner:** Backend/domain-focused work

### Acceptance Criteria

- [ ] each domain has a written model
- [ ] each domain has explicit queries
- [ ] each domain has explicit commands
- [ ] each important workflow rule has tests
- [ ] no domain rule lives only in a UI component

## Workstream 3: Application Core

**Owner:** Application/orchestration work

### Acceptance Criteria

- [ ] application services are named after use-cases
- [ ] projections are built from application services
- [ ] query composition is isolated from UI
- [ ] command orchestration is testable without the shell

## Workstream 4: Angular Repo Skeleton

**Owner:** Frontend/platform work

### Acceptance Criteria

- [ ] standalone Angular app boots
- [ ] feature routes exist for the core surfaces
- [ ] shared shell layout exists
- [ ] libs compile cleanly
- [ ] test harness is wired

## Workstream 5: Data Boundary and Validation

**Owner:** Platform + domain work

### Acceptance Criteria

- [ ] all API reads validate at the boundary
- [ ] mutation payloads are typed and checked
- [ ] schema drift fails clearly
- [ ] there is one obvious source of truth for contracts

## Workstream 6: Presentation Migration

**Owner:** Frontend work

### Acceptance Criteria

- [ ] each feature has a route and container
- [ ] each feature uses shared primitives instead of bespoke glue
- [ ] list-heavy views use the shared table stack
- [ ] local UI state uses signals
- [ ] no feature file owns more than one concern

## Workstream 7: Test Coverage

**Owner:** QA + domain owners

### Acceptance Criteria

- [ ] grooming transitions are covered
- [ ] vault mutation invariants are covered
- [ ] email intake flows are covered
- [ ] dispatch flows are covered
- [ ] morning briefing and system inspection e2e flows exist

## Workstream 8: Cutover

**Owner:** You + frontend/domain owners

### Acceptance Criteria

- [ ] all required operator workflows are covered in Angular
- [ ] the Angular shell matches or exceeds current behavior
- [ ] critical tests are green
- [ ] no important business logic remains duplicated in the old shell

