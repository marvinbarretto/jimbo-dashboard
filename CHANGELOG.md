# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [0.0.172](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.171...v0.0.172) (2026-08-12)


### Features

* **exercise:** session card and quick-add go mobile-first, one component ([85c5822](https://github.com/marvinbarretto/jimbo-dashboard/commit/85c582290fb1c595636b566358b9edd0a05dcedd))
* **mail:** poll-runs page — kipper's hourly Gmail sweeps ([3724b6e](https://github.com/marvinbarretto/jimbo-dashboard/commit/3724b6eceaa32a9dfa2a2f2acc419d1363bc239a))
* **mobile:** reuse /m tab components across bottom-nav switches ([191e241](https://github.com/marvinbarretto/jimbo-dashboard/commit/191e241e4bbd92d3e5b93a281c052a481bcc5fa5))
* **mobile:** usuals — the frequent cluster as one-tap log chips ([28182b0](https://github.com/marvinbarretto/jimbo-dashboard/commit/28182b096e92c6a671bd8d67a00c7b9693cd2512))
* **nutrition:** usuals quick-add chips on desktop, shared with the phone shell ([3a07e8e](https://github.com/marvinbarretto/jimbo-dashboard/commit/3a07e8ea5c1186861183dd607b78fef2c18c866f))


### Bug Fixes

* **mobile:** stale-session banner responds to the tap, not the reload ([eff3d80](https://github.com/marvinbarretto/jimbo-dashboard/commit/eff3d80e97b6d45f7dc898c6279dba481916df54))


### Performance Improvements

* **mobile:** defer train 180-day history until a session needs it ([6b82405](https://github.com/marvinbarretto/jimbo-dashboard/commit/6b824055cc004e0fcd4a46741766a61a8717adac))
* **mobile:** train prefills ride the slim /sessions/history payload ([209c1d7](https://github.com/marvinbarretto/jimbo-dashboard/commit/209c1d7da8a4541306b769caf2e6b4c9342da144))

### [0.0.171](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.170...v0.0.171) (2026-08-10)


### Bug Fixes

* **mobile:** today-tab review — render v2 briefings, independent gates, live strips ([ae26f28](https://github.com/marvinbarretto/jimbo-dashboard/commit/ae26f2878c4bcdc47b5c9b3cec142deb81b2c5f5))

### [0.0.170](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.169...v0.0.170) (2026-08-10)


### Features

* **mobile:** today tab, week strips, gym demoted — phases 5–7 ([f4b3e37](https://github.com/marvinbarretto/jimbo-dashboard/commit/f4b3e374a2c6d13901ddcdf400e7a8525bc6daae))

### [0.0.169](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.168...v0.0.169) (2026-08-10)


### Features

* **pwa:** service worker — offline shell, check-on-resume updates ([abf1f67](https://github.com/marvinbarretto/jimbo-dashboard/commit/abf1f674b5de0d444df520880435b9c84083d515))

### [0.0.168](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.167...v0.0.168) (2026-08-10)


### Bug Fixes

* **mobile:** train-tab review — resource errors, races, day-cutover, stale sessions ([435fd52](https://github.com/marvinbarretto/jimbo-dashboard/commit/435fd52b07c0ea2702b2d7c87c7bfc5c088077e7))

### [0.0.167](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.166...v0.0.167) (2026-08-10)


### Features

* **auth:** accept an X-API-Key from the native shell ([c80bcc7](https://github.com/marvinbarretto/jimbo-dashboard/commit/c80bcc7f028188d0c56880f2e89edabb17fd9e19))
* **mobile:** nutrition day ledger in the Log tab ([542dac1](https://github.com/marvinbarretto/jimbo-dashboard/commit/542dac12c90eba17a7055b565dea78e8522fb419))
* **mobile:** phone shell skeleton at /m ([e9559e8](https://github.com/marvinbarretto/jimbo-dashboard/commit/e9559e868979b594e0dff4de7deb2c406b293a09))
* **mobile:** train tab — live gym session with optimistic set repeat ([393913a](https://github.com/marvinbarretto/jimbo-dashboard/commit/393913af3997124fc9f465884bd9d4d91e6e74eb))


### Bug Fixes

* **mobile:** review findings — day-key semantics, bootstrap guard, shared writers ([f7a77db](https://github.com/marvinbarretto/jimbo-dashboard/commit/f7a77db3c0f84e037125860bf7fb4b4e30bcc67f))
* **mobile:** safe-area insets and first-paint shell mode ([c1f8fa5](https://github.com/marvinbarretto/jimbo-dashboard/commit/c1f8fa5a776777dc872b705cd26c313a31a0d0fc))


### Code Refactoring

* **shell:** layout routes — router picks the chrome, root goes bare ([53af9d7](https://github.com/marvinbarretto/jimbo-dashboard/commit/53af9d7517cd263ecca171d5e4fd23d51324417b))

### [0.0.166](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.165...v0.0.166) (2026-08-07)


### Features

* **projects:** show sync provenance, and flag an overdue sweep ([47f32fa](https://github.com/marvinbarretto/jimbo-dashboard/commit/47f32fa1984f3874ab33de5560ac630d67897c26))


### Code Refactoring

* **manifest-sync:** move monitoring into the shared hc-run wrapper ([0ea0ad1](https://github.com/marvinbarretto/jimbo-dashboard/commit/0ea0ad164c5ff158ddac70ca8411503cf887939e))

### [0.0.165](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.164...v0.0.165) (2026-08-07)


### Bug Fixes

* **manifest-sync:** resolve node under launchd, and fail out loud ([f606677](https://github.com/marvinbarretto/jimbo-dashboard/commit/f6066771cc8f367f8a4c38e28c9d866da9e05ccd))

### [0.0.164](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.163...v0.0.164) (2026-08-07)


### Features

* **evening:** a reflection page that never asks ([623380b](https://github.com/marvinbarretto/jimbo-dashboard/commit/623380b52cd43dbd600b1a76ad92e132e5d69c7b))
* **projects:** make personas individually editable ([299cdd5](https://github.com/marvinbarretto/jimbo-dashboard/commit/299cdd5649d6f9b029afb3a62dff2aa961af94c9))


### Bug Fixes

* **evening:** let the saved indicator expire ([ad3a9c9](https://github.com/marvinbarretto/jimbo-dashboard/commit/ad3a9c9b300cce94ce6e6c282bb6d3e8f208e651))

### [0.0.163](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.162...v0.0.163) (2026-08-07)


### Features

* **picture:** catalogue the 20 interrogate modes ([4cedbcf](https://github.com/marvinbarretto/jimbo-dashboard/commit/4cedbcf8aec97f20207ecf94209fce588fc2ff68))


### Bug Fixes

* **ui-dropdown:** stop the panel being clipped inside a scrolling ancestor ([451881d](https://github.com/marvinbarretto/jimbo-dashboard/commit/451881d7f313406a2e527d529b4b07986106603d))
* **vault:** don't require a success criterion where a project has none ([1d3830c](https://github.com/marvinbarretto/jimbo-dashboard/commit/1d3830c4479faa0fc6e830144f235c3091d1a092))

### [0.0.162](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.161...v0.0.162) (2026-08-06)


### Features

* **projects:** make loose items adoptable from the project page ([97836a2](https://github.com/marvinbarretto/jimbo-dashboard/commit/97836a216e5215418fdca65c86430368e58ec8fd)), closes [#3613](https://github.com/marvinbarretto/jimbo-dashboard/issues/3613) [#3586](https://github.com/marvinbarretto/jimbo-dashboard/issues/3586)

### [0.0.161](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.160...v0.0.161) (2026-08-06)


### Features

* **hermes:** show the answer rate on the runs table ([639f243](https://github.com/marvinbarretto/jimbo-dashboard/commit/639f243e4d07e99bdaba56f0c1913001319eabe1))
* **vault:** make the item detail answer "why" at a glance ([b241cd2](https://github.com/marvinbarretto/jimbo-dashboard/commit/b241cd2036eaa2d1ff12b2310fbca9e7ce4cdc65))
* **vault:** surface the intake exam on the item detail ([b2ccee9](https://github.com/marvinbarretto/jimbo-dashboard/commit/b2ccee9d143c0a94a931cd04696364af254534eb))

### [0.0.160](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.159...v0.0.160) (2026-08-06)


### Features

* **mail:** audit card on the expanded row — who, when, why, where it landed ([5301cd4](https://github.com/marvinbarretto/jimbo-dashboard/commit/5301cd483b1bdae7460edfb386afa3ae87922297)), closes [#4220](https://github.com/marvinbarretto/jimbo-dashboard/issues/4220)
* **mail:** gate runs page — audit every decision with its reason ([a9f8edb](https://github.com/marvinbarretto/jimbo-dashboard/commit/a9f8edbfab8381dbfceff7beff26df19bbebe7e8))
* **mail:** junk senders page, actor column, correct verdict rendering ([c03a13d](https://github.com/marvinbarretto/jimbo-dashboard/commit/c03a13dd68a8d3669fdf55a2af8fe9781a4ab02d))
* **runs:** let the expanded decisions breathe ([0b7ff6c](https://github.com/marvinbarretto/jimbo-dashboard/commit/0b7ff6c1dc8a8bb0cd2009c15ce226fb384b55bf)), closes [#c47ac4](https://github.com/marvinbarretto/jimbo-dashboard/issues/c47ac4)
* **runs:** spell out what "filed" actually produced ([991082b](https://github.com/marvinbarretto/jimbo-dashboard/commit/991082bef0f64a1ee1df0dfe0c69549afdb0278e)), closes [#4211](https://github.com/marvinbarretto/jimbo-dashboard/issues/4211) [#4210](https://github.com/marvinbarretto/jimbo-dashboard/issues/4210)
* **vault:** primary resolve + reassign actions on the detail page ([e583a72](https://github.com/marvinbarretto/jimbo-dashboard/commit/e583a72d7d0a31d4680d9726d638556f7e181de8)), closes [#v3](https://github.com/marvinbarretto/jimbo-dashboard/issues/v3)


### Code Refactoring

* **mail:** rebuild senders on ui-lab primitives, add mail sub-tabs ([86b2fa4](https://github.com/marvinbarretto/jimbo-dashboard/commit/86b2fa48078b8f96be9b5a39cb51fbc8a4555fae))

### [0.0.159](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.158...v0.0.159) (2026-08-05)


### Features

* **journal:** tick-off checks on the day page ([21eb5c8](https://github.com/marvinbarretto/jimbo-dashboard/commit/21eb5c8296e89d44fefc02a5279061744c88cba2))
* **vault:** drive item types from the API vocabulary ([21dcce5](https://github.com/marvinbarretto/jimbo-dashboard/commit/21dcce5e8bdd046c6ccc7dd84f471b2f5fa5e563))


### Performance Improvements

* **vault:** two-phase board load + single-item fast path for detail deep links ([6d44fc6](https://github.com/marvinbarretto/jimbo-dashboard/commit/6d44fc6a03ff214397d96848ac05650cf0e74e80))

### [0.0.158](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.157...v0.0.158) (2026-08-04)


### Features

* **nutrition:** rebuild the scan confirm screen around what a portion costs ([#14](https://github.com/marvinbarretto/jimbo-dashboard/issues/14)) ([6beaf7b](https://github.com/marvinbarretto/jimbo-dashboard/commit/6beaf7b053ea19a9fd67d5806258f361cdfacf8d)), closes [jimbo-api#22](https://github.com/marvinbarretto/jimbo-api/issues/22)


### Code Refactoring

* **tracker:** consolidate page controllers and route/shell plumbing ([401cd04](https://github.com/marvinbarretto/jimbo-dashboard/commit/401cd04f49a9cbbd1d5cad65e81aab0f0b390968)), closes [#12](https://github.com/marvinbarretto/jimbo-dashboard/issues/12)

### [0.0.157](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.156...v0.0.157) (2026-08-04)


### Features

* **briefing:** render v3 butler sections — receipts, still-open ledger, question evidence ([4963c74](https://github.com/marvinbarretto/jimbo-dashboard/commit/4963c747f2b5f69ed6fe52b9e043ae50e4f55787))
* **nutrition:** barcode scan page for phone-first food logging ([#13](https://github.com/marvinbarretto/jimbo-dashboard/issues/13)) ([75cbb00](https://github.com/marvinbarretto/jimbo-dashboard/commit/75cbb00c021fe7748c8de819a72887975fd9ec43))


### Bug Fixes

* **journal:** stop the day-bundle refetch loop ([e6654ea](https://github.com/marvinbarretto/jimbo-dashboard/commit/e6654ea2601740409c1a2bf50f4cc6bad9d95cf3))

### [0.0.156](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.155...v0.0.156) (2026-07-31)


### Features

* **journal:** week and month views on the overview ([268ddc6](https://github.com/marvinbarretto/jimbo-dashboard/commit/268ddc6d119f2b6546a31887cd7fbb8b8f498437))

### [0.0.155](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.154...v0.0.155) (2026-07-31)


### Bug Fixes

* **vault:** refresh activity and header after a thread post ([506f1f2](https://github.com/marvinbarretto/jimbo-dashboard/commit/506f1f2702710f4db052e0c9d0bf366428adf8ce))


### Code Refactoring

* **styles:** single source of truth for typography ([d16b486](https://github.com/marvinbarretto/jimbo-dashboard/commit/d16b486285c5259a9b46d15608be218d3aa81eb7))

### [0.0.154](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.153...v0.0.154) (2026-07-31)


### Features

* **briefing:** third press of ▲/▼ clears the verdict ([c6fce42](https://github.com/marvinbarretto/jimbo-dashboard/commit/c6fce423c2139c09d86b6368720218d5dc96e13c))
* **fleet:** right-now and needs-attention sections on the fleet board ([b9ba149](https://github.com/marvinbarretto/jimbo-dashboard/commit/b9ba149eedeb0cc3cb1625f985df9923fb00a804))


### Bug Fixes

* **briefing:** don't let a hit inherit the miss's reason note ([9678c18](https://github.com/marvinbarretto/jimbo-dashboard/commit/9678c18fd7461e6abf13f7066275c079f2c68f48))
* **briefing:** stop the miss dialog full-page-reloading and losing the miss ([0ba8a8a](https://github.com/marvinbarretto/jimbo-dashboard/commit/0ba8a8ab2c8329d8e8551595ee9cc7007f7f0531))


### Code Refactoring

* **vault-items:** drop parent and projects from the Links panel ([21e922c](https://github.com/marvinbarretto/jimbo-dashboard/commit/21e922c8aa26494f2808b998de57404e726ba633))

### [0.0.153](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.152...v0.0.153) (2026-07-31)


### Features

* **kanban:** cap rendered cards per column, with indexed card lookups ([09dc439](https://github.com/marvinbarretto/jimbo-dashboard/commit/09dc439dac216da99f8a16d0147b28d97caa42d2))


### Bug Fixes

* **actors:** give jeffrey a colour and every actor a fallback ([8a5b550](https://github.com/marvinbarretto/jimbo-dashboard/commit/8a5b55028b5ba446cd9d71d8e64352676f2fac4e))
* **fleet:** an unpriced model no longer takes the whole fleet page down ([e180abb](https://github.com/marvinbarretto/jimbo-dashboard/commit/e180abbc8cb6d51e673146309f94e69a8589e620))

### [0.0.152](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.151...v0.0.152) (2026-07-30)


### Features

* **shell:** compact mobile header — icon commands overlaid on brand row ([45dbfd8](https://github.com/marvinbarretto/jimbo-dashboard/commit/45dbfd8480c9c597edfd9474d92aacd1fca1cf08))
* **tracker:** sheet editing on mobile — wireframe design extracted to real components ([20e9887](https://github.com/marvinbarretto/jimbo-dashboard/commit/20e988709cbe39dcaf65ddbd2cae61eef572df1f))

### [0.0.151](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.150...v0.0.151) (2026-07-30)


### Features

* **tracker:** mobile-first two-line ledger row ([b53b72c](https://github.com/marvinbarretto/jimbo-dashboard/commit/b53b72c759b162374dfd1e533789af2a73e78552))
* **ui-lab:** mobile drawer nav for the component list ([1460173](https://github.com/marvinbarretto/jimbo-dashboard/commit/1460173a386fe61ab635880cf73d8193417f0b9c))
* **ui-lab:** nutrition mobile wireframe — 3 read-state row variants ([fcad781](https://github.com/marvinbarretto/jimbo-dashboard/commit/fcad781c7d88c2dbedebc99fa9948d10f9fc6039))
* **ui-lab:** nutrition wireframe round 2 — sheet editing + quick add ([03cd9fe](https://github.com/marvinbarretto/jimbo-dashboard/commit/03cd9fefdc9a6a3de8688f63bb4232501ed4aa46))


### Bug Fixes

* **nav:** stop tab bar forcing horizontal viewport overflow on mobile ([7d90927](https://github.com/marvinbarretto/jimbo-dashboard/commit/7d9092706bed266de6dead0b401ac14979083cde))
* **tracker:** stable time cell across read/edit on mobile ([a6e12d0](https://github.com/marvinbarretto/jimbo-dashboard/commit/a6e12d0d1c3b394f3e20c11d1330013d374e9949))
* **ui-lab:** nutrition wireframe sheet width matches frame clamp ([782f525](https://github.com/marvinbarretto/jimbo-dashboard/commit/782f525655f547c7cc26334e20478908ba1af2b7))

### [0.0.150](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.149...v0.0.150) (2026-07-29)


### Bug Fixes

* **lifecycle:** close CDK dialog/mention state on destroy, harden polling ([594a612](https://github.com/marvinbarretto/jimbo-dashboard/commit/594a6123f0ee1e292067b4cba2219b1929a7f8be))

### [0.0.149](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.148...v0.0.149) (2026-07-29)


### Bug Fixes

* **mentions:** close active mention on directive destroy, add ui-lab isolation ([27976e9](https://github.com/marvinbarretto/jimbo-dashboard/commit/27976e946da06caf592d3b4d3a06db377850fec9))

### [0.0.148](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.147...v0.0.148) (2026-07-29)


### Bug Fixes

* **ui:** compose UiInlineEdit for checklist row editing, not a parallel impl ([6ccde3e](https://github.com/marvinbarretto/jimbo-dashboard/commit/6ccde3e62febf00d19234f84e84aa9a64dd50a44))

### [0.0.147](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.146...v0.0.147) (2026-07-29)


### Bug Fixes

* **projects:** harden checklist/bullet-field chain, add diagnostics ([7fdae2b](https://github.com/marvinbarretto/jimbo-dashboard/commit/7fdae2b5ee252b403f45c3c07dcaaa23109bd729))

### [0.0.146](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.145...v0.0.146) (2026-07-29)


### Features

* **projects:** editable bullet-list brief fields, piloted on success criteria ([73dd2f0](https://github.com/marvinbarretto/jimbo-dashboard/commit/73dd2f07a4b3288f51005b2d8b561dee5604846e))

### [0.0.145](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.144...v0.0.145) (2026-07-29)


### Features

* **projects:** differentiate note/task chips, fix item table truncation ([d02a0dc](https://github.com/marvinbarretto/jimbo-dashboard/commit/d02a0dc3e73a3f5e9fa38833773877e5e2597ffe))

### [0.0.144](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.143...v0.0.144) (2026-07-29)


### Features

* **projects:** self-contained operating-context section, split out resources ([b303e58](https://github.com/marvinbarretto/jimbo-dashboard/commit/b303e58013cbfdac37effaa850343a5ce5305735))

### [0.0.143](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.142...v0.0.143) (2026-07-29)


### Features

* **projects:** surface overdue/flagged items, reorder project page for monitoring ([09438b7](https://github.com/marvinbarretto/jimbo-dashboard/commit/09438b76bfa27454ef19b35a5f9b9f21ffccaea4))

### [0.0.142](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.141...v0.0.142) (2026-07-29)


### Features

* **constraints:** scope constraints to a project, embed on project page ([ad537a3](https://github.com/marvinbarretto/jimbo-dashboard/commit/ad537a389c9d974751040338008f03264788b016))

### [0.0.141](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.140...v0.0.141) (2026-07-28)


### Features

* **constraints:** scratchpad of agent rules you can switch on and off ([99824e1](https://github.com/marvinbarretto/jimbo-dashboard/commit/99824e1f4baa5b26682918a86af02507fa9351e6))
* **hermes-runs:** surface tokens, billing mode and per-job verdicts ([18cbfea](https://github.com/marvinbarretto/jimbo-dashboard/commit/18cbfeae6bb5c65a9d90bffdeef49dba6163e6a7))
* **skills:** route the skills page and show dispatch reality ([f5dd30d](https://github.com/marvinbarretto/jimbo-dashboard/commit/f5dd30da19c622119367f455683bce45b1577dab))

### [0.0.140](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.139...v0.0.140) (2026-07-24)


### Features

* **briefing:** bucket-mirror panel on briefing detail ([b750c8a](https://github.com/marvinbarretto/jimbo-dashboard/commit/b750c8ab48e4b5dfb3a0038969494aa9ffbec548))
* **briefing:** render Body life-bucket metrics in the mirror panel ([a862e3b](https://github.com/marvinbarretto/jimbo-dashboard/commit/a862e3b12dc84e15dae0057367bb38167df86f46))
* **briefing:** render vault-linked suggested_blocks as block-cards ([83ea534](https://github.com/marvinbarretto/jimbo-dashboard/commit/83ea5343c584656978913829e59a78aafe690e68))


### Bug Fixes

* **briefing:** drop "yet" from the mirror's not-tracked line ([f88e22a](https://github.com/marvinbarretto/jimbo-dashboard/commit/f88e22af4aee44eb7afdbe299f47777c6ebd0a44))

### [0.0.139](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.138...v0.0.139) (2026-07-24)


### Features

* **briefing:** add watch-queue panel to briefing detail side column ([2cf5c34](https://github.com/marvinbarretto/jimbo-dashboard/commit/2cf5c345e3d1059915dcf5dcf26289a6fdaed27d))
* **briefing:** answer cap-blocked open questions inline via file-on-answer ([5511e22](https://github.com/marvinbarretto/jimbo-dashboard/commit/5511e22d59fe49fe4bb3d3ad43a1b0d53da7e7a3))
* **briefing:** drag calendar events today↔tomorrow to defer ([1b1036f](https://github.com/marvinbarretto/jimbo-dashboard/commit/1b1036fbcf25f9847dca72d93222f8a9a1af1f7b))
* **briefing:** pencil suggested_blocks onto the Suggestions calendar ([c78a58f](https://github.com/marvinbarretto/jimbo-dashboard/commit/c78a58f162c10269d2f9dec5af5dee5dccf79524))
* **briefing:** per-actor activity swimlanes on briefing detail ([55ef679](https://github.com/marvinbarretto/jimbo-dashboard/commit/55ef679a5a7cd86ec407d677814b6f8bb602590d))


### Bug Fixes

* **briefing:** type onDrop for CDK's widened drop-list data ([49c9e23](https://github.com/marvinbarretto/jimbo-dashboard/commit/49c9e23fcabbf3206fff785698a7266b31e2b015))


### Code Refactoring

* **briefing:** extract + test actor-activity lane assembly ([6544a9c](https://github.com/marvinbarretto/jimbo-dashboard/commit/6544a9c110888a8df3a7611ce3008b546799e66a))

### [0.0.138](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.137...v0.0.138) (2026-07-23)


### Features

* **journal:** pace + last-week comparison on protein meters ([92307d6](https://github.com/marvinbarretto/jimbo-dashboard/commit/92307d6e9d674f084a7b9d0967d9b286b3ba1ac1))

### [0.0.137](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.136...v0.0.137) (2026-07-23)


### Features

* **vault:** stacked-band item detail, retire old shell + tabbed layout ([516476c](https://github.com/marvinbarretto/jimbo-dashboard/commit/516476c12416f0c26d2f1fb76ac93ddf25c644d8)), closes [#10](https://github.com/marvinbarretto/jimbo-dashboard/issues/10)


### Bug Fixes

* **vault:** chat origin, parent title, and comment-question attention ([9834c27](https://github.com/marvinbarretto/jimbo-dashboard/commit/9834c2727b1122723558605fb87b67f5c6cf8b77))

### [0.0.136](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.135...v0.0.136) (2026-07-22)


### Features

* **briefing:** board refetches when the tab regains visibility ([845b663](https://github.com/marvinbarretto/jimbo-dashboard/commit/845b66372509465ee37624ea0544fcf8745d41dd))

### [0.0.135](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.134...v0.0.135) (2026-07-22)


### Features

* **briefing:** pencilled block size as 🍅 per pomodoro ([7915e8e](https://github.com/marvinbarretto/jimbo-dashboard/commit/7915e8eeb817c2b2f4f0dcef9eeb98ea30a04888))

### [0.0.134](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.133...v0.0.134) (2026-07-22)


### Features

* **briefing:** calendar board sticks below the header while the report scrolls ([af09733](https://github.com/marvinbarretto/jimbo-dashboard/commit/af09733cb7192d273245161b729c8192dec6f979))

### [0.0.133](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.132...v0.0.133) (2026-07-22)


### Features

* **briefing:** vertical divider between report and calendar board ([fe60366](https://github.com/marvinbarretto/jimbo-dashboard/commit/fe60366b1b42897b66c20a1fd2a1989199e12712))

### [0.0.132](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.131...v0.0.132) (2026-07-22)


### Bug Fixes

* **briefing:** board fetches full today window so past events render dimmed ([e47e141](https://github.com/marvinbarretto/jimbo-dashboard/commit/e47e141cf1bb010be7e996b3c158cf5e4acea895))

### [0.0.131](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.130...v0.0.131) (2026-07-22)


### Bug Fixes

* **briefing:** full-width detail page; pencilled rows stack title over meta ([b97ba2e](https://github.com/marvinbarretto/jimbo-dashboard/commit/b97ba2ef1a208ccf946bf804c64bfcc7d63a1d08))

### [0.0.130](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.129...v0.0.130) (2026-07-22)


### Features

* **briefing:** calendar board beside the report — 3 columns, today/tomorrow ([422d30f](https://github.com/marvinbarretto/jimbo-dashboard/commit/422d30fd46a10a51cf7c723606ac4d8d37516b08))

### [0.0.129](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.128...v0.0.129) (2026-07-22)

### [0.0.128](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.127...v0.0.128) (2026-07-22)


### Features

* **briefing:** wireframe iteration — 3 calendar columns, today/tomorrow stacked, defer parked ([7115c46](https://github.com/marvinbarretto/jimbo-dashboard/commit/7115c46496e5498ccfd8d76e22d09df71960b2d0))

### [0.0.127](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.126...v0.0.127) (2026-07-22)


### Features

* **briefing:** miss requires a one-tap reason chip; add day-board rail wireframes ([9f99aa3](https://github.com/marvinbarretto/jimbo-dashboard/commit/9f99aa33c72055a490ad145493f3dad412ff2547))

### [0.0.126](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.125...v0.0.126) (2026-07-22)


### Features

* **briefing:** miss arrow opens a note dialog so feedback carries a why ([a2f4530](https://github.com/marvinbarretto/jimbo-dashboard/commit/a2f45305f3845f4a3d23326c6ed9fc7fe45af37a))

### [0.0.125](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.124...v0.0.125) (2026-07-22)


### Features

* **journal:** full-width overview page, richer day metrics ([8a14fa6](https://github.com/marvinbarretto/jimbo-dashboard/commit/8a14fa65bad42a8156264a22e8294c5486d32cf0))
* **journal:** tighten day-summary viz with dot meters and gauges ([146bce8](https://github.com/marvinbarretto/jimbo-dashboard/commit/146bce85ed07f6392fd0c6cb2992f5eccdb8afc4))
* **shared:** merge period title and date picker into one stepper ([ea2bcd9](https://github.com/marvinbarretto/jimbo-dashboard/commit/ea2bcd9a30e7907be8311133f5e187a5800be7c4))

### [0.0.124](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.123...v0.0.124) (2026-07-22)


### Features

* **pomo:** remove redundant pomo-reports page ([3f71710](https://github.com/marvinbarretto/jimbo-dashboard/commit/3f717104818adcc1bea57aae6ef49e5d68ca8cd7))
* **shared:** standardize page-container layout with UiPage primitive ([1e0cd2d](https://github.com/marvinbarretto/jimbo-dashboard/commit/1e0cd2d7e5910d806b9b52871446558131280677))


### Bug Fixes

* **answer-rail:** bind formGroup so ngSubmit fires instead of native reload ([b3773d7](https://github.com/marvinbarretto/jimbo-dashboard/commit/b3773d7c6e51a542b090a4bca785b1ddbe21d9bd))
* **ui-prose:** render markdown instead of literal text ([017b30d](https://github.com/marvinbarretto/jimbo-dashboard/commit/017b30d446375a702674c0ff32419353d810b49e))


### Code Refactoring

* **shared:** migrate question/clarification cards onto answer-rail ([00c9d03](https://github.com/marvinbarretto/jimbo-dashboard/commit/00c9d034e54a9ae7bb3f5a4593a98d3eb41d9176))

### [0.0.123](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.122...v0.0.123) (2026-07-22)


### Features

* **briefing:** living report — inline answers, per-item hit/miss feedback ([14cb400](https://github.com/marvinbarretto/jimbo-dashboard/commit/14cb4004e1591eb07fb3bd9ee28a8e31ce269a30))
* **briefing:** v2 report reading surface + ui-lab section ([1dcf67a](https://github.com/marvinbarretto/jimbo-dashboard/commit/1dcf67a7baead9b5864f9fdff4347c1a914af7ac))
* **shared:** global report vocabulary — the terminal broadsheet ([338ab55](https://github.com/marvinbarretto/jimbo-dashboard/commit/338ab55cd53b3f079feabbc1a0cc4a44e3736858))
* **ui-lab:** clarification-prompt section — all states frozen for tuning ([b2a7137](https://github.com/marvinbarretto/jimbo-dashboard/commit/b2a713743bd7de33703961f8c1976b43c9fac8f6))


### Code Refactoring

* narrow VAULT-COMMANDS-001 instead of working around it ([2bedd4a](https://github.com/marvinbarretto/jimbo-dashboard/commit/2bedd4a4468259bf2093885a8826c7932911d57f))

### [0.0.122](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.121...v0.0.122) (2026-07-22)


### Features

* **planner:** undo unscheduling, and stop locked cards faking a drag ([2814c56](https://github.com/marvinbarretto/jimbo-dashboard/commit/2814c565b32e77d784c083691cb5d657f93ce9c5))


### Code Refactoring

* **briefings:** move archive table onto UiDataTable, add nav entry ([8e9a20a](https://github.com/marvinbarretto/jimbo-dashboard/commit/8e9a20ac857230f936d7f43cba0765a2e9e4c9d5))
* **planner:** read token for the watch queue panel ([e70af38](https://github.com/marvinbarretto/jimbo-dashboard/commit/e70af38e4a3f08b329cc57fffea97d783c605433))

### [0.0.121](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.120...v0.0.121) (2026-07-22)


### Features

* **planner:** make drag and resize affordances visible ([6f91a12](https://github.com/marvinbarretto/jimbo-dashboard/commit/6f91a12d8612625d2d6195a135f4bab821054037))


### Bug Fixes

* **planner:** schedule on :00/:30 half-hour slots ([b5b91e8](https://github.com/marvinbarretto/jimbo-dashboard/commit/b5b91e8438e539df62cf10124b22ee4073b8c04c))
* **projects:** stop the :id redirect shadowing :id/edit ([d416494](https://github.com/marvinbarretto/jimbo-dashboard/commit/d41649486691bd758ef35549a49f1e5ac42b5721))


### Code Refactoring

* **shell:** fold the topbar commands into the nav row ([8b64719](https://github.com/marvinbarretto/jimbo-dashboard/commit/8b647198fbb054090a3e7a12920b942e3ca094ba))

### [0.0.120](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.119...v0.0.120) (2026-07-21)


### Features

* **exercise:** show what each exercise works, at entry time ([fc937f8](https://github.com/marvinbarretto/jimbo-dashboard/commit/fc937f80500b7219f9ce5a6cda535c951e191bf0))
* **journal:** per-slice colours on the work-page donut ([9deaf4c](https://github.com/marvinbarretto/jimbo-dashboard/commit/9deaf4c594bfcbf5712ac9607d6a5f3032c1c408))
* **planner:** collapsible panels, clear-unlocked, x-to-unplace blocks ([919667f](https://github.com/marvinbarretto/jimbo-dashboard/commit/919667f6b18bfb0ebdcd87f29adfcb3811366ba5))
* **planner:** watch queue panel in the sidebar ([f059e44](https://github.com/marvinbarretto/jimbo-dashboard/commit/f059e44b65f971a770e20f8f3d4a0b1f35b924f4))
* **shared:** optional remove action on item-header and block-card ([8915116](https://github.com/marvinbarretto/jimbo-dashboard/commit/8915116e5810478d86de7cb1b3fb68797a46b326))


### Bug Fixes

* **planner:** only style real links as clickable in the watch queue ([89abf68](https://github.com/marvinbarretto/jimbo-dashboard/commit/89abf685b98b27c94c929b5ad5d818ab88b16d72))

### [0.0.119](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.118...v0.0.119) (2026-07-21)


### Features

* **grooming:** surface pump learning-loop health on the board ([a499aa8](https://github.com/marvinbarretto/jimbo-dashboard/commit/a499aa871f1878f13c72c5253cde41e50d56144e))
* **journal:** unified period header and real phone week/month rollups ([eb8ad79](https://github.com/marvinbarretto/jimbo-dashboard/commit/eb8ad7927712b123584f076c2b5c0e846d104723))
* **nav:** three-tier IA — 5 sections, section tab bars, journal landing ([c13852f](https://github.com/marvinbarretto/jimbo-dashboard/commit/c13852f983df260cecef0485e1d4a8af9de99db5))


### Bug Fixes

* **grooming:** read the real uningested count, not a page size ([c266bd0](https://github.com/marvinbarretto/jimbo-dashboard/commit/c266bd06db935e4117ee6594845b7030709e4fcb))

### [0.0.118](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.117...v0.0.118) (2026-07-21)


### Features

* **checkins:** mood/energy check-in trend page, pomo-retro capture point ([dde232f](https://github.com/marvinbarretto/jimbo-dashboard/commit/dde232f3616707221446dce66567b25937a9e90c))
* **checkins:** word-anchored score picker, energy narrowed to 3 states ([90355f1](https://github.com/marvinbarretto/jimbo-dashboard/commit/90355f159ff85e8af53aea843b5c3ce3923c168a))
* **journal:** domain-first IA — Overview/Work/Body/Jimbo/Phone with per-domain periods ([c6664f1](https://github.com/marvinbarretto/jimbo-dashboard/commit/c6664f18858ecebf6b5d68501b8ed110767b8df0))

### [0.0.117](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.116...v0.0.117) (2026-07-21)


### Bug Fixes

* **journal:** day tab selection sticks when returning to Work ([235e999](https://github.com/marvinbarretto/jimbo-dashboard/commit/235e99995736056dd9d90f8b57a24387701a7b9b))

### [0.0.116](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.115...v0.0.116) (2026-07-21)


### Features

* **journal:** tabbed day page, all-evidence work charts, phone pins on timeline ([caf4f2d](https://github.com/marvinbarretto/jimbo-dashboard/commit/caf4f2d6fa31719d0bcefc952603fa20e667bf77))

### [0.0.115](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.114...v0.0.115) (2026-07-20)


### Bug Fixes

* **exercise:** fetch full catalogue (limit=300) now the API cap allows it ([7f583e8](https://github.com/marvinbarretto/jimbo-dashboard/commit/7f583e8b5ebb46a66c3ffe7238f29a13fb3eb142))
* **tracker:** oversize inline number fields for easier data entry ([eed625c](https://github.com/marvinbarretto/jimbo-dashboard/commit/eed625cd0f037487a66eea93d3398c6409f78415))

### [0.0.114](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.113...v0.0.114) (2026-07-20)


### Features

* **journal:** day page loads from the /api/journal/day bundle ([dc469d9](https://github.com/marvinbarretto/jimbo-dashboard/commit/dc469d9fbf96efdce35adfbb685bf38b1a48b90a))

### [0.0.113](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.112...v0.0.113) (2026-07-20)


### Bug Fixes

* **exercise:** get-or-create by name for ref-less set/cardio drafts ([4ca3bd8](https://github.com/marvinbarretto/jimbo-dashboard/commit/4ca3bd86c925efc02f144d19ae5fd00eee972ac4))
* **journal:** correct data windows, races, and desk-time attribution ([43ba830](https://github.com/marvinbarretto/jimbo-dashboard/commit/43ba830a3d9fec6398e04f3eb658a8faacfc43c9))

### [0.0.112](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.111...v0.0.112) (2026-07-20)


### Features

* **exercise:** capture effort (RPE + pre-energy) and show last-time progression hints ([c550447](https://github.com/marvinbarretto/jimbo-dashboard/commit/c550447f6cdb3a3f1d6ca631d4606154c73acda8))

### [0.0.111](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.110...v0.0.111) (2026-07-20)


### Features

* **journal:** measure work from all evidence, not just pomodoros ([7f2b576](https://github.com/marvinbarretto/jimbo-dashboard/commit/7f2b576256455bc43b057509c41c2fc5c41eed23))

### [0.0.110](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.109...v0.0.110) (2026-07-20)


### Features

* **journal:** honest running sessions — last-seen ends + heartbeat bursts ([e43c9a5](https://github.com/marvinbarretto/jimbo-dashboard/commit/e43c9a5ec8bfc938a3dbd0a17dc93b71ef83adf8))


### Bug Fixes

* **journal:** stop 4x over-counting windowed phone telemetry ([a7c05a2](https://github.com/marvinbarretto/jimbo-dashboard/commit/a7c05a2a37bdf0b55395318add6b5b9c82687173))

### [0.0.109](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.108...v0.0.109) (2026-07-20)


### Features

* **journal:** add retro timeline section to the day page ([b945dad](https://github.com/marvinbarretto/jimbo-dashboard/commit/b945dada8f04c0693d1d4c0d694333f35ae9b4a2))
* **journal:** surface code sessions on the day page ([63f3335](https://github.com/marvinbarretto/jimbo-dashboard/commit/63f333558682357091e407d9757ffd1cb8f58805))
* **planner:** add week planner spike with FullCalendar, vault-item queue, lock/randomize ([9dfa8f6](https://github.com/marvinbarretto/jimbo-dashboard/commit/9dfa8f6ba48dff94d5b2f97a211292b4f328456f))
* **planner:** extract shared item-header, wire into block-card and vault-card ([4a09088](https://github.com/marvinbarretto/jimbo-dashboard/commit/4a09088bac8ee6d2d3adb78c84015c9cee39aa9d))
* **planner:** sync placements to real Jimbo Suggestions calendar ([dc9e6e6](https://github.com/marvinbarretto/jimbo-dashboard/commit/dc9e6e6ab24ce0ce7b9687ecdfb1fdfd7692fdb3))
* **vault-items:** add estimated_blocks effort estimate ([fdb784f](https://github.com/marvinbarretto/jimbo-dashboard/commit/fdb784f4b9ae5f035b4af1cf20bafb9cbae180e2))


### Code Refactoring

* **journal:** drop dead activities and sleep/heart-rate paths ([e26e181](https://github.com/marvinbarretto/jimbo-dashboard/commit/e26e1811fb7b08a1f9c796424579dc7ba4586b22))

### [0.0.108](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.107...v0.0.108) (2026-07-11)


### Features

* **vault-items:** split detail Body by type — task vs note/bookmark ([00b6622](https://github.com/marvinbarretto/jimbo-dashboard/commit/00b662296204b1eaf08ce867e20d94249738d92a)), closes [#3257](https://github.com/marvinbarretto/jimbo-dashboard/issues/3257)

### [0.0.107](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.106...v0.0.107) (2026-07-10)


### Features

* **notifications:** add check-in schedule settings page ([8639570](https://github.com/marvinbarretto/jimbo-dashboard/commit/8639570a8a832b8fcc8f76b1c0def1318b9e4d54))

### [0.0.106](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.105...v0.0.106) (2026-07-10)


### Features

* **entity-registry:** standalone viewer page at /entities ([a356783](https://github.com/marvinbarretto/jimbo-dashboard/commit/a356783e5dd0fe72c8c340c75f075aa15d90f838))
* **fleet:** add daily fleet activity report page ([8241d5e](https://github.com/marvinbarretto/jimbo-dashboard/commit/8241d5e9213df66048007acb6d381a7e1b61f7c1))
* **fleet:** let the daily report show today, not just finished days ([20bf3cf](https://github.com/marvinbarretto/jimbo-dashboard/commit/20bf3cf35bc8d1f929afa565fbebd7011aa24a91))
* **nav:** add Entities to the Archive nav group ([d55f772](https://github.com/marvinbarretto/jimbo-dashboard/commit/d55f77234ffe0ba38d2f899b0193e38f67f06806))
* unify identity-chip sizing on a shared sm/md/lg scale ([3c1ed66](https://github.com/marvinbarretto/jimbo-dashboard/commit/3c1ed66caee1599974e3e32e1c3e114419266e56))


### Bug Fixes

* **pomo:** reflect new epic children in progress meter without reload ([eb7d046](https://github.com/marvinbarretto/jimbo-dashboard/commit/eb7d0466877f2ade9faefcc3736b0e9560f8bfea))

### [0.0.105](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.104...v0.0.105) (2026-07-08)


### Features

* add module docs freshness contract and staleness script ([e49d478](https://github.com/marvinbarretto/jimbo-dashboard/commit/e49d478a819133a54599a1aadff2beb34fdcc3f3))
* module docs viewer with staleness badges ([75df27c](https://github.com/marvinbarretto/jimbo-dashboard/commit/75df27ce672402ee8f1a6ce9db28b659e48fb07e))


### Bug Fixes

* render markdown-body prose in sans-serif, not monospace ([4128a1b](https://github.com/marvinbarretto/jimbo-dashboard/commit/4128a1b1e0ce0a98c6b73ecb34e8d4dc0f23edf1))

### [0.0.104](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.103...v0.0.104) (2026-07-07)


### Features

* **actors:** ralph -> kipper rename, dashboard side (slice 5) ([781761a](https://github.com/marvinbarretto/jimbo-dashboard/commit/781761a03eadfef363bc8dc7a25a18bd96512040))
* **fleet:** hermes lane card — the whole fleet on one page ([b90a220](https://github.com/marvinbarretto/jimbo-dashboard/commit/b90a2207f77f61f2afdf978997fe7c809c793dab))
* **fleet:** observability board over GET /api/dispatch/stats ([e2394dd](https://github.com/marvinbarretto/jimbo-dashboard/commit/e2394dd02413d9d605f8b8154df51da1ddaa058a))
* **hermes:** fold badge — folded jobs visibly claim their dispatch twin ([4b1c670](https://github.com/marvinbarretto/jimbo-dashboard/commit/4b1c670886881abf3da77b07ecdddf3e1b9ef783))
* **journal:** per-activity breakdown + cardio stat on exercise summary ([19f5600](https://github.com/marvinbarretto/jimbo-dashboard/commit/19f56006cd0b5645eee62a629feda8862b8277f5))
* **shared:** job-chip — one visual grammar for jobs everywhere ([10288ae](https://github.com/marvinbarretto/jimbo-dashboard/commit/10288aefc3f1ee1f3f481f05809ea9f4e6b5a7b9))


### Bug Fixes

* **fleet:** render throttle cooldown and mid-task silence as healthy ([ec82c27](https://github.com/marvinbarretto/jimbo-dashboard/commit/ec82c2761a34251c5ebc58b23171bd5eca9b5e00))
* **ui-stat-card:** stretch the projected card box to fill its host ([7b2287d](https://github.com/marvinbarretto/jimbo-dashboard/commit/7b2287d8f945259deec5a6b5d53a9779b61e0ff7))

### [0.0.103](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.102...v0.0.103) (2026-07-04)


### Features

* **journal:** show 7-day rolling-median trend on week/month charts ([b418b16](https://github.com/marvinbarretto/jimbo-dashboard/commit/b418b16a3f41f8db8db7fe25664e909bc807bf98))

### [0.0.102](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.101...v0.0.102) (2026-07-04)


### Features

* **exercise,nutrition:** cardio quick-add, rolling-median trends, logical day ([e93cb4c](https://github.com/marvinbarretto/jimbo-dashboard/commit/e93cb4cc21c802f832295c37049c328aeecfec38))
* **journal:** show fueling-by-training-day chart on week page too ([4fe1a65](https://github.com/marvinbarretto/jimbo-dashboard/commit/4fe1a658e6238df362ddf43728b6e6736955cd40))
* **kanban:** epic drill-down facet, solid selected chips, denser bar ([a8f25d8](https://github.com/marvinbarretto/jimbo-dashboard/commit/a8f25d81cb9e1ad8b73790f4fa68413ec7f8c733))
* **skills:** render description column via app-ui-prose ([d71a6dd](https://github.com/marvinbarretto/jimbo-dashboard/commit/d71a6dd1c3bcfb156627248988bfbba2d7c793e8))
* **skills:** show potential + status columns on the skills page ([fa9130e](https://github.com/marvinbarretto/jimbo-dashboard/commit/fa9130ef157f4bccd4bc2be2ab7e12c439cc0c21))

### [0.0.101](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.100...v0.0.101) (2026-07-03)


### Features

* **journal:** surface fueling-by-training-day insight on month page ([33cc261](https://github.com/marvinbarretto/jimbo-dashboard/commit/33cc2615501fa160891e2cb427bbe381dbe272fa))

### [0.0.100](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.99...v0.0.100) (2026-07-03)


### Code Refactoring

* **settings:** relocate GitHub/execution settings out of Config ([ecd0603](https://github.com/marvinbarretto/jimbo-dashboard/commit/ecd0603208306e2a2ea394deb2edf5ef3eeefe7b))

### [0.0.99](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.98...v0.0.99) (2026-07-02)


### Features

* **config:** add Settings index + Automation page, auto-clear Done lane ([1ae8da0](https://github.com/marvinbarretto/jimbo-dashboard/commit/1ae8da0d7a0b211dc3d82ea36bf648d0f871766c))
* **projects:** filter + CSS hooks for the GitHub issues panel ([89b862d](https://github.com/marvinbarretto/jimbo-dashboard/commit/89b862d872a85ae47ea3654a96d0fc8af68fd154))

### [0.0.98](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.97...v0.0.98) (2026-07-02)


### Features

* **exercise:** add period-scoped day/week/month routes ([852311a](https://github.com/marvinbarretto/jimbo-dashboard/commit/852311a82275691b63aeb6e849afee908a8c9139))
* **nutrition:** add period-scoped day/week/month routes ([7facbf1](https://github.com/marvinbarretto/jimbo-dashboard/commit/7facbf1f663e356b8bc29de274e30cac01844b7c))
* **projects:** surface GitHub issues + promote-to-jimbo on project page ([cda08e4](https://github.com/marvinbarretto/jimbo-dashboard/commit/cda08e40481dfc49ddcead9bbd0c01d02bfb9754))


### Bug Fixes

* **nutrition:** backdate supplement quick-add to the viewed day ([4b17416](https://github.com/marvinbarretto/jimbo-dashboard/commit/4b174168dda002dbb13342f37f6a040472424dc7))


### Code Refactoring

* **nav:** fold actors into config sub-nav ([e06b67d](https://github.com/marvinbarretto/jimbo-dashboard/commit/e06b67dc51938108683a66c37747e8ae917abd0f))

### [0.0.97](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.96...v0.0.97) (2026-07-02)


### Features

* **ui:** adopt ui-prose for text-heavy content areas ([2dd8104](https://github.com/marvinbarretto/jimbo-dashboard/commit/2dd8104a4c0f9f426d196ff6e33fea01b1b11680))
* **ui:** adopt ui-prose in remaining text-heavy components ([36bcee2](https://github.com/marvinbarretto/jimbo-dashboard/commit/36bcee27c841a216625a0c8364ba3cdb9e0a1b1b))

### [0.0.96](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.95...v0.0.96) (2026-07-02)


### Features

* **vault:** let a human owner override the grooming-complete check ([da166ad](https://github.com/marvinbarretto/jimbo-dashboard/commit/da166adda97305cf5703e3bd3e4cbec5b0099c3a))


### Bug Fixes

* **pomo:** create epics atomically instead of create-then-link ([30e1b38](https://github.com/marvinbarretto/jimbo-dashboard/commit/30e1b38292bd1d984ddd073e2529b0f6e438a8ae))
* **pomo:** read session commits from github push telemetry, not a dropped endpoint ([ba03594](https://github.com/marvinbarretto/jimbo-dashboard/commit/ba035940c81dd3fc01004d03c9b31b500491db2c))

### [0.0.95](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.94...v0.0.95) (2026-07-02)


### Features

* **exercise:** add body-parts-worked chart to /exercise page ([c87adf6](https://github.com/marvinbarretto/jimbo-dashboard/commit/c87adf6c113fab14db7faa81989859eda1a1964b))
* **picture:** add Horizons Lab exploration + ui-prose primitive ([99bd5f6](https://github.com/marvinbarretto/jimbo-dashboard/commit/99bd5f6ea5d69fe3eb26501fb773bfa0458c2d4b))
* **picture:** add Horizons Lab static prototype gallery ([58195da](https://github.com/marvinbarretto/jimbo-dashboard/commit/58195da3280fffc6b1386a6f4108b7cfb17ee5d3))


### Bug Fixes

* **exercise:** count the sets multiplier in the day-ledger volume total ([bf3f860](https://github.com/marvinbarretto/jimbo-dashboard/commit/bf3f860b1dece4911e8eacadd11bb1e74694c43a))
* **hermes:** note that control room job configs reflect live VPS state ([dd6b49b](https://github.com/marvinbarretto/jimbo-dashboard/commit/dd6b49b638c4774457e36dc37b0ffba14dfe9955))

### [0.0.94](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.93...v0.0.94) (2026-07-02)


### Features

* **picture:** make Context tab editable with tab panels, widgets, provenance ([1ff341f](https://github.com/marvinbarretto/jimbo-dashboard/commit/1ff341ff0cde43f0da4f55cef70ee087c027a33b))

### [0.0.93](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.92...v0.0.93) (2026-07-01)


### Features

* **picture:** add self-model + clarifications review page ([2bed4bd](https://github.com/marvinbarretto/jimbo-dashboard/commit/2bed4bd21a36f78603d7a58e05fa72dfdbb87db6))

### [0.0.92](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.91...v0.0.92) (2026-06-29)


### Bug Fixes

* **pomo:** show all active projects in pre-session picker ([d9623d8](https://github.com/marvinbarretto/jimbo-dashboard/commit/d9623d89f33ee6b376aded43a603345bc9553c07))

### [0.0.91](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.90...v0.0.91) (2026-06-29)


### Bug Fixes

* **vault-items:** render epics distinctly from tasks in detail modal ([4d30e82](https://github.com/marvinbarretto/jimbo-dashboard/commit/4d30e82045b6bc957994d1e338978aa87685e2f8))

### [0.0.90](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.89...v0.0.90) (2026-06-29)

### [0.0.89](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.88...v0.0.89) (2026-06-28)


### Features

* **projects:** add short_code field to project create/edit forms ([40b9fa7](https://github.com/marvinbarretto/jimbo-dashboard/commit/40b9fa7e9515cb4ad99f715ea5c5c4555366eae9)), closes [#3087](https://github.com/marvinbarretto/jimbo-dashboard/issues/3087)

### [0.0.88](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.87...v0.0.88) (2026-06-28)


### Features

* **vault:** render LOC-NNNN operator handles on cards ([956829a](https://github.com/marvinbarretto/jimbo-dashboard/commit/956829a28e6c4faaa85f6a6b72656e743720b611)), closes [#3062](https://github.com/marvinbarretto/jimbo-dashboard/issues/3062) [#3087](https://github.com/marvinbarretto/jimbo-dashboard/issues/3087)

### [0.0.87](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.86...v0.0.87) (2026-06-28)


### Features

* auto-open retro when the pomo countdown hits zero ([5b856c8](https://github.com/marvinbarretto/jimbo-dashboard/commit/5b856c89c0c47ac8dd074382c9d0b206d9b0749b))
* **execution:** owner/project facets span manual cards; lanes fill width ([954aadd](https://github.com/marvinbarretto/jimbo-dashboard/commit/954aadddb4fda4999741db4a1263163170d07d69))
* **execution:** unify board into Ready/In Progress/Done lanes ([a55f4ea](https://github.com/marvinbarretto/jimbo-dashboard/commit/a55f4eae9e3461475c1df69e43e0c16c057549cb))
* **nutrition:** split calories into food vs alcohol ([052f35e](https://github.com/marvinbarretto/jimbo-dashboard/commit/052f35e2af7874616ad91f2732e760475deddbbb))


### Bug Fixes

* **kanban:** let column fill its wrap instead of pinning to 320px ([b022b67](https://github.com/marvinbarretto/jimbo-dashboard/commit/b022b675e24f3b3420c58274fa135f92d727c95f))
* **vault:** tolerate bare-array response in dependency loadFor ([ed746d4](https://github.com/marvinbarretto/jimbo-dashboard/commit/ed746d4d1945b45e5a7a20757ef6f617b734485a))


### Code Refactoring

* **kanban:** share Project/Owner/Priority facets across boards ([501f219](https://github.com/marvinbarretto/jimbo-dashboard/commit/501f219afdd1b15aa3d6c8bbe39d1d627f33caf1))

### [0.0.86](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.85...v0.0.86) (2026-06-27)


### Features

* **journal:** add Consumption section for YouTube watch data ([d6ed4a4](https://github.com/marvinbarretto/jimbo-dashboard/commit/d6ed4a489ec2786880342df14b46c25115526a4a))
* **pomo:** create epics from pre-session, show all + wider grid ([60bbf05](https://github.com/marvinbarretto/jimbo-dashboard/commit/60bbf0537414e75f48361bd7945c28b97901889b))

### [0.0.85](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.84...v0.0.85) (2026-06-26)


### Features

* **pomo:** broadcast session lifecycle to the extension countdown bridge ([53e1b69](https://github.com/marvinbarretto/jimbo-dashboard/commit/53e1b69563dc17ef71c59a8ac5ac748d1cd42210))
* **pomo:** intention-centric retro with real Next Steps ([afc5f27](https://github.com/marvinbarretto/jimbo-dashboard/commit/afc5f2730b856b6e01e121ee5223d9f45bf69855))
* **pomo:** redesign pre-session as an auto-advancing wizard ([3c7d7f1](https://github.com/marvinbarretto/jimbo-dashboard/commit/3c7d7f102be665b9c821767caf747fb3f1d59830))
* **vault-chip:** add lg size; retro items open in modal + bigger ([2abded7](https://github.com/marvinbarretto/jimbo-dashboard/commit/2abded796cfd0441ccb1e0275e04f36b1d403635))


### Bug Fixes

* **pomo:** drop done-checkboxes from retro Next Steps ([a3179d4](https://github.com/marvinbarretto/jimbo-dashboard/commit/a3179d45fc9503ba5abe4a171d01786031b6a204))
* **pomo:** retro done-check is an empty circle, not a circle-in-a-circle ([7e9627c](https://github.com/marvinbarretto/jimbo-dashboard/commit/7e9627c3353bd1732d0c9c7a2754e5b7d627269f))


### Code Refactoring

* **hermes:** convert control-room model editor to UiTypeahead ([56a9465](https://github.com/marvinbarretto/jimbo-dashboard/commit/56a9465c3dbaf58adb12e73221011aff615baf3f)), closes [#10](https://github.com/marvinbarretto/jimbo-dashboard/issues/10)
* **ui-lab:** promote ui-stepper + ui-select-chip; reuse progress-meter ([0fdd21c](https://github.com/marvinbarretto/jimbo-dashboard/commit/0fdd21c2fec87ae2931167617d44bcfd6557ccd4))

### [0.0.84](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.83...v0.0.84) (2026-06-25)


### Features

* **journal:** surface YouTube watch time on the day summary ([56a58ec](https://github.com/marvinbarretto/jimbo-dashboard/commit/56a58ec8f6a06c6c7fce32d23263c1fc77768997))
* **pomo:** guided project → epic → story start flow ([32fbdb1](https://github.com/marvinbarretto/jimbo-dashboard/commit/32fbdb125638ea7a0105a7f37f80a78ca9b72986))
* **ui:** UiTypeahead picker replacing native selects for catalog/entity fields ([b760bd8](https://github.com/marvinbarretto/jimbo-dashboard/commit/b760bd85e3df71d6f429b58ab6a193ccbba384d7)), closes [#10](https://github.com/marvinbarretto/jimbo-dashboard/issues/10)

### [0.0.83](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.82...v0.0.83) (2026-06-25)


### Features

* **nutrition:** common-foods autocomplete (self-growing, instant repeats) ([c11c86a](https://github.com/marvinbarretto/jimbo-dashboard/commit/c11c86a03e1cd42e4f4828102c45c89dab8eac98))

### [0.0.82](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.81...v0.0.82) (2026-06-25)


### Features

* **nutrition:** guess calories on quick-add via the LLM estimator ([c89e40f](https://github.com/marvinbarretto/jimbo-dashboard/commit/c89e40f9f9f08b8593ee350d187a34ed4bbb260d))

### [0.0.81](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.80...v0.0.81) (2026-06-25)


### Features

* **exercise:** rebuild gym page as an editable day-grouped session ledger ([946c95a](https://github.com/marvinbarretto/jimbo-dashboard/commit/946c95afa3836fd5228f849e4f8665d57b6ad4c8))
* **hermes:** flag gated cron jobs in the control room ([6635433](https://github.com/marvinbarretto/jimbo-dashboard/commit/6635433904d119722b4decec990a6dd65144b113))
* **tracker:** London-aware time editing, inline-edit polish, no teardown on write ([67f89d7](https://github.com/marvinbarretto/jimbo-dashboard/commit/67f89d777decdb889370da84812c438efcd775f6))


### Bug Fixes

* **hermes:** label pre-run scripts accurately, not all as "gated" ([7a6dcc3](https://github.com/marvinbarretto/jimbo-dashboard/commit/7a6dcc305f45fb312457ce11cc96b4924148545d))

### [0.0.80](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.79...v0.0.80) (2026-06-25)


### Features

* **exercise:** add exercise dashboard feature + journal widgets ([e812e5a](https://github.com/marvinbarretto/jimbo-dashboard/commit/e812e5a9bd2f10ea612e004a09d374a6408699ce))
* **exercise:** split workouts vs daily activity; surface steps ([0fb5a76](https://github.com/marvinbarretto/jimbo-dashboard/commit/0fb5a7638d803b01dc9c992853fa3b686735f093))
* **journal:** dashboard-esque day summary with routine progress meters ([0da0c6a](https://github.com/marvinbarretto/jimbo-dashboard/commit/0da0c6a6bfa814a764ae3264a9b34029fdf2cb06))
* **nutrition:** generic tracker primitives + unified day ledger with CRUD ([9f5db82](https://github.com/marvinbarretto/jimbo-dashboard/commit/9f5db82c78a3af507b2b0052ac672947c4747344))
* **nutrition:** show supplements in journal day section ([b7d00c7](https://github.com/marvinbarretto/jimbo-dashboard/commit/b7d00c76830a9829d551dc23609b009558ad3905))
* **projects:** multi-repo per-repo cards + repo.md aggregation (M3) ([ee81d3e](https://github.com/marvinbarretto/jimbo-dashboard/commit/ee81d3ef8f9b58f41e6ed71f3fe4d288429df172))
* **projects:** read-only operating fields for repo-synced projects (M2) ([09d9cec](https://github.com/marvinbarretto/jimbo-dashboard/commit/09d9cec124ce49f0fbaa095f2fe8155f44cbc33d))
* **scripts:** 72h launchd agent for the manifest sweep (M4) ([d7e4ecf](https://github.com/marvinbarretto/jimbo-dashboard/commit/d7e4ecf924eb44ec2f011c710f8a0e4e6a435c52))
* **scripts:** add project-manifest sync (dry-run default) ([c071848](https://github.com/marvinbarretto/jimbo-dashboard/commit/c07184849cd49cbb0a8f8b21494a685d328fe1c8))
* **scripts:** API-driven manifest sync (drive from project registry, not filesystem sweep) ([a4418dd](https://github.com/marvinbarretto/jimbo-dashboard/commit/a4418dd1b4c082e0353811ce0e16556b24d3a97f))
* **scripts:** resolve relative conventions against repo_url in manifest sync ([6a6657d](https://github.com/marvinbarretto/jimbo-dashboard/commit/6a6657d265e6ab23629c0d2050ba0ac584cdbdaa))


### Bug Fixes

* **exercise,journal:** label total energy correctly ([dded383](https://github.com/marvinbarretto/jimbo-dashboard/commit/dded383472ed3f1fc03919675145f32f652c5e0f))
* **scripts:** order-insensitive repos comparison (jsonb reorders keys) ([8e8376d](https://github.com/marvinbarretto/jimbo-dashboard/commit/8e8376dda1509df021729290b43a3ab4ef21f5a1))
* **scripts:** stamp synced_at even when manifest content already matches ([b6d3a64](https://github.com/marvinbarretto/jimbo-dashboard/commit/b6d3a64857c0149e2471599ea283e3f4dacb8a4e))

### [0.0.79](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.78...v0.0.79) (2026-06-24)


### Features

* **hermes:** catalogue-driven backend in the per-job model picker ([b9c46a9](https://github.com/marvinbarretto/jimbo-dashboard/commit/b9c46a92a4ffaf3132ba115616855fc9497a4676))
* **hermes:** editable per-job model/provider pin in control room ([77fd041](https://github.com/marvinbarretto/jimbo-dashboard/commit/77fd041ebd87add0cd136cef9c9b42f8a05afdc2))
* **journal:** add day-page section nav + empty-collapse ([ed9600d](https://github.com/marvinbarretto/jimbo-dashboard/commit/ed9600d915493a98474de7bc24704dc9c01bf8a2))

### [0.0.78](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.77...v0.0.78) (2026-06-22)


### Features

* **briefings:** archive page with ratings + journal day-page integration ([9a2b541](https://github.com/marvinbarretto/jimbo-dashboard/commit/9a2b5416a7a4e35687454b8dfaa77c442637af97))
* **nutrition:** editable NutritionRow with inline number-field support ([361d495](https://github.com/marvinbarretto/jimbo-dashboard/commit/361d49561af4bd0c06a222b56320d02d55ada25b))
* **vault-items:** vault-item-detail V2 comparison surface + audit ([4f4ae9e](https://github.com/marvinbarretto/jimbo-dashboard/commit/4f4ae9e603e7e2bae94ae59e0d29e490a3fc28c1)), closes [#01](https://github.com/marvinbarretto/jimbo-dashboard/issues/01) [#10](https://github.com/marvinbarretto/jimbo-dashboard/issues/10)

### [0.0.77](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.76...v0.0.77) (2026-06-21)


### Features

* **nutrition:** dashboard view, journal widget, and page over coach_food_log ([b5e9ed6](https://github.com/marvinbarretto/jimbo-dashboard/commit/b5e9ed6c1271d53e5ae71229010ede8c66b9e0cd))

### [0.0.76](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.75...v0.0.76) (2026-06-21)


### Features

* **execution:** Ready column shows every item meeting Definition of Ready ([b17ca08](https://github.com/marvinbarretto/jimbo-dashboard/commit/b17ca08c77b52f88b4dd473453414aa782989fc4))
* **vault-items:** tabbed detail modal with stable sizing and 2-col Detail ([a23ae5e](https://github.com/marvinbarretto/jimbo-dashboard/commit/a23ae5e7d2742afc5c24baabf439927f58fc0bae))


### Bug Fixes

* **execution:** Ready column shows leaf work only, not epic containers ([b1952f3](https://github.com/marvinbarretto/jimbo-dashboard/commit/b1952f3282fd38b518afba1ac21a25c21a91f12f))


### Code Refactoring

* **ui:** extract shared TagChip primitive ([f362d47](https://github.com/marvinbarretto/jimbo-dashboard/commit/f362d47fcd60de7a8435e6c39b67cf64adddadc0))

### [0.0.75](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.74...v0.0.75) (2026-06-21)


### Features

* **review:** add Awaiting Review surface for the commission gate ([2d2a32a](https://github.com/marvinbarretto/jimbo-dashboard/commit/2d2a32afd39d0d5a200041905299e526dbdfd752))

### [0.0.74](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.73...v0.0.74) (2026-06-20)


### Features

* add commission history drill-down + inline PR link ([3e00a26](https://github.com/marvinbarretto/jimbo-dashboard/commit/3e00a2601b9405dc8ddb164b2ef11ab0b84b40f6)), closes [#2841](https://github.com/marvinbarretto/jimbo-dashboard/issues/2841) [#14](https://github.com/marvinbarretto/jimbo-dashboard/issues/14) [#301](https://github.com/marvinbarretto/jimbo-dashboard/issues/301) [#302](https://github.com/marvinbarretto/jimbo-dashboard/issues/302) [#303](https://github.com/marvinbarretto/jimbo-dashboard/issues/303)
* add per-item commission view-model for the execution board ([7889a1c](https://github.com/marvinbarretto/jimbo-dashboard/commit/7889a1cbec11e51cea9cc35f1ace31ac5b39be0e))
* add Ralph run-history dashboard page ([99b0780](https://github.com/marvinbarretto/jimbo-dashboard/commit/99b0780273d4e99bc88b8e52757217a97271fab3))
* **journal:** keep/watch/cut usefulness rating per job ([68ef759](https://github.com/marvinbarretto/jimbo-dashboard/commit/68ef7598fd6a4a340620f09a68cd0c85f00d3a88))
* **journal:** show per-job cost + total in Agents section ([fa3c38f](https://github.com/marvinbarretto/jimbo-dashboard/commit/fa3c38f79cb0aa3bf16a9a25fca51c2c43fcd1c8))
* rebuild execution board as one card per item (commission lifecycle) ([77b23e7](https://github.com/marvinbarretto/jimbo-dashboard/commit/77b23e7c01e896ea5b414e4dfccef0502b6e7338))
* register commission components in the UI Lab ([fb2c91c](https://github.com/marvinbarretto/jimbo-dashboard/commit/fb2c91cd33ca9e79ad2600aec20f8b06fbf2858c)), closes [#2849](https://github.com/marvinbarretto/jimbo-dashboard/issues/2849) [#14](https://github.com/marvinbarretto/jimbo-dashboard/issues/14)
* show run cost/tokens/model on grooming activity events ([bbaa172](https://github.com/marvinbarretto/jimbo-dashboard/commit/bbaa1729f3611416fa30b6daea28d2c133882244))
* surface grooming agent runs in the item activity log ([63110f3](https://github.com/marvinbarretto/jimbo-dashboard/commit/63110f3bf83c2d4733d2a43e6ee80a93574b6c8d))
* surface proposed/rejected in the commission view (stop collapsing status) ([152ba62](https://github.com/marvinbarretto/jimbo-dashboard/commit/152ba6277a3143873eb409ba5b29e0e99442abf6))


### Bug Fixes

* mark an item's first project link as primary ([0094716](https://github.com/marvinbarretto/jimbo-dashboard/commit/0094716a8621b7140ef893af055996a5c8da354a))
* read a vault item's first assignment as "assigned" not "reassigned" ([633b3b2](https://github.com/marvinbarretto/jimbo-dashboard/commit/633b3b24fb4c616aac001b45be0cd49d5c7681a4))

### [0.0.73](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.72...v0.0.73) (2026-06-16)


### Features

* **auth:** redirect to /auth/login on API 401 ([a54b053](https://github.com/marvinbarretto/jimbo-dashboard/commit/a54b053472df71a879a0460466f9e54cf66acc25))

### [0.0.72](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.71...v0.0.72) (2026-06-16)


### Bug Fixes

* **dev-proxy:** send X-API-Key for the cookie-or-key auth model ([2e451c9](https://github.com/marvinbarretto/jimbo-dashboard/commit/2e451c9205df0fa7875ac075f3cd9882bc95b655))
* **projects:** tolerate API omitting color_token ([ace4177](https://github.com/marvinbarretto/jimbo-dashboard/commit/ace4177eed2b48b465f8159bdf44c6d50482d1ab))

### [0.0.71](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.70...v0.0.71) (2026-06-16)


### Features

* **project-landing:** render criteria as markdown ([9f8ddb7](https://github.com/marvinbarretto/jimbo-dashboard/commit/9f8ddb767ee234c13e83928896c6b6062c269109))


### Code Refactoring

* **layout:** shell-owned page gutter via two-template system ([2dcfe2e](https://github.com/marvinbarretto/jimbo-dashboard/commit/2dcfe2e001a179ab30310b9fc3031c9c123cb509))

### [0.0.70](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.69...v0.0.70) (2026-06-15)


### Bug Fixes

* **detail-modal:** break circular dep causing NG0919 ([7ec17c1](https://github.com/marvinbarretto/jimbo-dashboard/commit/7ec17c1acfd0bd7139a92fc20bda96cf150a6edf))

### [0.0.69](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.68...v0.0.69) (2026-06-15)


### Features

* **hermes:** add model prefs UI and promote hermes to primary nav ([f630959](https://github.com/marvinbarretto/jimbo-dashboard/commit/f6309596214ef8420488faacf99c16b27e71c937))
* **markdown:** render vault item body as markdown ([98f7859](https://github.com/marvinbarretto/jimbo-dashboard/commit/98f78594145101b0a4b8cc571c51d1e943670d08))

### [0.0.68](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.67...v0.0.68) (2026-06-09)


### Features

* **deep-links:** detail pages for activity, briefing, context-item, email ([1b204e4](https://github.com/marvinbarretto/jimbo-dashboard/commit/1b204e438e3352d0bbf3d487192b2c69f90a3cc6))
* **project-activity:** add labels for note_created and recon_completed events ([40dc588](https://github.com/marvinbarretto/jimbo-dashboard/commit/40dc588ed32d9b03cc1f2a5cd2505c4080abf524))
* **project-landing:** belief system UI, open flags, in-flight dispatch, activity feed ([0488c95](https://github.com/marvinbarretto/jimbo-dashboard/commit/0488c9589cf1b58db2403c71455b650443cb0589))
* **projects-list:** show per-epic progress, velocity, and stalled pill ([0099245](https://github.com/marvinbarretto/jimbo-dashboard/commit/00992458a542ba6591c341d756899b726e32993b))
* **projects-list:** tab Epics by project; add UiInlineTabs primitive ([f27909d](https://github.com/marvinbarretto/jimbo-dashboard/commit/f27909db02e2f59c8cc7116c7a330d8c40938c60))
* understanding section on project landing page ([dfb545e](https://github.com/marvinbarretto/jimbo-dashboard/commit/dfb545eb9b8ef274ff121895630f5f3115464a87))
* **vault-card:** genesis provenance chip and model-id line on dispatch cards ([03be316](https://github.com/marvinbarretto/jimbo-dashboard/commit/03be316a700336870405086cce7697273809f722))


### Bug Fixes

* guard null executor in execution board filter groups ([f235807](https://github.com/marvinbarretto/jimbo-dashboard/commit/f23580724298664c511549f8fb17cfe12ed0ac94))

### [0.0.67](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.66...v0.0.67) (2026-05-25)


### Features

* **journal-mcp:** "Recent calls" per-call drill-down with args ([bbf329c](https://github.com/marvinbarretto/jimbo-dashboard/commit/bbf329c1d720888c7d92b1559dc23a70abc08ab8))
* **journal-mcp:** hourly bar chart + conditional Errors subsection ([8badb04](https://github.com/marvinbarretto/jimbo-dashboard/commit/8badb040e5827e5d66b7c0a1601704c28fb49bd2))
* **journal:** MCP section on the day-page ([0def2c8](https://github.com/marvinbarretto/jimbo-dashboard/commit/0def2c89af717dc6e2e82b06830046426539b61a))

### [0.0.66](https://github.com/marvinbarretto/jimbo-dashboard/compare/v0.0.65...v0.0.66) (2026-05-21)


### Features

* **agent-runs:** hermes runs tab + journal agents section ([117f6c0](https://github.com/marvinbarretto/jimbo-dashboard/commit/117f6c0c3b58e8603e49093f8a71a59f97686c4a))

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
