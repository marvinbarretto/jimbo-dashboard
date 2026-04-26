import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { TitleStrategy, provideRouter } from '@angular/router';

import { AppTitleStrategy } from './app-title-strategy';
import { routes } from './app.routes';
import { dashboardApiKeyInterceptor } from './shared/dashboard-api.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideHttpClient(withInterceptors([dashboardApiKeyInterceptor])),
    provideRouter(routes),
    { provide: TitleStrategy, useClass: AppTitleStrategy },
  ],
};
