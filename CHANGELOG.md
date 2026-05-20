# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [0.0.65](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.64...v0.0.65) (2026-05-20)


### Bug Fixes

* **journal/day:** side-query github pushes so busy days don't truncate them ([615ffbc](https://github.com/marvinbarretto/jimbo-dashboard/commit/615ffbcc497b9bd1bb0a5313c0db6a85188bd2c8))

### [0.0.64](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.63...v0.0.64) (2026-05-19)

### [0.0.63](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.62...v0.0.63) (2026-05-19)


### Features

* **journal/day:** Code section surfaces github push events ([700a43a](https://github.com/marvinbarretto/jimbo-dashboard/commit/700a43a0875d7884d6cf8e1d7807fd266c6d7329))
* **ui-checklist:** editable mode + delivery-block consumes the primitive ([85ccef8](https://github.com/marvinbarretto/jimbo-dashboard/commit/85ccef801dd7d1948507592bc2197c9ec2eea2c3))
* **vault:** canonical owner per grooming state + auto-reassign ([ba44c7e](https://github.com/marvinbarretto/jimbo-dashboard/commit/ba44c7e00e440dc370c26f7257c4be14f91b9731))
* **vault:** next-action projection + detail-body line ([d2685db](https://github.com/marvinbarretto/jimbo-dashboard/commit/d2685dbc15613535058cac21f4d3e743f1d82b59))


### Code Refactoring

* **activity-log:** richer event verbs, drop actor-kind pill ([cda24d3](https://github.com/marvinbarretto/jimbo-dashboard/commit/cda24d32bf4efbe34c40da1b994c006a6ae47378))

### [0.0.62](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.61...v0.0.62) (2026-05-14)


### Bug Fixes

* **vault-items:** include intake_rationale in wire schema + mapper ([15e1ecf](https://github.com/marvinbarretto/jimbo-dashboard/commit/15e1ecfeab903d7626c05bfcfcd0acdd313bf75c))
* **vault-items:** UiSection uses 'expanded' input, not 'collapsed' ([dc0ed8d](https://github.com/marvinbarretto/jimbo-dashboard/commit/dc0ed8df2558ef4c34ba6a6054faa3c7d1f96997))

### [0.0.61](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.60...v0.0.61) (2026-05-14)


### Features

* **vault-items:** render INTAKE RATIONALE exam in detail view ([d6a8aa1](https://github.com/marvinbarretto/jimbo-dashboard/commit/d6a8aa173719669dccdb394b66e7601a319c2ace))

### [0.0.60](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.59...v0.0.60) (2026-05-14)


### Features

* **ui-section:** add recede tone for secondary panes ([0137e8c](https://github.com/marvinbarretto/jimbo-dashboard/commit/0137e8c53a55e98daddbe34168b1fdfc8ad21b14))
* **ui:** add ui-timestamp primitive ([2797850](https://github.com/marvinbarretto/jimbo-dashboard/commit/2797850f212f1008f04e63977f91a6026711c39d))


### Code Refactoring

* **event-line:** use entity-chip for actor display ([db04298](https://github.com/marvinbarretto/jimbo-dashboard/commit/db0429816076f28c5f573da02a936de56e181a40))
* **ui:** extract filter pills primitive ([4ce01d4](https://github.com/marvinbarretto/jimbo-dashboard/commit/4ce01d471376351a76481bb1fe1bb2205a7e0485))
* **ui:** extract segmented control primitive ([971fcba](https://github.com/marvinbarretto/jimbo-dashboard/commit/971fcba44d2e2a2d2eaf23ac5624e20f51d150fa))
* **vault-detail:** unify section eyebrows ([7194249](https://github.com/marvinbarretto/jimbo-dashboard/commit/7194249bf05bfaac09d407f9d300f7214440d570))

### [0.0.59](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.58...v0.0.59) (2026-05-14)


### Bug Fixes

* **vault-items:** raise board limit to 5000 to cover full item set ([dfd31f3](https://github.com/marvinbarretto/jimbo-dashboard/commit/dfd31f39d32eca80c7a7aa2d4a58d39c37e5b7c4))

### [0.0.58](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.57...v0.0.58) (2026-05-14)


### Bug Fixes

* **execution:** hide removed dispatch tombstones from failed column ([129ef61](https://github.com/marvinbarretto/jimbo-dashboard/commit/129ef61018b422ebca8ec0faa70b64e4e363ed62))

### [0.0.57](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.56...v0.0.57) (2026-05-14)


### Features

* **toast:** coalesce by group key with a ×N counter ([1bd27e9](https://github.com/marvinbarretto/jimbo-dashboard/commit/1bd27e923151ae1466e3c2a7134c47cffc00137e))
* **vault-list:** bulk-select + multi-action bar for fast cleanup ([05b0438](https://github.com/marvinbarretto/jimbo-dashboard/commit/05b0438c8e81f3bf131a051e39f38d8c86bc2a49))

### [0.0.56](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.55...v0.0.56) (2026-05-13)


### Features

* **pomo-retro:** add mood donut + stat cards to retro view ([3b107c7](https://github.com/marvinbarretto/jimbo-dashboard/commit/3b107c7f3e53a195da68dd2effc79f7424bde1e2))
* **pomo:** retro page shows commits + explicit start-break action ([fd8a731](https://github.com/marvinbarretto/jimbo-dashboard/commit/fd8a731554b7f20a9db1939efe1b1bbce6403f3e))


### Bug Fixes

* **pomo-retro:** replace unnecessary optional chain on session().notes ([3fd9d56](https://github.com/marvinbarretto/jimbo-dashboard/commit/3fd9d56a2fb704af2bcee3e149f0976ac78a69c9))


### Code Refactoring

* **journal:** promote bar-chart + donut-chart to shared/components ([2a287e0](https://github.com/marvinbarretto/jimbo-dashboard/commit/2a287e00394dd24e8ab93da36521226fd0770a8a))

### [0.0.55](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.54...v0.0.55) (2026-05-13)


### Features

* **ui-lab:** add interactive kanban section for vault card ([02f175c](https://github.com/marvinbarretto/jimbo-dashboard/commit/02f175c3a4285011c5e7b2afbea38ed47d328051))
* **vault-card:** ownership styling, source badges, icon actions ([7fdba74](https://github.com/marvinbarretto/jimbo-dashboard/commit/7fdba744f8f800f5e1b79af0df76a64d3645e0b5))


### Bug Fixes

* **ui-lab:** add sourceKind/sourceUrl to vault-card-section fixtures ([b4afffe](https://github.com/marvinbarretto/jimbo-dashboard/commit/b4afffe8c6d6650688e7c4e3cdfcb06b357e2e5a))
* **ui-lab:** make _controls protected so template can access actionDisplay ([762a21d](https://github.com/marvinbarretto/jimbo-dashboard/commit/762a21df112f86694916403c3c14aba4c2a5ace4))


### Code Refactoring

* **vault-card:** collapse 10 void outputs into actionTriggered ([9aba40a](https://github.com/marvinbarretto/jimbo-dashboard/commit/9aba40afdd8fd1bbc13a2df79a0668f8e782efdf))
* **vault-item-detail:** use primitives for subtask/parent chips and fix token usage ([4666b48](https://github.com/marvinbarretto/jimbo-dashboard/commit/4666b481a2e6abab72751e0763b4148a9e1ae68e))

### [0.0.54](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.53...v0.0.54) (2026-05-12)

### [0.0.53](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.52...v0.0.53) (2026-05-12)


### Features

* **projects:** add 'admin' kind + dedicated section on projects list ([9a977c8](https://github.com/marvinbarretto/jimbo-dashboard/commit/9a977c86cda3806c9a4b8d67813c58e0c8dd2ccf))

### [0.0.52](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.51...v0.0.52) (2026-05-12)


### Features

* **projects:** inline brief fields on landing + epic children table ([621a97a](https://github.com/marvinbarretto/jimbo-dashboard/commit/621a97a0f9fc450ac68a1f2e70e4879d050dd658))

### [0.0.51](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.50...v0.0.51) (2026-05-12)


### Features

* **vault:** simplify epic detail view — hide delivery block and github url ([2aa977c](https://github.com/marvinbarretto/jimbo-dashboard/commit/2aa977c8980890c70e8ef8a0650a18b4a0144309))

### [0.0.50](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.49...v0.0.50) (2026-05-12)


### Features

* **grooming:** add → note button to early-funnel kanban cards ([d012e4b](https://github.com/marvinbarretto/jimbo-dashboard/commit/d012e4b6950936b115126c96dc815958735f23ed))
* **grooming:** hard-delete action on early-funnel cards ([e5761b0](https://github.com/marvinbarretto/jimbo-dashboard/commit/e5761b03522ec23d91b43331bc43d4d79eca98ba))
* **projects:** auto-derive project id from display name ([c3c586c](https://github.com/marvinbarretto/jimbo-dashboard/commit/c3c586c99c70a75cbb9068df81452ef3a484215c))
* **vault:** demote task → note from detail action bar ([4577e3b](https://github.com/marvinbarretto/jimbo-dashboard/commit/4577e3b882fad8580f7eaa9f595b63490cb239ce))
* **vault:** inline priority + owner editing in detail and cards ([2d91c61](https://github.com/marvinbarretto/jimbo-dashboard/commit/2d91c61acacbc1a631d80cd2179946e5df2b45b8))


### Bug Fixes

* **vault-card:** unclip dropdown overflow, make question badge navigable ([6eb013c](https://github.com/marvinbarretto/jimbo-dashboard/commit/6eb013c55f289a179faf25ac5b6db030eb94f134))


### Code Refactoring

* **grooming:** drop delete confirm, sharpen archive/delete toasts ([39740d8](https://github.com/marvinbarretto/jimbo-dashboard/commit/39740d8754ce4d5e984c0a6b21c53dccbe3f9cb0)), closes [#2417](https://github.com/marvinbarretto/jimbo-dashboard/issues/2417)
* **grooming:** rework card identity surface and inline-backfill missing project/epic ([5f7eaa2](https://github.com/marvinbarretto/jimbo-dashboard/commit/5f7eaa2fe40d3130cdb3541b381845e08024405f))

### [0.0.49](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.48...v0.0.49) (2026-05-11)


### Features

* **execution:** switch retry to POST /:id/retry on jimbo-api ([fe0a3e4](https://github.com/marvinbarretto/jimbo-dashboard/commit/fe0a3e423db316ef4d5bb542472e0fefb30153c0))


### Code Refactoring

* **grooming:** add GroomingCommands and drop dead card components ([224c0b9](https://github.com/marvinbarretto/jimbo-dashboard/commit/224c0b9faa459beaa2c842cf6efd7e83228561b9))
* **ui:** consolidate button, icon, and actor primitives ([765e943](https://github.com/marvinbarretto/jimbo-dashboard/commit/765e9436a11d3314d1fab39d27b2df3a8026cc5a))

### [0.0.48](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.47...v0.0.48) (2026-05-09)


### Features

* **execution:** wire dismiss / archive buttons + bulk-clear sweep ([77ed5ed](https://github.com/marvinbarretto/jimbo-dashboard/commit/77ed5ed063732a2ed1366716a9770c32dd6493e6))
* **projects:** inline create flow with ghost tile + modal ([2ffb32e](https://github.com/marvinbarretto/jimbo-dashboard/commit/2ffb32ef15e9afcc11c11ec506a68ba57cd1cbec))
* **thread:** add ThreadCommands with answerQuestion compound action ([91d119e](https://github.com/marvinbarretto/jimbo-dashboard/commit/91d119e32abe952843e7627610464dbef28a4079))
* **vault:** add reassign command + close grooming-board's bypass ([5de899e](https://github.com/marvinbarretto/jimbo-dashboard/commit/5de899e7340f24f8683f32dc93987813e6a6fbbe))
* **vault:** add VAULT_ITEMS_READ token for type-narrowed read access ([8be00a7](https://github.com/marvinbarretto/jimbo-dashboard/commit/8be00a70daa30e63a7852a016d27f120f2d288fd))


### Code Refactoring

* **chips:** entity-chip removable + nest in mention strip ([239cc20](https://github.com/marvinbarretto/jimbo-dashboard/commit/239cc20561f13e27005cc3f61cf465ea8f7c2fe2))
* **dispatch:** migrate retry() to withOptimisticUpdate helper ([2f05172](https://github.com/marvinbarretto/jimbo-dashboard/commit/2f0517270feaf0e00f6e34bd7c27e70434368e76))
* **lint:** allow type imports + fold 4 legacy violations ([a7a7580](https://github.com/marvinbarretto/jimbo-dashboard/commit/a7a7580df1ff10678c7123050eda557a1bec7f89))
* **shared:** fold seed-mode into withOptimistic via seedMode flag ([e649562](https://github.com/marvinbarretto/jimbo-dashboard/commit/e649562a29b32bee024acc50a348902bdc723c50))
* **shared:** generics + contract notes on withOptimistic helpers ([be4c0d3](https://github.com/marvinbarretto/jimbo-dashboard/commit/be4c0d31f6280ceef6e7f3856038d94c9d214f33)), closes [#1](https://github.com/marvinbarretto/jimbo-dashboard/issues/1) [#2](https://github.com/marvinbarretto/jimbo-dashboard/issues/2) [#1](https://github.com/marvinbarretto/jimbo-dashboard/issues/1) [#1](https://github.com/marvinbarretto/jimbo-dashboard/issues/1) [#2](https://github.com/marvinbarretto/jimbo-dashboard/issues/2)
* **vault-items:** finish withOptimistic sweep — create, createOnBoard, rejectItem ([1013c86](https://github.com/marvinbarretto/jimbo-dashboard/commit/1013c86c2e21cb3b6c7819f8870e29aebddd9b9f))
* **vault-items:** migrate 8 mutations to withOptimistic helpers ([0ade7ee](https://github.com/marvinbarretto/jimbo-dashboard/commit/0ade7ee81916f771ca1799751ca0fc6f7df0f44c))

### [0.0.47](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.46...v0.0.47) (2026-05-08)


### Features

* **shared:** add withOptimistic helpers for entity stores ([afff306](https://github.com/marvinbarretto/jimbo-dashboard/commit/afff306edee371047c51c0795e94e00ae259acc8))
* **vault:** add command layer with readiness gate for dispatch approval ([56a3a4b](https://github.com/marvinbarretto/jimbo-dashboard/commit/56a3a4b402703d7bb8d4816c5c64e4093f39d422))


### Bug Fixes

* **vault:** auto-close detail modal when item is archived or deleted ([15a1702](https://github.com/marvinbarretto/jimbo-dashboard/commit/15a1702f14ce9f6fb1056c4f79bd047e2b93d256))

### [0.0.46](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.45...v0.0.46) (2026-05-08)


### Code Refactoring

* **journal:** group day page into Work / Health / Phone sections ([05c9a36](https://github.com/marvinbarretto/jimbo-dashboard/commit/05c9a36c41024b76230e08267c5127f760c21160))

### [0.0.45](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.44...v0.0.45) (2026-05-08)


### Features

* **execution:** cut over execution board to app-vault-card ([2f4c75e](https://github.com/marvinbarretto/jimbo-dashboard/commit/2f4c75e546f8b759f6a988480b3bfcd095b3080e))
* **journal:** add Health Connect section to day page ([67ee876](https://github.com/marvinbarretto/jimbo-dashboard/commit/67ee876d925a9991ba62282c7cc99d495be920a2))
* **kanban:** unify card components into app-vault-card with monochrome identity ([9ba8172](https://github.com/marvinbarretto/jimbo-dashboard/commit/9ba817283294f7a850a356e12e27a58e83d1f5eb))
* **vault-card:** action registry, staleness gradient, fix activity 404 ([dc40f2e](https://github.com/marvinbarretto/jimbo-dashboard/commit/dc40f2eb4d88b907788bf12813b65d86aca0ec2a))


### Bug Fixes

* **journal:** null-coalesce number pipe output for stat card values ([59e3e8a](https://github.com/marvinbarretto/jimbo-dashboard/commit/59e3e8abd520e6ef6a48863d8e4d1f8cc734c0a5))

### [0.0.44](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.43...v0.0.44) (2026-05-08)


### Features

* **actors:** promote actors to top-level route with rich profile pages ([e578ddb](https://github.com/marvinbarretto/jimbo-dashboard/commit/e578ddbc64a769e9411f808a0a099aeb6a152a28))
* **journal:** add phone telemetry section to day page ([846aa4b](https://github.com/marvinbarretto/jimbo-dashboard/commit/846aa4bd7b259b26436e6214560a8ca12e3306bd))
* **journal:** expand phone signals section with rich telemetry breakdown ([f477425](https://github.com/marvinbarretto/jimbo-dashboard/commit/f477425ce48ed1fa98d94f880237d8fc3f6407a0))
* **ui:** add UiBreadcrumb component; wire into actor, project, skill detail pages ([f657d3b](https://github.com/marvinbarretto/jimbo-dashboard/commit/f657d3ba7b80947e58a2694ad513c946b1342cc2))
* **vault:** rework manual task creation UX ([07a31b0](https://github.com/marvinbarretto/jimbo-dashboard/commit/07a31b0b5cbfb4b9c559f25a285a132c0f4332d1))


### Bug Fixes

* **journal:** set dynamic browser tab title from date key on day/week/month pages ([8f2d528](https://github.com/marvinbarretto/jimbo-dashboard/commit/8f2d528c2def030f50dee96f7a4a2eadbc50530a))
* **journal:** use local-time day boundaries for telemetry query ([1a019b0](https://github.com/marvinbarretto/jimbo-dashboard/commit/1a019b0243c9bf2fb4ef94664f3bf0ce19ec4ecc))
* **skills:** replace stray app-ui-back-link in skill-detail not-found state ([370c3c0](https://github.com/marvinbarretto/jimbo-dashboard/commit/370c3c07aaddbebd2b4042aa5b46273fed425da3))


### Code Refactoring

* **kanban:** extract shared board layout into _board-layout.scss ([d26c5b5](https://github.com/marvinbarretto/jimbo-dashboard/commit/d26c5b5cb1ce63835e29e45b14fd9b287fb87db1))

### [0.0.43](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.42...v0.0.43) (2026-05-08)


### Bug Fixes

* **dispatch:** drop limit from ApiDispatchesResponseSchema — paginatedResponse never returns it ([8605710](https://github.com/marvinbarretto/jimbo-dashboard/commit/860571014e986699e4c5a61397ec211c1422f1ca))

### [0.0.42](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.41...v0.0.42) (2026-05-07)


### Bug Fixes

* **vault:** coerce seq to number — postgres.js returns bigint as string ([534c144](https://github.com/marvinbarretto/jimbo-dashboard/commit/534c14469b425dbafd83719e6594c0924aa206e3))

### [0.0.41](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.40...v0.0.41) (2026-05-07)


### Features

* **journal:** replace native date inputs with Flatpickr picker ([fc87cb0](https://github.com/marvinbarretto/jimbo-dashboard/commit/fc87cb06d95ae1bf7ebc500ed546cb5098d19d9c))
* **projects:** add per-project landing page ([b9ea3a1](https://github.com/marvinbarretto/jimbo-dashboard/commit/b9ea3a10ee513eeb6aa27490f31c40bdcb8d6918))
* **projects:** inline-edit name, description, status, repo_url on landing page ([1ac5105](https://github.com/marvinbarretto/jimbo-dashboard/commit/1ac510573db53883fab02b4e6259116df4910b91))


### Bug Fixes

* **journal:** install ng2-charts types, patch loadDay lookback, add date-keys tests ([ec0b4e9](https://github.com/marvinbarretto/jimbo-dashboard/commit/ec0b4e97da4aab3a1fea9dd1344ef281bfa9ffbe))
* **pomo:** remove redundant ?. and ! operators in pomo-retro template ([0a37ed0](https://github.com/marvinbarretto/jimbo-dashboard/commit/0a37ed01c461a6cf7434c8e421e31fc508d2ec8d))
* **ui-lab:** move status cast out of template into onStatusSaved() ([a102e95](https://github.com/marvinbarretto/jimbo-dashboard/commit/a102e95e357aa35a3f32478136d7243beb4ada5c))


### Code Refactoring

* **projects:** consolidate detail into landing page ([7fb13fc](https://github.com/marvinbarretto/jimbo-dashboard/commit/7fb13fc1fd6940abd9c25673658e34b92dd2e9ff))
* **ui-lab:** rewrite hybrid-edit-section using UiInlineEdit ([fb88262](https://github.com/marvinbarretto/jimbo-dashboard/commit/fb882622e5ec65b5ad1a10a7e86e2ca7b6e16755))

### [0.0.40](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.39...v0.0.40) (2026-05-07)


### Bug Fixes

* **projects:** make updated_at optional in API schema ([e6df3b0](https://github.com/marvinbarretto/jimbo-dashboard/commit/e6df3b0d69be5e10dd6136324a338025054c71ef))

### [0.0.39](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.38...v0.0.39) (2026-05-07)


### Bug Fixes

* **errors:** stop swallowing failed HTTP requests across services ([c1e5d7c](https://github.com/marvinbarretto/jimbo-dashboard/commit/c1e5d7cde86d3b91b8d4d45daf03c217d7902052))

### [0.0.38](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.37...v0.0.38) (2026-05-07)


### Features

* **pomo-break:** read break duration from ?mins query param ([6b1b0f7](https://github.com/marvinbarretto/jimbo-dashboard/commit/6b1b0f77b0cccfcd098b5e64d2cb2360f3d59731))
* **pomo:** integrated vault items across all four pomo pages ([960cedb](https://github.com/marvinbarretto/jimbo-dashboard/commit/960cedb48c101433220fb2a45cd1a10b79d4c4f3))
* **types:** zod schemas at the API boundary for actors/projects/dispatch/vault ([736b39b](https://github.com/marvinbarretto/jimbo-dashboard/commit/736b39b27dcf0a0708ad2c5185d7709f198b6ecc))
* **vault-item-detail:** redesign modal layout and fix actor resolution ([2aac6ae](https://github.com/marvinbarretto/jimbo-dashboard/commit/2aac6ae7d23e15876b7f92fb37dadbc417363cb1))


### Bug Fixes

* **actors:** tighten ActorId contracts; stop chip lying about unresolved owners ([77a804d](https://github.com/marvinbarretto/jimbo-dashboard/commit/77a804d21a5dc4645a4c082ee90c52a2080e7feb))
* **types:** make executor and owner_actor_id honestly nullable ([a066d04](https://github.com/marvinbarretto/jimbo-dashboard/commit/a066d04aac42a3269f4c785473e722b93c958af0))

### [0.0.37](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.36...v0.0.37) (2026-05-07)


### Features

* **pomo:** enrich all four pomo pages with live data ([18aea23](https://github.com/marvinbarretto/jimbo-dashboard/commit/18aea232e307c318a3624376849d1b20a2248525))

### [0.0.36](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.35...v0.0.36) (2026-05-07)

### [0.0.35](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.34...v0.0.35) (2026-05-07)


### Features

* **auth:** add auth status chip to app-topbar ([f46c491](https://github.com/marvinbarretto/jimbo-dashboard/commit/f46c491045ff31ea676ffad5d45ff022fb4aed7e))
* **epics:** add epic-row, epic-card, and app-chip primitives ([9c75908](https://github.com/marvinbarretto/jimbo-dashboard/commit/9c7590895cad65bcd0fafc33ae7db097466e4b46))
* **pomo:** scaffold Angular pomo flow — shell, pre-session, running, break, retro ([0256513](https://github.com/marvinbarretto/jimbo-dashboard/commit/02565136cbd4a363916a6cc279c15951aac5568f))

### [0.0.34](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.33...v0.0.34) (2026-05-06)


### Features

* **kanban:** show hours/minutes for same-day items instead of 'today' ([3685aa0](https://github.com/marvinbarretto/jimbo-dashboard/commit/3685aa0cc63fd57fc2e5f2960dc1006e5861a8c5))

### [0.0.33](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.32...v0.0.33) (2026-05-06)


### Features

* **mail-activity:** surface email triage pipeline + promote ui-refresh-control ([3b30d0f](https://github.com/marvinbarretto/jimbo-dashboard/commit/3b30d0f5b9bb8341fecb2e88a8c93a9a21824451))
* **stream:** tool-name prefixes on error classes, cascade panel for tool-call threads ([b170b5e](https://github.com/marvinbarretto/jimbo-dashboard/commit/b170b5e0f7bfcb078c0b835c7be84452c6da11df))
* **swipe:** feedback / re-triage path for cards with questions ([d96d098](https://github.com/marvinbarretto/jimbo-dashboard/commit/d96d098c29e826fcf17195ff7b18e0e2bac593d6))
* **tasks:** activity sub-nav showing recent triage runs ([01e6409](https://github.com/marvinbarretto/jimbo-dashboard/commit/01e640964e2128407d0dc756c3c236852dd49b69))
* **tasks:** add Swipe sub-nav, drop redundant JSON in Activity ([40e5ff6](https://github.com/marvinbarretto/jimbo-dashboard/commit/40e5ff62b0666ae2eaa63423d4838e72863a1ec6))
* **theme:** add light theme + topbar toggle with sun/moon icon ([6946d48](https://github.com/marvinbarretto/jimbo-dashboard/commit/6946d4814e1b3601e07d2c3f0cc1040362cfc0c7))
* **ui-lab:** promote ui-inline-edit shared primitive ([a59de13](https://github.com/marvinbarretto/jimbo-dashboard/commit/a59de130739d98d1353a773a6331d88a3cca06a5))
* **ui-lab:** promote ui-mention-chip-strip shared primitive ([73eebb8](https://github.com/marvinbarretto/jimbo-dashboard/commit/73eebb87aa48e07ebcc742613c542493133135e0))
* **ui-tab-bar:** stick to top below header so sub-nav stays reachable on long pages ([3e6ca20](https://github.com/marvinbarretto/jimbo-dashboard/commit/3e6ca20c62e41e0909fe2d8aa0725d1aa7fb0e1c))
* **vault-dialog:** introduce DialogMode discriminated union for unified dialog ([b641b1b](https://github.com/marvinbarretto/jimbo-dashboard/commit/b641b1bb41a9b97e0d04e661edb004ea541fbf27))
* **vault-dialog:** unify Draft + Item rendering behind DialogMode ([c081f3b](https://github.com/marvinbarretto/jimbo-dashboard/commit/c081f3b18a7f43dce5e717561990d8ae738f8358))
* **vault-dialog:** wire Shift+N to unified dialog, retire CaptureDialog ([08c940a](https://github.com/marvinbarretto/jimbo-dashboard/commit/08c940a902765a276577139a44014b13eb910ba7))
* **vault:** add createWithRelations for unified-dialog draft creation ([2e0af21](https://github.com/marvinbarretto/jimbo-dashboard/commit/2e0af21417a476e63e53b021e3e0ddc9940137a2))


### Bug Fixes

* **seed:** align model-stack chain with OpenRouter unsuffixed model id ([42c6526](https://github.com/marvinbarretto/jimbo-dashboard/commit/42c6526161b091f73e282e64d32ffa0aae3c72ce))
* **shortcuts:** rename capture shortcut from C to Shift+N, label to 'New item' ([57edb3e](https://github.com/marvinbarretto/jimbo-dashboard/commit/57edb3e8f43e14d6e21476653b2b6c4ded2ab1fd))
* **tests:** unblock test runner — backfill is_epic, brand projectId in spec ([9afe1d5](https://github.com/marvinbarretto/jimbo-dashboard/commit/9afe1d566ab895a18c35d62739034bc973b60ee7))


### Code Refactoring

* **vault-dialog:** extract VaultItemDialogStore for focused-item state ([8df9d24](https://github.com/marvinbarretto/jimbo-dashboard/commit/8df9d2452bc513ce31fd19a91758d31168406bf6))

### [0.0.32](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.31...v0.0.32) (2026-05-06)


### Features

* **config:** promote models + model-stacks under /config sub-nav ([42a1969](https://github.com/marvinbarretto/jimbo-dashboard/commit/42a1969532ee87db01b3cfe1b2c7743bcfe37655))
* **config:** promote skills under /config sub-nav ([c0c60b0](https://github.com/marvinbarretto/jimbo-dashboard/commit/c0c60b063eeb5b25883666bd1bcb903b0ce76ad6))
* **dispatch-schema:** capability-based skill/actor matching ([beac7eb](https://github.com/marvinbarretto/jimbo-dashboard/commit/beac7eb49c43d9eb9c4a8dcefb4fbf357ad8d25a))
* **models:** align model schema to OpenRouter conventions ([70153a2](https://github.com/marvinbarretto/jimbo-dashboard/commit/70153a2d8a102766b69b9d1800b45407a62c307f))
* **stream:** add stale cron-job liveness panel, restore Stream nav ([1334d8f](https://github.com/marvinbarretto/jimbo-dashboard/commit/1334d8f5cd48cc81fe162d7930d7772404f36b88))
* **tasks:** nest settings + triage under /tasks parent ([0b59b48](https://github.com/marvinbarretto/jimbo-dashboard/commit/0b59b489c33a268465e6d63b07dd550c56de8152))


### Bug Fixes

* **actors:** drop dead ?. on serves in actor-detail ([1468d0e](https://github.com/marvinbarretto/jimbo-dashboard/commit/1468d0e8bac85d1b2a1b6a6f1a1464db6c7b2926))
* **models, skills:** tighten template type guards ([826b727](https://github.com/marvinbarretto/jimbo-dashboard/commit/826b727a37ca28f21e3372a2407233043cb6c3fc))
* **models:** allow partial OpenRouterPricing in storage ([e2042ba](https://github.com/marvinbarretto/jimbo-dashboard/commit/e2042ba34b7ad201ca4a81559a6e31b22a905a53))

### [0.0.31](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.30...v0.0.31) (2026-05-06)


### Features

* **theming:** cascade primary-nav accent as --section-accent ([e37d8f4](https://github.com/marvinbarretto/jimbo-dashboard/commit/e37d8f4df699122d1b6a58e5593067bf03c5da19))


### Bug Fixes

* **ui-tab-bar:** escape backticks in styles comment ([50627b5](https://github.com/marvinbarretto/jimbo-dashboard/commit/50627b58b5c4a32f124459c5d82d603d2b0655e6))

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
