import { ApplicationConfig, inject, isDevMode, provideAppInitializer, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { RouteReuseStrategy, TitleStrategy, provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';

import { AppTitleStrategy } from './app-title-strategy';
import { provideTabAwareScrolling } from '@shared/utils/tab-navigation';
import { routes } from './app.routes';
import { ApiCredentials } from './features/auth/data-access/api-credentials.service';
import { MobileTabReuseStrategy } from './features/mobile/mobile-tab-reuse-strategy';
import { apiKeyInterceptor } from './features/auth/data-access/api-key.interceptor';
import { authRedirectInterceptor } from './features/auth/data-access/auth-redirect.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    // Auth: jimbo-api validates the jimbo_session cookie (the browser sends it
    // automatically, same-origin). The interceptor bounces to /auth/login when
    // the session has expired and an /api/* call comes back 401.
    //
    // Inside the jimbo-app WebView there is no login flow, so the native shell
    // hands over an X-API-Key instead. Resolved here — before the root
    // component is constructed, and therefore before App's eagerly-injected
    // services fire their HTTP loads.
    provideAppInitializer(() => inject(ApiCredentials).resolve()),
    // apiKey before authRedirect: the key has to be attached before a 401 can
    // be interpreted as an expired session.
    provideHttpClient(withFetch(), withInterceptors([apiKeyInterceptor, authRedirectInterceptor])),
    // Scroll-to-top on navigation lives in provideTabAwareScrolling, not
    // scrollPositionRestoration — identical behaviour except navigations
    // marked TAB_NAVIGATION (in-page tab switches) hold the viewport still.
    provideRouter(routes, withInMemoryScrolling({ anchorScrolling: 'enabled', scrollPositionRestoration: 'disabled' })),
    provideTabAwareScrolling(),
    // Detach/reattach reuse for the /m tabs only — routes without a reuseTab
    // marker (all of desktop) keep the default destroy-on-navigate.
    { provide: RouteReuseStrategy, useClass: MobileTabReuseStrategy },
    { provide: TitleStrategy, useClass: AppTitleStrategy },
    provideCharts(withDefaultRegisterables()),
    // Offline shell + instant cold launch, phone-first. Registration waits for
    // stability so it never competes with first paint; SwUpdateService owns
    // the check-on-resume / apply-while-hidden update cycle.
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
