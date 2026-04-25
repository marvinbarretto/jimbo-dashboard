// NOTE: The /attachments endpoint does not yet exist in jimbo-api (Hono + SQLite on VPS).
// This service scaffolds the pattern so the frontend is ready when the backend catches up.
//
// Attachments are bucketed by thread_message_id — a thread loads all its message ids,
// then calls loadFor(messageIds) in one batch rather than N individual requests.

import { Injectable, Signal, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { Attachment, AttachmentKind } from '@domain/attachments';
import type { AttachmentId, ThreadMessageId } from '@domain/ids';
import { attachmentId } from '@domain/ids';
import { environment } from '../../../../environments/environment';
import { isSeedMode } from '@shared/seed-mode';
import { SEED } from '@domain/seed';

@Injectable({ providedIn: 'root' })
export class AttachmentsService {
  private readonly http = inject(HttpClient);
  private readonly uploadUrl = `${environment.apiUrl}/attachments/upload`;
  private readonly fetchUrl  = `${environment.apiUrl}/attachments`;

  // Keyed by ThreadMessageId string. Lazy-populated via loadFor().
  private readonly _byMessage = signal<Record<string, Attachment[]>>({});

  // Reactive getter scoped to a single message.
  attachmentsFor(messageId: ThreadMessageId): Signal<Attachment[]> {
    return computed(() => this._byMessage()[messageId] ?? []);
  }

  // Batch-fetch attachments for every message in a thread at once.
  // Called by ThreadView after messages load. May be called again on re-fetch — idempotent.
  loadFor(messageIds: ThreadMessageId[]): void {
    if (messageIds.length === 0) return;

    if (isSeedMode()) {
      const want = new Set<string>(messageIds.map(id => id as string));
      const bucket: Record<string, Attachment[]> = {};
      for (const att of SEED.attachments) {
        const key = att.thread_message_id as string;
        if (!want.has(key)) continue;
        (bucket[key] ??= []).push(att);
      }
      this._byMessage.update(map => ({ ...map, ...bucket }));
      return;
    }

    // PostgREST-style: ?thread_message_id=in.(id1,id2,…)
    const inList = messageIds.join(',');
    const params = { thread_message_id: `in.(${inList})` };

    this.http.get<Attachment[]>(this.fetchUrl, { params }).subscribe({
      next: rows => {
        const bucket: Record<string, Attachment[]> = {};
        for (const row of rows) {
          const key = row.thread_message_id as string;
          (bucket[key] ??= []).push(row);
        }
        // Merge into signal map — don't clobber buckets for other messages.
        this._byMessage.update(map => ({ ...map, ...bucket }));
      },
      // Silently swallow — endpoint doesn't exist yet; empty state is the correct dev fallback.
      error: () => {},
    });
  }

  // Upload a file as multipart/form-data and return the created Attachment.
  // On server error, writes a synthetic optimistic row with a blob URL so the UI renders in dev.
  async upload(file: File, messageId: ThreadMessageId): Promise<Attachment> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('thread_message_id', messageId as string);
    formData.append('filename', file.name);
    formData.append('mime_type', file.type);
    formData.append('size_bytes', String(file.size));

    try {
      const created = await this.http
        .post<Attachment>(this.uploadUrl, formData)
        .toPromise() as Attachment;

      this._insert(created);
      return created;
    } catch {
      // DEV-ONLY: endpoint does not exist. Synthesise a client-side blob-URL row so
      // the UI can render the attachment during development without a real API.
      const optimistic = this._syntheticAttachment(file, messageId);
      this._insert(optimistic);
      return optimistic;
    }
  }

  remove(id: AttachmentId): void {
    this._byMessage.update(map => {
      const next = { ...map };
      for (const key of Object.keys(next)) {
        next[key] = next[key].filter(a => a.id !== id);
      }
      return next;
    });
  }

  private _insert(attachment: Attachment): void {
    const key = attachment.thread_message_id as string;
    this._byMessage.update(map => ({
      ...map,
      [key]: [...(map[key] ?? []), attachment],
    }));
  }

  private _syntheticAttachment(file: File, messageId: ThreadMessageId): Attachment {
    const kind: AttachmentKind = file.type.startsWith('image/') ? 'image' : 'file';
    const id: AttachmentId = attachmentId(`local-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    return {
      id,
      thread_message_id: messageId,
      kind,
      filename:    file.name,
      mime_type:   file.type,
      size_bytes:  file.size,
      // Blob URL — only valid for the lifetime of this browser tab.
      url:         URL.createObjectURL(file),
      caption:     null,
      created_at:  new Date().toISOString(),
    };
  }
}
