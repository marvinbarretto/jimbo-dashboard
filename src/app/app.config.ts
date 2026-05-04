import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { TitleStrategy, provideRouter, withInMemoryScrolling } from '@angular/router';

import { AppTitleStrategy } from './app-title-strategy';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    // Auth: Caddy basic_auth gates jimbo.fourfoldmedia.uk; the browser
    // includes the credential automatically on every request, including
    // WS upgrades. No app-level key.
    provideHttpClient(),
    provideRouter(routes, withInMemoryScrolling({ anchorScrolling: 'enabled', scrollPositionRestoration: 'top' })),
    { provide: TitleStrategy, useClass: AppTitleStrategy },
  ],
};
