import { Routes } from '@angular/router';

export const jimboWorkspaceRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./containers/jimbo-workspace-page/jimbo-workspace-page').then(m => m.JimboWorkspacePage),
    children: [
      { path: '', redirectTo: 'mail', pathMatch: 'full' },
      {
        path: 'mail',
        title: 'Jimbo — Mail',
        loadComponent: () => import('./containers/jimbo-workspace-mail/jimbo-workspace-mail').then(m => m.JimboWorkspaceMail),
      },
      {
        path: 'calendar',
        title: 'Jimbo — Calendar',
        loadComponent: () => import('./containers/jimbo-workspace-calendar/jimbo-workspace-calendar').then(m => m.JimboWorkspaceCalendar),
      },
      {
        path: 'tasks',
        title: 'Jimbo — Tasks',
        loadComponent: () => import('./containers/jimbo-workspace-tasks/jimbo-workspace-tasks').then(m => m.JimboWorkspaceTasks),
      },
    ],
  },
];
