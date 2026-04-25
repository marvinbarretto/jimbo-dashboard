import { Routes } from '@angular/router';

export const promptsRoutes: Routes = [
  {
    path: '',
    title: 'Prompts',
    loadComponent: () => import('./containers/prompts-list/prompts-list').then(m => m.PromptsList),
  },
  {
    path: 'new',
    title: 'New prompt',
    loadComponent: () => import('./containers/prompt-form/prompt-form').then(m => m.PromptForm),
  },
  {
    path: ':id',
    title: 'Prompt',
    loadComponent: () => import('./containers/prompt-detail/prompt-detail').then(m => m.PromptDetail),
  },
  {
    path: ':id/edit',
    title: 'Edit prompt',
    loadComponent: () => import('./containers/prompt-form/prompt-form').then(m => m.PromptForm),
  },
  {
    path: ':id/versions/new',
    title: 'New prompt version',
    loadComponent: () => import('./containers/prompt-version-form/prompt-version-form').then(m => m.PromptVersionForm),
  },
];
