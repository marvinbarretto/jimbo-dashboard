# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [0.0.30](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.29...v0.0.30) (2026-05-06)


### Features

* **mentions:** show vault item seq in ~ dropdown; widen panel ([8985014](https://github.com/marvinbarretto/jimbo-dashboard/commit/8985014d46b8f3477cb9a506ba1031a1c324aec2)), closes [#234](https://github.com/marvinbarretto/jimbo-dashboard/issues/234)

### [0.0.29](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.28...v0.0.29) (2026-05-06)


### Features

* **capture:** allow multiple projects, restore Actors to primary nav ([b8c6061](https://github.com/marvinbarretto/jimbo-dashboard/commit/b8c6061444390ef010b21721158a8b1bc5a0227c))
* **vault-items:** drop confirms on archive/delete, redirect after delete ([c121255](https://github.com/marvinbarretto/jimbo-dashboard/commit/c121255c25f939846943636ef1825851791742f9))
* **vault-items:** restore primary nav entry + row-level click navigation ([737035e](https://github.com/marvinbarretto/jimbo-dashboard/commit/737035e26a6bc92b561eb2a9c46558864994b49d))

### [0.0.28](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.27...v0.0.28) (2026-05-06)


### Features

* **mentions:** inline trigger-character completions for textareas ([1a24056](https://github.com/marvinbarretto/jimbo-dashboard/commit/1a24056e17273bc1d3a97c1e9abeb013f9757a50))

### [0.0.27](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.26...v0.0.27) (2026-05-06)


### Features

* **projects:** project accent colors + ProjectCard component + UI Lab child routes ([0301e0d](https://github.com/marvinbarretto/jimbo-dashboard/commit/0301e0da8f7e5481f972ff813c9971eb06b83867))
* **search+capture:** replace capture-input with command-palette dialogs ([7bc3be5](https://github.com/marvinbarretto/jimbo-dashboard/commit/7bc3be5c50d9f1bbf08a303ba9af93f8cb36dc62))

### [0.0.26](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.25...v0.0.26) (2026-05-06)


### Features

* **projects:** drag-and-drop between major and mini project sections ([b9ba1bf](https://github.com/marvinbarretto/jimbo-dashboard/commit/b9ba1bfe8c63e27526ea48f9ed074be482f8d984))


### Bug Fixes

* **projects:** unwrap raw-array response on GET /api/projects ([efd497a](https://github.com/marvinbarretto/jimbo-dashboard/commit/efd497a8c6c45fa0b43efa029a23451fd1f2e1e0))

### [0.0.25](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.24...v0.0.25) (2026-05-05)


### Bug Fixes

* **build:** add is_epic to vault fixtures, remove duplicate field, fix gap value ([eab63f3](https://github.com/marvinbarretto/jimbo-dashboard/commit/eab63f3ff53b8054f1ef4a7cc58dd91e1c4ad598))

### [0.0.24](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.23...v0.0.24) (2026-05-05)


### Features

* **projects:** three-tier portfolio page with major/minor/epics ([abc276e](https://github.com/marvinbarretto/jimbo-dashboard/commit/abc276ef0e9bc2d55d1822283c166a778d1defe3))

### [0.0.23](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.22...v0.0.23) (2026-05-05)


### Features

* **boards, vault-items:** create-opens-dialog with edit-in-place title/body ([ce18da9](https://github.com/marvinbarretto/jimbo-dashboard/commit/ce18da9171c6d7037fc10e0a527cc0bf26ea4cc4))
* **boards:** wire grooming + execution back to current api ([f420c35](https://github.com/marvinbarretto/jimbo-dashboard/commit/f420c355881b8378bce8bb12f24b85d0b31739c1))
* **pomo-app:** post-session retrospective with activity panel ([bb2ca5f](https://github.com/marvinbarretto/jimbo-dashboard/commit/bb2ca5f05adcf133b30fb4e46b6f367152cfb075))
* **vault-items:** edit-in-place for tags, AC, and parent ([edab2a5](https://github.com/marvinbarretto/jimbo-dashboard/commit/edab2a5b08265f559666cf7241395b8ee7e4a874))


### Bug Fixes

* **vault-item-projects:** unwrap raw-array response ([d57256e](https://github.com/marvinbarretto/jimbo-dashboard/commit/d57256e8717f90b1f80519bb791f33fff075d9bd))

### [0.0.22](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.21...v0.0.22) (2026-05-05)


### Features

* **triage-tasks:** include Jimbo's rationale in promoted vault body ([3455a94](https://github.com/marvinbarretto/jimbo-dashboard/commit/3455a94f486ee0f800f9df3cef11cd8ac128a12f))
* **triage-tasks:** render project ids as labels via shared pipes ([270b7b0](https://github.com/marvinbarretto/jimbo-dashboard/commit/270b7b0e03f45eaaca61e49e3661e05a6c43cc75))


### Code Refactoring

* **triage-tasks:** adopt 200-with-body cache lookup + clearer logs ([5e03dd4](https://github.com/marvinbarretto/jimbo-dashboard/commit/5e03dd44b9863d29cdb04a2d2edf27d4c4ba8958))

### [0.0.21](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.20...v0.0.21) (2026-05-05)


### Features

* **triage-tasks:** add Ask Jimbo button + proposal renderer ([ca6b661](https://github.com/marvinbarretto/jimbo-dashboard/commit/ca6b661333604e3c88708bfff51f55ed96af48b0))
* **triage-tasks:** add modal triage view (50/50 desktop, tabs on mobile) ([8b23a1b](https://github.com/marvinbarretto/jimbo-dashboard/commit/8b23a1bb136b4f391c478c228ff1bd20139bab0c))
* **triage-tasks:** add vault item preview card + token usage display ([cac1144](https://github.com/marvinbarretto/jimbo-dashboard/commit/cac1144c0bbcc0c02429ba05a2157330dfa82ee1))
* **triage-tasks:** cache proposals + log operator decisions ([fce3bc1](https://github.com/marvinbarretto/jimbo-dashboard/commit/fce3bc17408b03ad47236c8220df7eeed1370948))
* **triage-tasks:** mirror x-fetched url_fetch_status enum from server ([02cf7bc](https://github.com/marvinbarretto/jimbo-dashboard/commit/02cf7bc487a2e46ff8f9cd91fc3faf845aa8fb72))
* **triage-tasks:** wire Promote / Discard / Skip to real endpoints ([2287cc1](https://github.com/marvinbarretto/jimbo-dashboard/commit/2287cc12ef5f66a40eabf2ed023037f92c5d8f1a))


### Code Refactoring

* **triage-tasks:** single-column modal with stacked sections ([31e5de7](https://github.com/marvinbarretto/jimbo-dashboard/commit/31e5de7a70819d536e1722070a20d1f38038a594))

### [0.0.20](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.19...v0.0.20) (2026-05-05)


### Features

* **jimbo-workspace:** add primary nav page with Mail/Calendar/Tasks tabs ([7892e93](https://github.com/marvinbarretto/jimbo-dashboard/commit/7892e935ffc32372efef87125fb8928aa158873a))
* **pomo:** retrospective form on session expiry ([85ce71a](https://github.com/marvinbarretto/jimbo-dashboard/commit/85ce71aa5dfa5f4827e6ac2ad1493b6a2eecf8ad))
* **pomo:** show #seq in vault note typeahead results ([530b1b8](https://github.com/marvinbarretto/jimbo-dashboard/commit/530b1b820c4b0aa82b8da6a1d24f9bac7d7bd98c))

### [0.0.19](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.18...v0.0.19) (2026-05-05)


### Features

* **pomo-extension:** no-popup redesign with icon countdown ([47f730c](https://github.com/marvinbarretto/jimbo-dashboard/commit/47f730c533a4b618ff87e2f8886326332a321cf7))
* **pomo:** add Chrome MV3 extension for focus sessions ([b9a7144](https://github.com/marvinbarretto/jimbo-dashboard/commit/b9a71445c37637a3344c2f653c681e2ceb6046e9))
* **triage-tasks:** add Google Tasks triage page + nav wiring ([0464dea](https://github.com/marvinbarretto/jimbo-dashboard/commit/0464dea2b10e0554d38389e91cb1acefbf1ac23e))


### Bug Fixes

* **pomo-extension:** align with actual API schema ([6f0e3cf](https://github.com/marvinbarretto/jimbo-dashboard/commit/6f0e3cf8be085c1e6241d02a4f1c1debe1d447f4))
* **pomo-extension:** defensive OffscreenCanvas + surfaced click errors ([6250254](https://github.com/marvinbarretto/jimbo-dashboard/commit/6250254d18c32016bb9ba9acb83b0b34a4d21241))
* **pomo-extension:** display_name field + dedupe options link IDs ([a3657ee](https://github.com/marvinbarretto/jimbo-dashboard/commit/a3657ee255956514ec65f7e024b80815f87890f7))
* **pomo-extension:** larger icon canvas for readable countdown text ([2a8a3d9](https://github.com/marvinbarretto/jimbo-dashboard/commit/2a8a3d95c5687582f5d7e45c1b3458cd8ac37a23))
* **pomo-extension:** omit optional fields from start body ([4abcaf1](https://github.com/marvinbarretto/jimbo-dashboard/commit/4abcaf1276ccc9bbf38033c2dde671926a82a204))


### Code Refactoring

* **triage-tasks:** swap client-side fan-out for single /inbox call ([2fb5f30](https://github.com/marvinbarretto/jimbo-dashboard/commit/2fb5f3073f0217a3e7ca1e490b76dff099b2f78e))

### [0.0.18](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.17...v0.0.18) (2026-05-04)


### Features

* **calendar-settings:** add potential toggle per calendar ([32cacf9](https://github.com/marvinbarretto/jimbo-dashboard/commit/32cacf92dce264dfcb7ed21d9f9b6a2e58ce5132))
* **mail:** prune to lean email_reports surface ([6dad5ea](https://github.com/marvinbarretto/jimbo-dashboard/commit/6dad5eaffa0d968ea52c31ccc987e714bcb302fb))
* **nav:** full-bleed chunky nav, per-section accents, calendar settings, UiToggle ([0aa567c](https://github.com/marvinbarretto/jimbo-dashboard/commit/0aa567c6dc47710991e5ce96b7398a8f12df98b5))
* **phase-c:** remove dashboard-api BFF, point all services at jimbo-api ([6be8fc4](https://github.com/marvinbarretto/jimbo-dashboard/commit/6be8fc4f9c48523e88b6c44210c8479ed6dc1a34))
* **pomo:** standalone timer at /pomo + reports stub at /pomo-reports ([4d5a867](https://github.com/marvinbarretto/jimbo-dashboard/commit/4d5a867a804aa7128d053f9e98b4776ebae4fb1c))
* **settings:** auto-save calendar + tasks settings on toggle ([c1a44e5](https://github.com/marvinbarretto/jimbo-dashboard/commit/c1a44e5cf2206b6a1e366103bce3509ae95c09a7))
* **stream:** switch activity stream from WebSocket to SSE ([6b44ebc](https://github.com/marvinbarretto/jimbo-dashboard/commit/6b44ebcfaa2296388b576fe9c0192a6b60837471))
* **types:** regenerate api-types against lean email_reports shape ([eca24cd](https://github.com/marvinbarretto/jimbo-dashboard/commit/eca24cd61da2c567bb0536db1129869ec89156a4))
* **ui-lab:** left-nav with component registry; fix BFF migration tail ([d86e2b7](https://github.com/marvinbarretto/jimbo-dashboard/commit/d86e2b7da9fd02820a849bcffb73eeebdbbc04b0))


### Code Refactoring

* **ux:** include entity names in all toast messages ([0035f1a](https://github.com/marvinbarretto/jimbo-dashboard/commit/0035f1a02ae27f6fb226f1a7f0674276f551124f))

### [0.0.17](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.16...v0.0.17) (2026-05-04)


### Features

* **nav:** promote UI Lab to primary; archive everything else ([16f4f40](https://github.com/marvinbarretto/jimbo-dashboard/commit/16f4f40525728c0224fa56d7495b032611276a4c))
* **stream:** map session_id → cron job name; surface script output ([9795989](https://github.com/marvinbarretto/jimbo-dashboard/commit/979598946c8514d363bb3cbc57c0776a35fe17ca))
* **stream:** prefer agent.end as thread head + show all by default ([a4a198d](https://github.com/marvinbarretto/jimbo-dashboard/commit/a4a198d4f4bffd8a971c39d4b11e94e449f27a0e))
* **stream:** surface recent error classes panel above the firehose ([018875d](https://github.com/marvinbarretto/jimbo-dashboard/commit/018875d7d5ee1a48c1128b76e906e081ea65d6cc))
* **stream:** surface tool details — id chips, error callouts, duration ([384b2ca](https://github.com/marvinbarretto/jimbo-dashboard/commit/384b2ca9bda3293d3e75273bbce13ace2c92676d))

### [0.0.16](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.15...v0.0.16) (2026-05-04)


### Features

* **auth:** move dashboard auth from app-level X-API-Key to Caddy basic_auth ([21a29b9](https://github.com/marvinbarretto/jimbo-dashboard/commit/21a29b919c6335aeb7cfd5317ca27e8aec7d748a))
* **nav:** replace flat 24-item nav with primary links + contextual sub-nav ([2cc5bb4](https://github.com/marvinbarretto/jimbo-dashboard/commit/2cc5bb485808b7cffb832a9e9eb2b0b3f295097b))
* **shopping:** add shopping feature — schema, migration, routes, API proxy ([b2fec57](https://github.com/marvinbarretto/jimbo-dashboard/commit/b2fec57e32d1531fb47699678a8d116b16d966cf))
* **stream:** correlation grouping + expandable rows with detail/payload ([f54e4a2](https://github.com/marvinbarretto/jimbo-dashboard/commit/f54e4a24eda41ebe8f0d98a78d6e91de688fc15b))
* **stream:** live tail of system_events via WebSocket ([3230fc5](https://github.com/marvinbarretto/jimbo-dashboard/commit/3230fc5e83f10d1c95f7e4f82021d46a639cb74a))
* **ui:** add EntityChip + SmartComposerInput; retire OwnerChip and ProjectChip ([1d275c0](https://github.com/marvinbarretto/jimbo-dashboard/commit/1d275c099a6099aee7da927bd8c7b4fbb9a0c67f))
* **ui:** propagate EntityChip across filter bars, chip lists, and detail zones ([d6bda9b](https://github.com/marvinbarretto/jimbo-dashboard/commit/d6bda9b11ff41ba1ad042f8d47fe90996c85ea6b))


### Bug Fixes

* **jimbo-proxy:** forward 204 No Content responses without body parse ([df9b22a](https://github.com/marvinbarretto/jimbo-dashboard/commit/df9b22af20b88909468f03dc06a0493ae1d82787))
* **stream:** render timestamps in operator's local timezone ([5c623c4](https://github.com/marvinbarretto/jimbo-dashboard/commit/5c623c4c826ecf23e352227fdffe99d3bd64dbd8))
* **vault-item:** add addBySeq helper; fix vault-item-questions CSS indent ([4ee9aca](https://github.com/marvinbarretto/jimbo-dashboard/commit/4ee9aca00220f2897e1ded642916a98f0bebeffe))
* **vault-item:** replace alert() with toast in add-blocker flow ([3f61146](https://github.com/marvinbarretto/jimbo-dashboard/commit/3f6114674ec5fcce150d55d274513fe6a2dbcee9))


### Code Refactoring

* **vault-item:** decompose vault-item-detail-body; extract shared datetime utils ([8e1d510](https://github.com/marvinbarretto/jimbo-dashboard/commit/8e1d510ac6d72f62d69d0d770ae7a2463eaccc34))

### [0.0.15](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.14...v0.0.15) (2026-05-02)


### Features

* **hermes:** add /hermes control surface with three prototype views ([7a8cb81](https://github.com/marvinbarretto/jimbo-dashboard/commit/7a8cb81e23f40526a7488126418e1c590ff5ac92))
* **hermes:** multi-expand run history with expand/collapse all toggle ([f792746](https://github.com/marvinbarretto/jimbo-dashboard/commit/f792746599899483a70620f814e55674380664bf))
* **hermes:** show absolute timestamps alongside relative times in control room ([82e7bf9](https://github.com/marvinbarretto/jimbo-dashboard/commit/82e7bf94d9288df270cb54e257b31994391adf6e))
* **hermes:** show tool names, model, and run metadata in Control Room ([602d975](https://github.com/marvinbarretto/jimbo-dashboard/commit/602d975a8676e04302cb97584647d070e28f95f0))
* **hermes:** surface run duration, size, and tool-call signal in Control Room ([2004424](https://github.com/marvinbarretto/jimbo-dashboard/commit/2004424a30d463a431b91e2174eeff2e02776cff))
* **ui:** add UiTabBar component; standardise tab pattern from hermes-page ([895f6ea](https://github.com/marvinbarretto/jimbo-dashboard/commit/895f6ea01c335ff0ff80b6e97ea0d9bca62bb36e))
* **ui:** neutral admin UI component library and UI Lab showcase ([1c9b24c](https://github.com/marvinbarretto/jimbo-dashboard/commit/1c9b24c9433c26b25ab25e76fd30e6159bd0b9db))


### Bug Fixes

* **dashboard-api:** forward POST, PATCH, DELETE to jimbo-api for hermes mutations ([4a88be1](https://github.com/marvinbarretto/jimbo-dashboard/commit/4a88be10ebc15955959b549295a935ce6faaf6d2))
* **hermes:** don't hardcode openrouter/free as model display fallback ([5ef8cda](https://github.com/marvinbarretto/jimbo-dashboard/commit/5ef8cda4da7af796325cb87520ff71df782d758f))
* **today:** stack sections vertically on all screen sizes ([d082f7d](https://github.com/marvinbarretto/jimbo-dashboard/commit/d082f7df7b33364efa08b84e5ba0d2c53feebd23))

### [0.0.14](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.13...v0.0.14) (2026-04-30)

### [0.0.13](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.12...v0.0.13) (2026-04-30)


### Features

* **questions:** add /open-questions endpoint to dashboard-api BFF ([51d79a5](https://github.com/marvinbarretto/jimbo-dashboard/commit/51d79a533b8d0072160688aad43d64d36092a348))

### [0.0.12](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.11...v0.0.12) (2026-04-29)


### Features

* **detail:** add stacked-section + sticky-bar SCSS, remove dead tab styles ([34b749b](https://github.com/marvinbarretto/jimbo-dashboard/commit/34b749b68830537efe4144a7c5a45f0db7770b1f))
* **detail:** replace tab layout with stacked collapsible sections ([5cdb946](https://github.com/marvinbarretto/jimbo-dashboard/commit/5cdb94622c697c104c17cc97c688152d3d2cbdc6))
* **grooming:** permanent action row with inline reply on grooming card ([53b461c](https://github.com/marvinbarretto/jimbo-dashboard/commit/53b461cbe1e3d110e47492b3d1b68868c5c8eb6b))
* **questions:** add /questions triage page with inline reply ([40854f3](https://github.com/marvinbarretto/jimbo-dashboard/commit/40854f37d80943f30533a380375c8a2e2f114a09))
* **shared:** add QuestionReplyComposer for inline question answering ([c840a15](https://github.com/marvinbarretto/jimbo-dashboard/commit/c840a158b03e88a7c5b14c8c30edfa17d538b46c))


### Bug Fixes

* **thread:** add 'answer' kind to DB constraint and API schema ([cb90de0](https://github.com/marvinbarretto/jimbo-dashboard/commit/cb90de01752123cbfd88d7e2c473d83799296255))

### [0.0.11](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.10...v0.0.11) (2026-04-29)


### Features

* **dashboard:** expose jimbo api data pages ([c8644e6](https://github.com/marvinbarretto/jimbo-dashboard/commit/c8644e68c0f3e77f10bc3e1a34f23dc51268cc70))
* **jimbo-proxy:** read-only proxy to jimbo-api from dashboard API ([99d6713](https://github.com/marvinbarretto/jimbo-dashboard/commit/99d6713c790ca7658f6753ed5478378f29076706))
* **mobile:** responsive layout system with shared breakpoints and TableShell ([400e8ad](https://github.com/marvinbarretto/jimbo-dashboard/commit/400e8adc3d65938653ad5832ac55a11f1e37a13f))


### Bug Fixes

* **auth:** log 401 reason + restart API on deploy ([2deaeb9](https://github.com/marvinbarretto/jimbo-dashboard/commit/2deaeb93eccc0db35be594ba5d1d32250da746b8))

### [0.0.10](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.9...v0.0.10) (2026-04-29)

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
