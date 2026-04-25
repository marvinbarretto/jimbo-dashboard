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
    path: ':namespace/:name',
    loadComponent: () => import('./containers/skill-detail/skill-detail').then(m => m.SkillDetail),
  },
  {
    path: ':namespace/:name/edit',
    loadComponent: () => import('./containers/skill-form/skill-form').then(m => m.SkillForm),
  },
];
