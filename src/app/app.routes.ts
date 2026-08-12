import { Routes } from '@angular/router';

// Everything under the desktop chrome (header + section tabs + gutter).
// Children of the DesktopLayout parent at the bottom of this file — paths are
// unchanged by the nesting because the parent's path is ''.
const desktopRoutes: Routes = [
  {
    path: 'test/epic-cards',
    title: 'Epic Cards — test',
    loadComponent: () => import('./features/test/epic-cards-test').then(m => m.EpicCardsTest),
  },
  {
    path: 'hermes',
    title: 'Hermes',
    loadChildren: () => import('./features/hermes/hermes.routes').then(m => m.hermesRoutes),
  },
  {
    path: 'skills',
    title: 'Skills',
    loadChildren: () => import('./features/skills/skills.routes').then(m => m.skillsRoutes),
  },
  {
    path: 'mail-activity',
    title: 'Mail activity',
    loadComponent: () => import('./features/mail-activity/containers/mail-activity-page/mail-activity-page').then(m => m.MailActivityPage),
  },
  // Registered BEFORE the :gmailId route below, or the param route swallows
  // it and this renders an email-not-found instead of the page.
  {
    path: 'mail-activity/runs',
    title: 'Gate runs',
    loadComponent: () => import('./features/mail-activity/containers/gate-runs-page/gate-runs-page').then(m => m.GateRunsPage),
  },
  {
    path: 'mail-activity/senders',
    title: 'Junk senders',
    loadComponent: () => import('./features/mail-activity/containers/junk-senders-page/junk-senders-page').then(m => m.JunkSendersPage),
  },
  {
    path: 'mail-activity/poll-runs',
    title: 'Poll runs',
    loadComponent: () => import('./features/mail-activity/containers/poll-runs-page/poll-runs-page').then(m => m.PollRunsPage),
  },
  // Drill-in for one sweep. Three segments, so the :gmailId route below cannot
  // swallow it. Reachable only for runs that stamped a run id — older sweeps
  // have no way to name their mail except by timestamp proximity.
  {
    path: 'mail-activity/poll-runs/:runId',
    title: 'Sweep',
    loadComponent: () => import('./features/mail-activity/containers/poll-run-detail/poll-run-detail').then(m => m.PollRunDetail),
  },
  // Deep-link target for email search results (keyed by gmail_id — see
  // jimbo-api search resolveDeepLinkKey). Sibling of the list above.
  {
    path: 'mail-activity/:gmailId',
    title: 'Email',
    loadComponent: () => import('./features/mail-activity/containers/email-detail/email-detail').then(m => m.EmailDetail),
    // Tabs are child routes (repo idiom: tasks, hermes, api-data) — the URL
    // is the tab state, so a specific view of a specific email deep-links.
    children: [
      { path: '', redirectTo: 'analysis', pathMatch: 'full' },
      { path: 'analysis', loadComponent: () => import('./features/mail-activity/containers/email-detail/panels/analysis-panel').then(m => m.EmailAnalysisPanel) },
      { path: 'links', loadComponent: () => import('./features/mail-activity/containers/email-detail/panels/links-panel').then(m => m.EmailLinksPanel) },
      { path: 'body', loadComponent: () => import('./features/mail-activity/containers/email-detail/panels/body-panel').then(m => m.EmailBodyPanel) },
      { path: 'raw', loadComponent: () => import('./features/mail-activity/containers/email-detail/panels/raw-panel').then(m => m.EmailRawPanel) },
    ],
  },
  {
    path: 'briefings',
    title: 'Briefings',
    loadComponent: () => import('./features/briefings/containers/briefings-page/briefings-page').then(m => m.BriefingsPage),
  },
  {
    path: 'briefing/:id',
    title: 'Briefing',
    loadComponent: () => import('./features/briefing/containers/briefing-detail/briefing-detail').then(m => m.BriefingDetail),
  },
  {
    path: 'activity/:id',
    title: 'Activity',
    loadComponent: () => import('./features/activity/containers/activity-detail/activity-detail').then(m => m.ActivityDetail),
  },
  {
    path: 'context/:id',
    title: 'Context item',
    loadComponent: () => import('./features/context-item/containers/context-item-detail/context-item-detail').then(m => m.ContextItemDetail),
  },
  {
    path: 'constraints',
    title: 'Constraints',
    loadChildren: () => import('./features/constraints/constraints.routes').then(m => m.constraintsRoutes),
  },
  {
    path: 'shopping',
    loadChildren: () => import('./features/shopping/shopping.routes').then(m => m.shoppingRoutes),
  },
  {
    path: 'tasks',
    title: 'Tasks',
    loadChildren: () => import('./features/tasks/tasks.routes').then(m => m.tasksRoutes),
  },
  {
    // Raw endpoint inspectors. Mounting these at the app root previously let
    // `/tasks` and `/briefings` shadow two of them into unreachability.
    path: 'api',
    loadChildren: () => import('./features/api-data/api-data.routes').then(m => m.apiDataRoutes),
  },
  {
    path: 'vault-items',
    loadChildren: () => import('./features/vault-items/vault-items.routes').then(m => m.vaultItemsRoutes),
  },
  {
    path: 'config',
    loadChildren: () => import('./features/config/config.routes').then(m => m.configRoutes),
  },
  { path: 'actors', redirectTo: 'config/actors', pathMatch: 'full' },
  {
    path: 'entities',
    loadChildren: () => import('./features/entity-registry/entity-registry.routes').then(m => m.entityRegistryRoutes),
  },
  {
    path: 'projects/:id',
    title: 'Project',
    loadComponent: () => import('./features/projects/containers/project-landing/project-landing').then(m => m.ProjectLanding),
  },
  { path: 'projects', redirectTo: 'config/projects', pathMatch: 'full' },
  {
    path: 'grooming',
    loadChildren: () => import('./features/grooming/grooming.routes').then(m => m.groomingRoutes),
  },
  {
    path: 'execution',
    loadChildren: () => import('./features/execution/execution.routes').then(m => m.executionRoutes),
  },
  {
    path: 'review',
    loadChildren: () => import('./features/dispatch-review/dispatch-review.routes').then(m => m.dispatchReviewRoutes),
  },
  {
    path: 'fleet',
    title: 'Fleet',
    loadComponent: () => import('./features/fleet/containers/fleet-board/fleet-board').then(m => m.FleetBoard),
  },
  {
    path: 'fleet/daily-report',
    title: 'Fleet — Daily Report',
    loadComponent: () =>
      import('./features/fleet/containers/fleet-daily-report/fleet-daily-report').then(m => m.FleetDailyReport),
  },
  {
    path: 'questions',
    loadChildren: () => import('./features/questions/questions.routes').then(m => m.questionsRoutes),
  },
  {
    path: 'picture',
    loadChildren: () => import('./features/picture/picture.routes').then(m => m.pictureRoutes),
  },

  {
    path: 'coverage',
    title: 'Coverage',
    loadComponent: () => import('./features/coverage/coverage-page/coverage-page').then(m => m.CoveragePage),
  },
  {
    path: 'stream',
    title: 'Stream',
    loadComponent: () => import('./features/stream/containers/stream-page/stream-page').then(m => m.StreamPage),
  },
  {
    path: 'pomo',
    loadChildren: () => import('./features/pomo/pomo.routes').then(m => m.pomoRoutes),
  },
  {
    path: 'test-forms',
    title: 'Test forms',
    loadComponent: () => import('./features/test-forms/test-forms-page').then(m => m.TestFormsPage),
  },
  {
    path: 'ui-lab',
    title: 'UI Lab',
    loadComponent: () => import('./features/ui-lab/ui-lab-shell').then(m => m.UiLabShell),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'library-surface' },
      { path: 'library-surface',        loadComponent: () => import('./features/ui-lab/sections/library-surface-section').then(m => m.LibrarySurfaceSection) },
      { path: 'toggle',                  loadComponent: () => import('./features/ui-lab/sections/toggle-section').then(m => m.ToggleSection) },
      { path: 'entity-chip',             loadComponent: () => import('./features/ui-lab/sections/entity-chip-section').then(m => m.EntityChipSection) },
      { path: 'tag-chip',                loadComponent: () => import('./features/ui-lab/sections/tag-chip-section').then(m => m.TagChipSection) },
      { path: 'vault-detail-primitives', loadComponent: () => import('./features/ui-lab/sections/vault-detail-primitives-section').then(m => m.VaultDetailPrimitivesSection) },
      { path: 'tab-bar',                 loadComponent: () => import('./features/ui-lab/sections/tab-bar-section').then(m => m.TabBarSection) },
      { path: 'ui-inline-tabs',          loadComponent: () => import('./features/ui-lab/sections/ui-inline-tabs-section').then(m => m.UiInlineTabsSection) },
      { path: 'ui-segmented',            loadComponent: () => import('./features/ui-lab/sections/ui-segmented-section').then(m => m.UiSegmentedSection) },
      { path: 'ui-filter-pills',         loadComponent: () => import('./features/ui-lab/sections/ui-filter-pills-section').then(m => m.UiFilterPillsSection) },
      { path: 'ui-select-chip',          loadComponent: () => import('./features/ui-lab/sections/ui-select-chip-section').then(m => m.UiSelectChipSection) },
      { path: 'chip-sizing-options',     loadComponent: () => import('./features/ui-lab/sections/chip-sizing-options-section').then(m => m.ChipSizingOptionsSection) },
      { path: 'ui-stepper',              loadComponent: () => import('./features/ui-lab/sections/ui-stepper-section').then(m => m.UiStepperSection) },
      { path: 'list-workflow',           loadComponent: () => import('./features/ui-lab/sections/list-workflow-section').then(m => m.ListWorkflowSection) },
      { path: 'detail-workflow',         loadComponent: () => import('./features/ui-lab/sections/detail-workflow-section').then(m => m.DetailWorkflowSection) },
      { path: 'hybrid-edit',             loadComponent: () => import('./features/ui-lab/sections/hybrid-edit-section').then(m => m.HybridEditSection) },
      { path: 'inline-edit',             loadComponent: () => import('./features/ui-lab/sections/inline-edit-section').then(m => m.InlineEditSection) },
      { path: 'project-brief-bullet-field', loadComponent: () => import('./features/ui-lab/sections/project-brief-bullet-field-section').then(m => m.ProjectBriefBulletFieldSection) },
      { path: 'mention-chip-strip',      loadComponent: () => import('./features/ui-lab/sections/mention-chip-strip-section').then(m => m.MentionChipStripSection) },
      { path: 'expandable-rows',         loadComponent: () => import('./features/ui-lab/sections/expandable-rows-section').then(m => m.ExpandableRowsSection) },
      { path: 'refresh-control',         loadComponent: () => import('./features/ui-lab/sections/refresh-control-section').then(m => m.RefreshControlSection) },
      { path: 'side-panel-inspector',    loadComponent: () => import('./features/ui-lab/sections/side-panel-inspector-section').then(m => m.SidePanelInspectorSection) },
      { path: 'briefing-report',         loadComponent: () => import('./features/ui-lab/sections/briefing-report-section').then(m => m.BriefingReportSection) },
      { path: 'clarification-prompt',    loadComponent: () => import('./features/ui-lab/sections/clarification-prompt-section').then(m => m.ClarificationPromptSection) },
      { path: 'loading-states',          loadComponent: () => import('./features/ui-lab/sections/loading-states-section').then(m => m.LoadingStatesSection) },
      { path: 'datetime-pipes',          loadComponent: () => import('./features/ui-lab/sections/datetime-pipes-section').then(m => m.DatetimePipesSection) },
      { path: 'ui-prose',                loadComponent: () => import('./features/ui-lab/sections/ui-prose-section').then(m => m.UiProseSection) },
      { path: 'form-actions',            loadComponent: () => import('./features/ui-lab/sections/form-actions-section').then(m => m.FormActionsSection) },
      { path: 'ui-button',               loadComponent: () => import('./features/ui-lab/sections/ui-button-section').then(m => m.UiButtonSection) },
      { path: 'app-icon',                loadComponent: () => import('./features/ui-lab/sections/app-icon-section').then(m => m.AppIconSection) },
      { path: 'ui-add-tile',             loadComponent: () => import('./features/ui-lab/sections/ui-add-tile-section').then(m => m.UiAddTileSection) },
      { path: 'project-card',            loadComponent: () => import('./features/ui-lab/sections/project-card-section').then(m => m.ProjectCardSection) },
      { path: 'epic-row',                loadComponent: () => import('./features/ui-lab/sections/epic-row-section').then(m => m.EpicRowSection) },
      { path: 'epic-momentum-row',       loadComponent: () => import('./features/ui-lab/sections/epic-momentum-row-section').then(m => m.EpicMomentumRowSection) },
      { path: 'actor-avatar',            loadComponent: () => import('./features/ui-lab/sections/actor-avatar-section').then(m => m.ActorAvatarSection) },
      { path: 'project-avatar',          loadComponent: () => import('./features/ui-lab/sections/project-avatar-section').then(m => m.ProjectAvatarSection) },
      { path: 'actor-chip',              loadComponent: () => import('./features/ui-lab/sections/actor-chip-section').then(m => m.ActorChipSection) },
      { path: 'vault-chip',              loadComponent: () => import('./features/ui-lab/sections/vault-chip-section').then(m => m.VaultChipSection) },
      { path: 'job-chip',                loadComponent: () => import('./features/ui-lab/sections/job-chip-section').then(m => m.JobChipSection) },
      { path: 'epic-rollup',             loadComponent: () => import('./features/ui-lab/sections/epic-rollup-section').then(m => m.EpicRollupSection) },
      { path: 'card-parent-link',        loadComponent: () => import('./features/ui-lab/sections/card-parent-link-section').then(m => m.CardParentLinkSection) },
      { path: 'card-callout',            loadComponent: () => import('./features/ui-lab/sections/card-callout-section').then(m => m.CardCalloutSection) },
      { path: 'commission-stage-pill',   loadComponent: () => import('./features/ui-lab/sections/commission-stage-pill-section').then(m => m.CommissionStagePillSection) },
      { path: 'commission-card',         loadComponent: () => import('./features/ui-lab/sections/commission-card-section').then(m => m.CommissionCardSection) },
      { path: 'dispatch-history-list',   loadComponent: () => import('./features/ui-lab/sections/dispatch-history-list-section').then(m => m.DispatchHistoryListSection) },
      { path: 'vault-card',              loadComponent: () => import('./features/ui-lab/sections/vault-card-section').then(m => m.VaultCardSection) },
      { path: 'block-card',              loadComponent: () => import('./features/ui-lab/sections/block-card-section').then(m => m.BlockCardSection) },
      { path: 'item-header',             loadComponent: () => import('./features/ui-lab/sections/item-header-section').then(m => m.ItemHeaderSection) },
      { path: 'vault-card-kanban',      loadComponent: () => import('./features/ui-lab/sections/vault-card-kanban-section').then(m => m.VaultCardKanbanSection) },
      { path: 'nutrition-row',           loadComponent: () => import('./features/ui-lab/sections/nutrition-row-section').then(m => m.NutritionRowSection) },
      { path: 'tracker',                 loadComponent: () => import('./features/ui-lab/sections/tracker-section').then(m => m.TrackerSection) },
      { path: 'nutrition-mobile',        loadComponent: () => import('./features/ui-lab/sections/nutrition-mobile-section').then(m => m.NutritionMobileSection) },
    ],
  },
  {
    path: 'calendar-settings',
    title: 'Calendar settings',
    loadComponent: () => import('./features/calendar-settings/calendar-settings-page').then(m => m.CalendarSettingsPage),
  },
  {
    path: 'planner',
    title: 'Planner',
    loadComponent: () => import('./features/planner/containers/planner-page/planner-page').then(m => m.PlannerPage),
  },
  {
    path: 'notification-settings',
    title: 'Notification settings',
    loadComponent: () => import('./features/notification-settings/containers/notification-settings-page/notification-settings-page').then(m => m.NotificationSettingsPage),
  },
  {
    path: 'modules',
    loadChildren: () => import('./features/modules/modules.routes').then(m => m.modulesRoutes),
  },
  {
    path: 'jimbo-workspace',
    loadChildren: () => import('./features/jimbo-workspace/jimbo-workspace.routes').then(m => m.jimboWorkspaceRoutes),
  },
  {
    path: 'journal',
    loadChildren: () => import('./features/journal/journal.routes').then(m => m.journalRoutes),
  },
  {
    path: 'nutrition',
    loadChildren: () => import('./features/nutrition/nutrition.routes').then(m => m.nutritionRoutes),
  },
  {
    path: 'checkins',
    loadChildren: () => import('./features/checkins/checkins.routes').then(m => m.checkinsRoutes),
  },
  {
    path: 'evening',
    loadChildren: () => import('./features/evening/evening.routes').then(m => m.eveningRoutes),
  },
  {
    path: 'exercise',
    loadChildren: () => import('./features/exercise/exercise.routes').then(m => m.exerciseRoutes),
  },
  // Journal's Overview is the glance layer (day summary + timeline, live-
  // refreshing on today), so it's the landing. /today is a raw endpoint
  // inspector and lives under System → API.
  { path: '', redirectTo: 'journal', pathMatch: 'full' },
];

// Layout routes: the router picks a shell, so neither surface renders — or
// even loads — the other's chrome.
export const routes: Routes = [
  // The phone shell. Short path because it's typed on a phone and hardcoded as
  // a deep-link target in jimbo-app's native home screen. Registered first:
  // the desktop parent's path is '' and matches everything.
  {
    path: 'm',
    loadChildren: () => import('./features/mobile/mobile.routes').then(m => m.mobileRoutes),
  },
  {
    path: '',
    loadComponent: () => import('./layout/desktop-layout/desktop-layout').then(m => m.DesktopLayout),
    children: desktopRoutes,
  },
];
