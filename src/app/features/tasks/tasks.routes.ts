import { Routes } from '@angular/router';

export const tasksRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./tasks-page').then(m => m.TasksPage),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'triage' },
      {
        path: 'triage',
        title: 'Triage tasks',
        loadComponent: () =>
          import('../triage-tasks/triage-tasks-page').then(m => m.TriageTasksPage),
      },
      {
        path: 'settings',
        title: 'Tasks settings',
        loadComponent: () =>
          import('../google-tasks-settings/google-tasks-settings-page').then(
            m => m.GoogleTasksSettingsPage,
          ),
      },
    ],
  },
];
