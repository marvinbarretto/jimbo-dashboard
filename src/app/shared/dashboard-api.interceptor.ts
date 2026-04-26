import type { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../environments/environment';

// Adds the X-API-Key header to every request that targets the dashboard-api
// service (`/dashboard-api/*` in both dev and prod). Matches jimbo-api's auth
// shape; key rotation lives in `/opt/dashboard-api.env` on the VPS.
export const dashboardApiKeyInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(`${environment.dashboardApiUrl}/`)) return next(req);
  return next(req.clone({
    setHeaders: { 'X-API-Key': environment.dashboardApiKey },
  }));
};
