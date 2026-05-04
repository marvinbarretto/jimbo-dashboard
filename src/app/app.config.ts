import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { TitleStrategy, provideRouter } from '@angular/router';

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
    provideRouter(routes),
    { provide: TitleStrategy, useClass: AppTitleStrategy },
  ],
};
