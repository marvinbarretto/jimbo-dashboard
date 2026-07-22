import { Routes } from '@angular/router';

export const projectsRoutes: Routes = [
  {
    path: '',
    title: 'Projects',
    loadComponent: () => import('./containers/projects-list/projects-list').then(m => m.ProjectsList),
  },
  {
    path: 'new',
    title: 'New project',
    loadComponent: () => import('./containers/project-form/project-form').then(m => m.ProjectForm),
  },
  {
    path: ':id/edit',
    title: 'Edit project',
    loadComponent: () => import('./containers/project-form/project-form').then(m => m.ProjectForm),
  },
  {
    // pathMatch 'full' — the default 'prefix' would swallow ':id/edit' too
    // and redirect it to the landing page before the route above ever matched.
    path: ':id',
    pathMatch: 'full',
    redirectTo: '/projects/:id',
  },
];
