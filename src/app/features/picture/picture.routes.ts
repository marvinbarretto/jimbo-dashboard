import { Routes } from '@angular/router';

export const pictureRoutes: Routes = [
  {
    path: '',
    title: 'The Picture',
    loadComponent: () =>
      import('./containers/picture-page/picture-page').then(m => m.PicturePage),
  },
];
