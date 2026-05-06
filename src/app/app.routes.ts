import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'today',
    title: 'Today',
    loadComponent: () => import('./features/api-data/containers/today-page/today-page').then(m => m.TodayPage),
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
    path: 'shopping',
    loadChildren: () => import('./features/shopping/shopping.routes').then(m => m.shoppingRoutes),
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
    path: 'grooming',
    loadChildren: () => import('./features/grooming/grooming.routes').then(m => m.groomingRoutes),
  },
  {
    path: 'execution',
    loadChildren: () => import('./features/execution/execution.routes').then(m => m.executionRoutes),
  },
  {
    path: 'questions',
    loadChildren: () => import('./features/questions/questions.routes').then(m => m.questionsRoutes),
  },
  {
    path: 'models',
    loadChildren: () => import('./features/models/models.routes').then(m => m.modelsRoutes),
  },
  {
    path: 'model-stacks',
    loadChildren: () => import('./features/model-stacks/model-stacks.routes').then(m => m.modelStacksRoutes),
  },
  {
    path: 'coverage',
    title: 'Coverage',
    loadComponent: () => import('./features/coverage/coverage-page/coverage-page').then(m => m.CoveragePage),
  },
  {
    path: 'stream',
    title: 'Stream',
    loadComponent: () => import('./features/stream/stream-page/stream-page').then(m => m.StreamPage),
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
      { path: 'vault-detail-primitives', loadComponent: () => import('./features/ui-lab/sections/vault-detail-primitives-section').then(m => m.VaultDetailPrimitivesSection) },
      { path: 'tab-bar',                 loadComponent: () => import('./features/ui-lab/sections/tab-bar-section').then(m => m.TabBarSection) },
      { path: 'list-workflow',           loadComponent: () => import('./features/ui-lab/sections/list-workflow-section').then(m => m.ListWorkflowSection) },
      { path: 'detail-workflow',         loadComponent: () => import('./features/ui-lab/sections/detail-workflow-section').then(m => m.DetailWorkflowSection) },
      { path: 'hybrid-edit',             loadComponent: () => import('./features/ui-lab/sections/hybrid-edit-section').then(m => m.HybridEditSection) },
      { path: 'expandable-rows',         loadComponent: () => import('./features/ui-lab/sections/expandable-rows-section').then(m => m.ExpandableRowsSection) },
      { path: 'side-panel-inspector',    loadComponent: () => import('./features/ui-lab/sections/side-panel-inspector-section').then(m => m.SidePanelInspectorSection) },
      { path: 'loading-states',          loadComponent: () => import('./features/ui-lab/sections/loading-states-section').then(m => m.LoadingStatesSection) },
      { path: 'datetime-pipes',          loadComponent: () => import('./features/ui-lab/sections/datetime-pipes-section').then(m => m.DatetimePipesSection) },
      { path: 'form-actions',            loadComponent: () => import('./features/ui-lab/sections/form-actions-section').then(m => m.FormActionsSection) },
      { path: 'project-card',            loadComponent: () => import('./features/ui-lab/sections/project-card-section').then(m => m.ProjectCardSection) },
    ],
  },
  {
    path: 'calendar-settings',
    title: 'Calendar settings',
    loadComponent: () => import('./features/calendar-settings/calendar-settings-page').then(m => m.CalendarSettingsPage),
  },
  {
    path: 'google-tasks-settings',
    title: 'Google Tasks settings',
    loadComponent: () => import('./features/google-tasks-settings/google-tasks-settings-page').then(m => m.GoogleTasksSettingsPage),
  },
  {
    path: 'triage-tasks',
    title: 'Triage tasks',
    loadComponent: () => import('./features/triage-tasks/triage-tasks-page').then(m => m.TriageTasksPage),
  },
  {
    path: 'jimbo-workspace',
    loadChildren: () => import('./features/jimbo-workspace/jimbo-workspace.routes').then(m => m.jimboWorkspaceRoutes),
  },
  { path: '', redirectTo: 'today', pathMatch: 'full' },
];
