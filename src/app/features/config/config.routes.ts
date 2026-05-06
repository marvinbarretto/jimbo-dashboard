import { Routes } from '@angular/router';

export const configRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./containers/config-page/config-page').then(m => m.ConfigPage),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'projects' },
      {
        path: 'projects',
        loadChildren: () => import('../projects/projects.routes').then(m => m.projectsRoutes),
      },
      {
        path: 'actors',
        loadChildren: () => import('../actors/actors.routes').then(m => m.actorsRoutes),
      },
      {
        path: 'skills',
        loadChildren: () => import('../skills/skills.routes').then(m => m.skillsRoutes),
      },
      {
        path: 'models',
        loadChildren: () => import('../models/models.routes').then(m => m.modelsRoutes),
      },
      {
        path: 'model-stacks',
        loadChildren: () => import('../model-stacks/model-stacks.routes').then(m => m.modelStacksRoutes),
      },
    ],
  },
];
