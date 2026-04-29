import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export type JsonObject = Record<string, unknown>;
export type EndpointParams = Record<string, string | number | boolean>;

@Injectable({ providedIn: 'root' })
export class JimboDataService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.dashboardApiUrl}/api/jimbo`;

  get(path: string, params: EndpointParams = {}): Observable<unknown> {
    let httpParams = new HttpParams().set('path', path);
    for (const [key, value] of Object.entries(params)) {
      httpParams = httpParams.set(key, String(value));
    }
    return this.http.get<unknown>(this.url, { params: httpParams });
  }
}
