import { Routes } from '@angular/router';

export const skillsRoutes: Routes = [
  {
    path: '',
    title: 'Skills',
    loadComponent: () => import('./containers/skills-list/skills-list').then(m => m.SkillsList),
  },
  {
    path: 'new',
    title: 'New skill',
    loadComponent: () => import('./containers/skill-form/skill-form').then(m => m.SkillForm),
  },
  {
    path: ':namespace/:name',
    title: 'Skill',
    loadComponent: () => import('./containers/skill-detail/skill-detail').then(m => m.SkillDetail),
  },
  {
    path: ':namespace/:name/edit',
    title: 'Edit skill',
    loadComponent: () => import('./containers/skill-form/skill-form').then(m => m.SkillForm),
  },
];
