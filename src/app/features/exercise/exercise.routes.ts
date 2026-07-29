import { trackerRoutes } from '@shared/utils/tracker-routes';

export const exerciseRoutes = trackerRoutes({
  basePath: 'exercise',
  label: 'Exercise',
  loadPage: () => import('./containers/exercise-page/exercise-page'),
  pageExport: 'ExercisePage',
});
