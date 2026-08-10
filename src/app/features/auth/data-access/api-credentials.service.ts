import { DOCUMENT, Injectable, inject, signal } from '@angular/core';

/**
 * Shape of the credentials the native shell's AuthPlugin hands back.
 * Mirrors `jimbo-app/plugins/auth/definitions.ts`.
 */
type ApiCredentialsPayload = {
  apiKey: string;
  apiUrl: string;
  deviceId: string;
};

type CapacitorGlobal = {
  Plugins?: {
    Auth?: { getApiCredentials(): Promise<ApiCredentialsPayload> };
  };
};

type JimboBridge = {
  capabilities: Record<string, number>;
  shellVersion: string;
};

/**
 * Holds the X-API-Key handed over by the jimbo-app Capacitor shell.
 *
 * `/api/*` is cookie-OR-X-API-Key. In a browser the session cookie does the
 * job and this resolves to null; inside the WebView there's no login flow and
 * no cookie to expire, so native supplies the key from BuildConfig over the
 * bridge.
 *
 * Resolved once from an app initializer rather than lazily, because `App`
 * eagerly injects AuthService/ActorsService/ProjectsService and their
 * constructors fire HTTP immediately. Initializers complete before the root
 * component is constructed, so the key is in place before those land —
 * otherwise they'd 401 in the WebView and authRedirectInterceptor would bounce
 * the shell to /auth/login.
 *
 * Reads `window.Capacitor` directly instead of depending on @capacitor/core:
 * the dashboard is a plain static SPA that also has to run in a browser, and
 * the native runtime injects its bridge into whatever page it hosts.
 */
@Injectable({ providedIn: 'root' })
export class ApiCredentials {
  private readonly window = inject(DOCUMENT).defaultView;

  /** Null in a browser, or whenever the bridge/plugin call fails. */
  readonly key = signal<string | null>(null);

  /** Which phone we're running on, when native told us. Informational. */
  readonly deviceId = signal<string | null>(null);

  async resolve(): Promise<void> {
    const win = this.window as (Window & { __JIMBO_BRIDGE__?: JimboBridge; Capacitor?: CapacitorGlobal }) | null;
    if (!win) return;

    // Feature-detect by capability version, not by sniffing for a native
    // platform — an older APK may host this build without the auth plugin.
    const version = win.__JIMBO_BRIDGE__?.capabilities?.['auth'];
    if (typeof version !== 'number' || version < 1) return;

    const plugin = win.Capacitor?.Plugins?.Auth;
    if (!plugin) return;

    try {
      // Raced against a timeout: this runs in an app initializer, so a bridge
      // call that never settles (plugin bug, deadlock on resume) would
      // otherwise hold Angular bootstrap on a blank screen forever. try/catch
      // only covers rejection, not a promise that never resolves.
      const creds = await Promise.race([
        plugin.getApiCredentials(),
        new Promise<null>(resolve => setTimeout(() => resolve(null), 3000)),
      ]);
      if (!creds) return;
      // Empty key = APK built without one. Treat as absent so we fall through
      // to cookie auth rather than sending a header that can only 401.
      if (creds.apiKey) this.key.set(creds.apiKey);
      if (creds.deviceId) this.deviceId.set(creds.deviceId);
    } catch {
      // Bridge failure → cookie auth. In a browser that's today's behaviour;
      // in the WebView there's no session, so the first /api call 401s and
      // authRedirectInterceptor lands on /auth/login with a return URL — a
      // one-time manual login, not a dead end. Deliberately not logged — the
      // payload is a credential.
    }
  }
}
