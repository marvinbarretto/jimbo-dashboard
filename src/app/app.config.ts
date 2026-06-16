import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { TitleStrategy, provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';

import { AppTitleStrategy } from './app-title-strategy';
import { routes } from './app.routes';
import { authRedirectInterceptor } from './features/auth/data-access/auth-redirect.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    // Auth: jimbo-api validates the jimbo_session cookie (the browser sends it
    // automatically, same-origin). The interceptor bounces to /auth/login when
    // the session has expired and an /api/* call comes back 401.
    provideHttpClient(withFetch(), withInterceptors([authRedirectInterceptor])),
    provideRouter(routes, withInMemoryScrolling({ anchorScrolling: 'enabled', scrollPositionRestoration: 'top' })),
    { provide: TitleStrategy, useClass: AppTitleStrategy },
    provideCharts(withDefaultRegisterables()),
  ],
};
