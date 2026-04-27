// Attachments via dashboard-api at /api/attachments (jimbo_pg-backed).
// Phase 3 part 3 of Phase C — replaces legacy PostgREST scaffold.
//
// Upload flow is split: this service POSTs the metadata row. The actual
// file storage (S3/local) is currently out of scope — uploads still
// produce a synthetic blob-URL row in dev when the storage layer is
// missing. Promoting to a real upload is a Phase 3 part 3 follow-up.

import { Injectable, Signal, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import type { Attachment, AttachmentKind } from '@domain/attachments';
import type { AttachmentId, ThreadMessageId } from '@domain/ids';
import { attachmentId } from '@domain/ids';
import { environment } from '../../../../environments/environment';
import { isSeedMode } from '@shared/seed-mode';
import { SEED } from '@domain/seed';

@Injectable({ providedIn: 'root' })
export class AttachmentsService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.dashboardApiUrl}/api/attachments`;

  private readonly _byMessage = signal<Record<string, Attachment[]>>({});

  attachmentsFor(messageId: ThreadMessageId): Signal<Attachment[]> {
    return computed(() => this._byMessage()[messageId] ?? []);
  }

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

    const params = new HttpParams().set('message_ids', messageIds.join(','));
    this.http.get<{ items: Attachment[] }>(this.url, { params }).subscribe({
      next: ({ items }) => {
        const bucket: Record<string, Attachment[]> = {};
        for (const row of items) {
          const key = row.thread_message_id as string;
          (bucket[key] ??= []).push(row);
        }
        this._byMessage.update(map => ({ ...map, ...bucket }));
      },
      error: () => {},
    });
  }

  async upload(file: File, messageId: ThreadMessageId): Promise<Attachment> {
    // No real upload path yet. Synthesise a client-side blob-URL row so the
    // UI can render the attachment. Once a storage backend lands, swap this
    // for multipart upload + POST { thread_message_id, ... } to the API.
    const optimistic = this._syntheticAttachment(file, messageId);
    this._insert(optimistic);
    return optimistic;
  }

  remove(id: AttachmentId): void {
    this._byMessage.update(map => {
      const next = { ...map };
      for (const key of Object.keys(next)) {
        next[key] = next[key].filter(a => a.id !== id);
      }
      return next;
    });

    if (isSeedMode()) return;

    this.http.delete(`${this.url}/${encodeURIComponent(id)}`).subscribe({ error: () => {} });
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
      filename:   file.name,
      mime_type:  file.type,
      size_bytes: file.size,
      url:        URL.createObjectURL(file),
      caption:    null,
      created_at: new Date().toISOString(),
    };
  }
}
