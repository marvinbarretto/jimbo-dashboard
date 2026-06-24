import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'today',
    title: 'Today',
    loadComponent: () => import('./features/api-data/containers/today-page/today-page').then(m => m.TodayPage),
  },
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
    path: 'mail-next',
    title: 'Mail Next',
    loadComponent: () => import('./features/mail/containers/mail-next-page/mail-next-page').then(m => m.MailNextPage),
  },
  {
    path: 'mail-activity',
    title: 'Mail activity',
    loadComponent: () => import('./features/mail-activity/containers/mail-activity-page/mail-activity-page').then(m => m.MailActivityPage),
  },
  // Deep-link target for email search results (keyed by gmail_id — see
  // jimbo-api search resolveDeepLinkKey). Sibling of the list above.
  {
    path: 'mail-activity/:gmailId',
    title: 'Email',
    loadComponent: () => import('./features/mail-activity/containers/email-detail/email-detail').then(m => m.EmailDetail),
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
    path: 'shopping',
    loadChildren: () => import('./features/shopping/shopping.routes').then(m => m.shoppingRoutes),
  },
  {
    path: 'tasks',
    title: 'Tasks',
    loadChildren: () => import('./features/tasks/tasks.routes').then(m => m.tasksRoutes),
  },
  {
    path: '',
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
  {
    path: 'actors',
    loadChildren: () => import('./features/actors/actors.routes').then(m => m.actorsRoutes),
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
    path: 'questions',
    loadChildren: () => import('./features/questions/questions.routes').then(m => m.questionsRoutes),
  },
  {
    path: 'ralph',
    title: 'Ralph',
    loadComponent: () => import('./features/ralph/ralph-page').then(m => m.RalphPage),
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
    path: 'pomo-reports',
    title: 'Pomo reports',
    loadComponent: () => import('./features/pomo/containers/pomo-page/pomo-page').then(m => m.PomoPage),
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
      { path: 'list-workflow',           loadComponent: () => import('./features/ui-lab/sections/list-workflow-section').then(m => m.ListWorkflowSection) },
      { path: 'detail-workflow',         loadComponent: () => import('./features/ui-lab/sections/detail-workflow-section').then(m => m.DetailWorkflowSection) },
      { path: 'hybrid-edit',             loadComponent: () => import('./features/ui-lab/sections/hybrid-edit-section').then(m => m.HybridEditSection) },
      { path: 'inline-edit',             loadComponent: () => import('./features/ui-lab/sections/inline-edit-section').then(m => m.InlineEditSection) },
      { path: 'mention-chip-strip',      loadComponent: () => import('./features/ui-lab/sections/mention-chip-strip-section').then(m => m.MentionChipStripSection) },
      { path: 'expandable-rows',         loadComponent: () => import('./features/ui-lab/sections/expandable-rows-section').then(m => m.ExpandableRowsSection) },
      { path: 'refresh-control',         loadComponent: () => import('./features/ui-lab/sections/refresh-control-section').then(m => m.RefreshControlSection) },
      { path: 'side-panel-inspector',    loadComponent: () => import('./features/ui-lab/sections/side-panel-inspector-section').then(m => m.SidePanelInspectorSection) },
      { path: 'loading-states',          loadComponent: () => import('./features/ui-lab/sections/loading-states-section').then(m => m.LoadingStatesSection) },
      { path: 'datetime-pipes',          loadComponent: () => import('./features/ui-lab/sections/datetime-pipes-section').then(m => m.DatetimePipesSection) },
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
      { path: 'epic-rollup',             loadComponent: () => import('./features/ui-lab/sections/epic-rollup-section').then(m => m.EpicRollupSection) },
      { path: 'card-parent-link',        loadComponent: () => import('./features/ui-lab/sections/card-parent-link-section').then(m => m.CardParentLinkSection) },
      { path: 'card-callout',            loadComponent: () => import('./features/ui-lab/sections/card-callout-section').then(m => m.CardCalloutSection) },
      { path: 'commission-stage-pill',   loadComponent: () => import('./features/ui-lab/sections/commission-stage-pill-section').then(m => m.CommissionStagePillSection) },
      { path: 'commission-card',         loadComponent: () => import('./features/ui-lab/sections/commission-card-section').then(m => m.CommissionCardSection) },
      { path: 'dispatch-history-list',   loadComponent: () => import('./features/ui-lab/sections/dispatch-history-list-section').then(m => m.DispatchHistoryListSection) },
      { path: 'vault-card',              loadComponent: () => import('./features/ui-lab/sections/vault-card-section').then(m => m.VaultCardSection) },
      { path: 'vault-card-kanban',      loadComponent: () => import('./features/ui-lab/sections/vault-card-kanban-section').then(m => m.VaultCardKanbanSection) },
      { path: 'nutrition-row',           loadComponent: () => import('./features/ui-lab/sections/nutrition-row-section').then(m => m.NutritionRowSection) },
    ],
  },
  {
    path: 'calendar-settings',
    title: 'Calendar settings',
    loadComponent: () => import('./features/calendar-settings/calendar-settings-page').then(m => m.CalendarSettingsPage),
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
    path: 'exercise',
    loadChildren: () => import('./features/exercise/exercise.routes').then(m => m.exerciseRoutes),
  },
  { path: '', redirectTo: 'today', pathMatch: 'full' },
];
