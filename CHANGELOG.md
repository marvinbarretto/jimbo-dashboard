# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [0.0.6](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.5...v0.0.6) (2026-04-25)


### Features

* **vault:** open vault-item detail in modal from kanban ([2ce80e9](https://github.com/marvinbarretto/jimbo-dashboard/commit/2ce80e947b7015edb93987e0173baa7e69d8e08a))

### [0.0.5](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.4...v0.0.5) (2026-04-25)


### Features

* **db:** phase B pre-flight — extend schema for 21 tables, run final ETL ([2e224c6](https://github.com/marvinbarretto/jimbo-dashboard/commit/2e224c60a80f258ec6d6eca251019f112f65cbc4))
* **kanban:** loading skeletons, per-column empty copy, danger-tinted blocker ([3774335](https://github.com/marvinbarretto/jimbo-dashboard/commit/37743351256a7000a79088a937ff9c5f6199d6b1)), closes [#1](https://github.com/marvinbarretto/jimbo-dashboard/issues/1)

### [0.0.4](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.3...v0.0.4) (2026-04-25)


### Features

* **api:** embed live snapshot + days_in_column on /api/vault-items ([dfca598](https://github.com/marvinbarretto/jimbo-dashboard/commit/dfca598dd7c2b40794526a196b48faccc7b4fbfe))
* **api:** hono service serves grooming board from jimbo_pg ([17aae5b](https://github.com/marvinbarretto/jimbo-dashboard/commit/17aae5b0595dd05174f9167f28248d405b65c7bc))
* **api:** wire dispatches, actors, projects, vault-item-projects ([b3305ed](https://github.com/marvinbarretto/jimbo-dashboard/commit/b3305ed6356b109487fed894d932885bd61d5710))
* **routing:** page titles via TitleStrategy + dynamic per-entity titles ([e1a4269](https://github.com/marvinbarretto/jimbo-dashboard/commit/e1a4269643866523708cc974a6253bf762cd09df))
* type/category split + manual sync button (TEMPORARY) ([499e99a](https://github.com/marvinbarretto/jimbo-dashboard/commit/499e99ac2f8533ce0c533eaf426fab29633ab0d2))
* **vault:** filterable list of all 2353 items + sync isolation fix ([30755f4](https://github.com/marvinbarretto/jimbo-dashboard/commit/30755f494dfcb5860b34feac3085a2b13376d94e))


### Bug Fixes

* **dispatch:** map production 'running' status to dashboard 'running' ([d87897e](https://github.com/marvinbarretto/jimbo-dashboard/commit/d87897effbe652038ef47c44680eeac8f302f510))

### [0.0.3](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.2...v0.0.3) (2026-04-25)


### Features

* **db:** postgres poc — drizzle schema + etl from production sqlite ([9bf090f](https://github.com/marvinbarretto/jimbo-dashboard/commit/9bf090f4eb7964f29bb6c446f76cc89dac0480ac))
* **domain:** build canonical entity layer with seeded fixtures ([189cf0c](https://github.com/marvinbarretto/jimbo-dashboard/commit/189cf0c455d87c8d1ca8f31b1a7aff91de2e2c36))
* **execution:** /execution kanban for dispatch queue ([865012d](https://github.com/marvinbarretto/jimbo-dashboard/commit/865012de3ae9f75730b54755061c1fd0c379196d))
* **grooming:** actor identity rail + decomposed-draft badge on cards ([b58bf4d](https://github.com/marvinbarretto/jimbo-dashboard/commit/b58bf4d8c44348b09c1bee28c96bf6c84636eed8))
* **grooming:** add kanban with filters, hierarchy, per-actor colours ([d7776da](https://github.com/marvinbarretto/jimbo-dashboard/commit/d7776dabeb8cf31a31e3fe26429e493a29249d02))
* **grooming:** pulse dot for recent-activity rhythm ([3a09ab6](https://github.com/marvinbarretto/jimbo-dashboard/commit/3a09ab62ada23a838c3076cb2c251025e76d25ff))
* **kanban:** expanded cards, search, stuck signal, URL filter state ([0f4162f](https://github.com/marvinbarretto/jimbo-dashboard/commit/0f4162fed17b77709cc65f28fcc7786fec987cbc))


### Bug Fixes

* short-circuit HTTP in seed mode across all mutation services ([f67f4ae](https://github.com/marvinbarretto/jimbo-dashboard/commit/f67f4ae62aff09f01778148609ff589d2b2fbc4f))


### Code Refactoring

* **kanban:** lift column + filter bar + state composables to shared ([556bcc0](https://github.com/marvinbarretto/jimbo-dashboard/commit/556bcc0d7b8de525ecefc1bd3a1a5aabab24dd98))
* **staleness:** sqrt curve + dual-threshold amber gradient ([3dfb451](https://github.com/marvinbarretto/jimbo-dashboard/commit/3dfb4513f267706c4f8ad6e7027fb7616d7476bc))
* **styles:** extract staleness gradient to a shared scss partial ([c953b19](https://github.com/marvinbarretto/jimbo-dashboard/commit/c953b1996424fd5e1767d1a8af679c9e9cf98cb1))

### [0.0.2](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.1...v0.0.2) (2026-04-24)

### 0.0.1 (2026-04-24)


### Features

* add prompts feature with versioning and deploy script ([1e056f0](https://github.com/marvinbarretto/jimbo-dashboard/commit/1e056f0860b05b311248cb69ced5b84c913b0529))
* add Skills atom with signal forms and hermes hub reference ([c9bfab6](https://github.com/marvinbarretto/jimbo-dashboard/commit/c9bfab67ad316c47d8324ca110aa4fe1aa5ca7b8))
* add tools feature with versioning, dev proxy, and local auth config ([eba59f6](https://github.com/marvinbarretto/jimbo-dashboard/commit/eba59f6d7c9231c1ef6eabd3e0f4c411d447e341))
* Models CRUD vertical slice with E2E and coverage page ([6bfa3e2](https://github.com/marvinbarretto/jimbo-dashboard/commit/6bfa3e2441d7bafcaa6952a57996915a306ec8ca))
* show package version in nav, add npm run deploy script ([c5b53b1](https://github.com/marvinbarretto/jimbo-dashboard/commit/c5b53b1afedc35f1b77cd097e312950207db550d))
* wire services to PostgREST; full CRUD E2E suite ([cee845f](https://github.com/marvinbarretto/jimbo-dashboard/commit/cee845fe8cb06332bd5c9909704192603f265e56))


### Bug Fixes

* add missing btn base class on Cancel and [@empty](https://github.com/empty) fallback in skills list ([14cf81e](https://github.com/marvinbarretto/jimbo-dashboard/commit/14cf81e1a8f53266ac9a7a21da6a44e003e45bc4))


### Code Refactoring

* migrate all forms to ReactiveFormsModule; ban signal forms ([3e0bcbe](https://github.com/marvinbarretto/jimbo-dashboard/commit/3e0bcbee20f9466f3439037154085ca2d55a62e4))
* restructure features to containers/ui/data-access/utils pattern ([1af7415](https://github.com/marvinbarretto/jimbo-dashboard/commit/1af7415a540e9c946d9ab6bc98349a1fceca8bce))
