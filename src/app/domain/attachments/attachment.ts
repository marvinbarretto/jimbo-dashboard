import type { AttachmentId, ThreadMessageId } from '../ids';

// An attachment — binary content linked to a thread message.
// Always scoped to a ThreadMessage (drag-to-thread image, agent-posted screenshot, etc.).
// VaultItem-level attachments are threaded messages posted at creation time,
// keeping one home for binaries and avoiding polymorphic host columns.
//
// Byte storage is NOT this type's concern. The `url` points at whatever jimbo-api
// chooses for file serving (blob store, CDN, local disk). Type just holds the pointer.

export type AttachmentKind =
  | 'image'   // most common — screenshots, design refs, photos
  | 'file'    // generic — PDFs, docs
  | 'code';   // code snippets rendered with syntax highlighting

export interface Attachment {
  id:                 AttachmentId;
  thread_message_id:  ThreadMessageId;
  kind:               AttachmentKind;
  filename:           string;        // 'screenshot-2026-04-24-0714.png'
  mime_type:          string;        // 'image/png', 'application/pdf', etc.
  size_bytes:         number;
  url:                string;        // where the bytes live
  caption:            string | null; // optional human-written context
  created_at:         string;
}

export type CreateAttachmentPayload = Omit<Attachment, 'id' | 'created_at'>;
