import { Routes } from '@angular/router';

export const promptsRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./containers/prompts-list/prompts-list').then(m => m.PromptsList),
  },
  {
    path: 'new',
    loadComponent: () => import('./containers/prompt-form/prompt-form').then(m => m.PromptForm),
  },
  {
    path: ':id',
    loadComponent: () => import('./containers/prompt-detail/prompt-detail').then(m => m.PromptDetail),
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./containers/prompt-form/prompt-form').then(m => m.PromptForm),
  },
  {
    path: ':id/versions/new',
    loadComponent: () => import('./containers/prompt-version-form/prompt-version-form').then(m => m.PromptVersionForm),
  },
];
