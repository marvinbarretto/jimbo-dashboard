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
    path: ':id',
    title: 'Project',
    loadComponent: () => import('./containers/project-detail/project-detail').then(m => m.ProjectDetail),
  },
  {
    path: ':id/edit',
    title: 'Edit project',
    loadComponent: () => import('./containers/project-form/project-form').then(m => m.ProjectForm),
  },
];
