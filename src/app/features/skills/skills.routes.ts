import { Routes } from '@angular/router';

export const skillsRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./containers/skills-list/skills-list').then(m => m.SkillsList),
  },
  {
    path: 'new',
    loadComponent: () => import('./containers/skill-form/skill-form').then(m => m.SkillForm),
  },
  {
    path: ':id',
    loadComponent: () => import('./containers/skill-detail/skill-detail').then(m => m.SkillDetail),
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./containers/skill-form/skill-form').then(m => m.SkillForm),
  },
];
