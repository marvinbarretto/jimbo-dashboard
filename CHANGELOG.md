# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [0.0.9](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.8...v0.0.9) (2026-04-29)


### Features

* **grooming:** collapse filter bar behind toggle on mobile ([03f2c52](https://github.com/marvinbarretto/jimbo-dashboard/commit/03f2c52a2843e34105a77cfa2c9746a55dd68ea4))
* **grooming:** intake_rejected card rejection callout ([2d1dc06](https://github.com/marvinbarretto/jimbo-dashboard/commit/2d1dc0664fc7e602bdebff5bf9bd95d10b9d1f0e))
* **grooming:** mobile column switcher ([3b66d49](https://github.com/marvinbarretto/jimbo-dashboard/commit/3b66d495bdc57d31c3e696f9bc22977d08ab351e))
* **kanban:** accept ?note=<seq> as alias for ?detail=<seq> ([60ec14b](https://github.com/marvinbarretto/jimbo-dashboard/commit/60ec14bc8524c6d8876d98ac6c4924f6f4bb6666))
* **nav:** responsive top nav on mobile ([457395e](https://github.com/marvinbarretto/jimbo-dashboard/commit/457395e2fca24e0e401bdd5ee64122fa0e93e313))
* **vault-items:** mobile detail tabs ([c0e51df](https://github.com/marvinbarretto/jimbo-dashboard/commit/c0e51dfc8e42d8ebac13ad1643f5f08ee6ecef1d))
* **vault-items:** overflow menu for secondary actions on mobile ([16f1034](https://github.com/marvinbarretto/jimbo-dashboard/commit/16f103471534d1444b320ea3333887b790e083f9))
* **vault-items:** wrap action buttons to full-width row on mobile ([74906ba](https://github.com/marvinbarretto/jimbo-dashboard/commit/74906bafca7e52f320128bdcad2a0cd1c3b570b5))


### Bug Fixes

* **vault-items:** switch to overview tab when reject form opens ([535d0fe](https://github.com/marvinbarretto/jimbo-dashboard/commit/535d0fe1dd5402dede2ba7c3017841658a6b98a6))

### [0.0.8](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.7...v0.0.8) (2026-04-28)


### Features

* **activity-log:** make hand-offs auditable with cost ([9d9470c](https://github.com/marvinbarretto/jimbo-dashboard/commit/9d9470c04d7c011028805066f32eee62e9096ada))
* **activity-log:** replace inline event render with structured component hierarchy ([9a87a2a](https://github.com/marvinbarretto/jimbo-dashboard/commit/9a87a2a2c222b077571b0b17302ece573c806761))
* **db:** consolidate skills/prompts/tools/models into jimbo_pg (Phase 3 part 1, refs [#4](https://github.com/marvinbarretto/jimbo-dashboard/issues/4)) ([f35bb2a](https://github.com/marvinbarretto/jimbo-dashboard/commit/f35bb2a2b777fc940a0436a6dd5b564908cf32a4))
* **db:** extend costs as canonical LLM-call log for dispatch turns ([#3](https://github.com/marvinbarretto/jimbo-dashboard/issues/3)) ([92a2324](https://github.com/marvinbarretto/jimbo-dashboard/commit/92a2324a5301855f065c4da0f15c92fa863d6d55))
* **dev:** point local proxy at production dashboard-api ([e481650](https://github.com/marvinbarretto/jimbo-dashboard/commit/e481650fd7e94a5de45cfeccf9d3e3038c57e3f9))
* **grooming-db:** add needs_rework + intake_complete to status CHECK ([a790e45](https://github.com/marvinbarretto/jimbo-dashboard/commit/a790e458ac9b333ffcd2ef774724f664135265df))
* **grooming:** AC length validation chips (verbose/exceeds) ([d386d45](https://github.com/marvinbarretto/jimbo-dashboard/commit/d386d45d862ddf1b12183e811611b060c6e5b518))
* **grooming:** add rejectItem service mutation with audit trail ([01b3934](https://github.com/marvinbarretto/jimbo-dashboard/commit/01b39342df1335b88a38c1d9c31b328064958b14))
* **grooming:** card shapes for needs_rework + subitem chip ([282b25f](https://github.com/marvinbarretto/jimbo-dashboard/commit/282b25f04e482147a0d24f972d0614946921747b))
* **grooming:** extend types for needs_rework + rejection event ([271eae6](https://github.com/marvinbarretto/jimbo-dashboard/commit/271eae623a29dd80cf6869f938f2f568f683ce55))
* **grooming:** hover dismiss actions on grooming cards ([3370901](https://github.com/marvinbarretto/jimbo-dashboard/commit/33709016ee2eff51109e76e9b1f5098460f75a6c))
* **grooming:** reject-with-reason form in modal header ([57e6184](https://github.com/marvinbarretto/jimbo-dashboard/commit/57e61842bf699460e449e1dd86f2b0f073ac8ceb))
* **grooming:** restructure modal header into 4 visual zones ([3496f99](https://github.com/marvinbarretto/jimbo-dashboard/commit/3496f99953d06d6af67a8446c2df3fa476f3582e))
* **grooming:** rich agent-run events + nest hierarchy + source attribution ([eacda61](https://github.com/marvinbarretto/jimbo-dashboard/commit/eacda61ac7525df6b650483dbb3c4bb89fbc1d84)), closes [#963](https://github.com/marvinbarretto/jimbo-dashboard/issues/963)
* **grooming:** sort controls + staleness background tint ([294d938](https://github.com/marvinbarretto/jimbo-dashboard/commit/294d93813af0e70c7dd0c4281e14c79c9eeff624))
* **phase-c:** consolidate skills entity model + dispatch FK + DB pricing (refs [#4](https://github.com/marvinbarretto/jimbo-dashboard/issues/4)) ([74152ab](https://github.com/marvinbarretto/jimbo-dashboard/commit/74152ab251c6cb7fc53bcfbc0f3a10c0527064a3))
* **phase-c:** repoint all frontend services to dashboard-api (closes [#4](https://github.com/marvinbarretto/jimbo-dashboard/issues/4) part 3) ([bdbd97b](https://github.com/marvinbarretto/jimbo-dashboard/commit/bdbd97b170d965091962dd4ea042064c9c501874))
* rebuild /models + /model-stacks as filesystem editors, drop /prompts + /tools ([6eccab8](https://github.com/marvinbarretto/jimbo-dashboard/commit/6eccab8a70e09d3ec5aca2256a628ec5833ab62e))
* **skills:** create / delete / rename in the dashboard editor ([e70121e](https://github.com/marvinbarretto/jimbo-dashboard/commit/e70121e6f31f7fce6b103e9e4887ddf59620670e))
* **skills:** dashboard reads filesystem skills via dashboard-api proxy ([e20e0de](https://github.com/marvinbarretto/jimbo-dashboard/commit/e20e0dee493f2c01ab1806dab5f56ff41bd31730))
* **skills:** real edit form replacing the slice-2 placeholder ([9491df2](https://github.com/marvinbarretto/jimbo-dashboard/commit/9491df22db713f6e6ea2fb2c3ff7c16414e08828))
* **thread-messages:** accept rejection kind end-to-end ([ed84c92](https://github.com/marvinbarretto/jimbo-dashboard/commit/ed84c92c74e4cfe026ddfe58cc3ba5e0e0ea87c5))
* **toast:** add ToastService + wire into all CRUD service boundaries ([715b303](https://github.com/marvinbarretto/jimbo-dashboard/commit/715b3030608822352863ba777f0f135dbaadbc63))
* **vault-detail:** 3-column modal — body / activity / discussion ([310c91d](https://github.com/marvinbarretto/jimbo-dashboard/commit/310c91d41a9ed8710f808f15d6f9d8cc96602169))
* **vault-items:** seq-keyed write URLs ([444407a](https://github.com/marvinbarretto/jimbo-dashboard/commit/444407aba3ed766c78de3d912208e6bbc37856db))


### Bug Fixes

* **activity-events:** align adapter with VaultActivityEvent shapes ([b9f14d9](https://github.com/marvinbarretto/jimbo-dashboard/commit/b9f14d9b3ce43f6f164b6c9062e3cb9c0858a809))
* **api-shape:** add reason to ApiVaultItem.latest_event boundary type ([bdcb2e2](https://github.com/marvinbarretto/jimbo-dashboard/commit/bdcb2e2f165ba03d8b330bfed4bd536727f0a08b))
* **card-shapes:** rework badge reads reason from latest_event embed ([6463152](https://github.com/marvinbarretto/jimbo-dashboard/commit/646315291e722986161c0103f9602d8cecc13a97))
* **dashboard-api:** forward upstream jimbo-api error body on 5xx ([5991012](https://github.com/marvinbarretto/jimbo-dashboard/commit/59910120d092b335f3862664c852958d9f05a595))
* **dispatch:** drop dispatch_queue.skill FK to restore runners ([9d95ba9](https://github.com/marvinbarretto/jimbo-dashboard/commit/9d95ba9823fabe4a4235e6727d4fc267cb190b89))
* **grooming-board:** handle rejected event in describeEvent switch ([bf00061](https://github.com/marvinbarretto/jimbo-dashboard/commit/bf000610bb12b3b97e5c1ead3e20f8805476ad16))
* **grooming:** lock kanban column width and reflow card layout ([b3d519f](https://github.com/marvinbarretto/jimbo-dashboard/commit/b3d519f2b7a0473ac537b80e922007ca0c3a3cd0))
* **grooming:** real actors in reject dropdown + close modal + log rollback ([4e14236](https://github.com/marvinbarretto/jimbo-dashboard/commit/4e14236abd749fbf4bcc59aacf2836644989ce14))
* **grooming:** swap modal contents on parent link click instead of navigating ([fa4730e](https://github.com/marvinbarretto/jimbo-dashboard/commit/fa4730eea87fcfc9361ed946911a6a06bb9d02ce))
* **test-setup:** tighten globalThis symbol cast to Record<symbol, boolean> ([4f20bfd](https://github.com/marvinbarretto/jimbo-dashboard/commit/4f20bfd961403aaf065e9e7756b3e2b0d5f2a25b))


### Code Refactoring

* **modal-swap:** early-return shape + dual-element comment ([a6d451e](https://github.com/marvinbarretto/jimbo-dashboard/commit/a6d451e9c5c1d80185a1df94e5c44e7754bcc0f7))

### [0.0.7](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.6...v0.0.7) (2026-04-26)


### Features

* **api:** host dashboard-api on VPS at /dashboard-api/* with OpenAPI docs ([bb147b0](https://github.com/marvinbarretto/jimbo-dashboard/commit/bb147b0ea695c2e076d9e1200d820cff1781238c))
* **capture:** MVP quick-capture input in app shell ([1aea308](https://github.com/marvinbarretto/jimbo-dashboard/commit/1aea308665bdb351771ce50478f45b7dee6c6be0))
* **dashboard:** wire actors/projects/dispatch CRUD to dashboard-api ([ee3e269](https://github.com/marvinbarretto/jimbo-dashboard/commit/ee3e26939a19019a0f25d6db38c54775526a34b6)), closes [#2385](https://github.com/marvinbarretto/jimbo-dashboard/issues/2385)
* **db:** extend actors/projects schema for jimbo-api parity (migration 0003) ([21bed92](https://github.com/marvinbarretto/jimbo-dashboard/commit/21bed925362fdf2f8e15968733e449d20706a13c))
* **db:** interrogate schema (12 tables, migration 0005) ([ecd2289](https://github.com/marvinbarretto/jimbo-dashboard/commit/ecd22893f321c87309f524e2617e137645b2c5f6))
* **db:** search_index table + pg_trgm extension (migration 0004) ([31ccbd5](https://github.com/marvinbarretto/jimbo-dashboard/commit/31ccbd5e3270718543a06c91af6c4a8160f630ce))


### Bug Fixes

* **capture:** move capture-input inside main column ([12600bf](https://github.com/marvinbarretto/jimbo-dashboard/commit/12600bf9691db2f9361b74fbac8dec396d07d41e))

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
