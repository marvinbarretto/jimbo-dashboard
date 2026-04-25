import { Routes } from '@angular/router';

export const projectsRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./containers/projects-list/projects-list').then(m => m.ProjectsList),
  },
  {
    path: 'new',
    loadComponent: () => import('./containers/project-form/project-form').then(m => m.ProjectForm),
  },
  {
    path: ':id',
    loadComponent: () => import('./containers/project-detail/project-detail').then(m => m.ProjectDetail),
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./containers/project-form/project-form').then(m => m.ProjectForm),
  },
];
