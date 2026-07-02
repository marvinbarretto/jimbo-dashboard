import { Routes } from '@angular/router';

export const pictureRoutes: Routes = [
  {
    path: '',
    title: 'The Picture',
    loadComponent: () =>
      import('./containers/picture-page/picture-page').then(m => m.PicturePage),
  },
  {
    // Throwaway exploration: comparing layouts for charting goals/priorities
    // across time horizons, fed by the same live Context data. Not linked
    // from nav — delete this route once a direction is picked.
    path: 'horizons-lab',
    title: 'Horizons Lab',
    loadComponent: () =>
      import('./containers/horizons-lab/horizons-lab').then(m => m.HorizonsLab),
  },
];
