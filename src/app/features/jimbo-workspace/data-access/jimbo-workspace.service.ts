// Read-only thin wrappers over the jimbo-api Google endpoints, all pinned
// to ?account=jimbo (the marvinbarretto.labs@gmail.com account). Returns
// raw shapes from upstream — the workspace pages dump them as JSON.

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

const ACCOUNT = 'jimbo';

@Injectable({ providedIn: 'root' })
export class JimboWorkspaceService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.dashboardApiUrl;

  mailProfile() {
    return this.http.get<unknown>(`${this.base}/api/google-mail/profile?account=${ACCOUNT}`);
  }

  mailMessages(limit = 25) {
    return this.http.get<unknown>(`${this.base}/api/google-mail/messages?account=${ACCOUNT}&hours=720&limit=${limit}`);
  }

  calendars() {
    return this.http.get<unknown>(`${this.base}/api/google-calendar/calendars?account=${ACCOUNT}`);
  }

  events(days = 14) {
    return this.http.get<unknown>(`${this.base}/api/google-calendar/events?account=${ACCOUNT}&days=${days}`);
  }

  taskLists() {
    return this.http.get<unknown>(`${this.base}/api/google-tasks/lists?account=${ACCOUNT}`);
  }

  tasks(listId = '@default') {
    return this.http.get<unknown>(`${this.base}/api/google-tasks/tasks?account=${ACCOUNT}&listId=${encodeURIComponent(listId)}`);
  }
}
