import type { Attachment } from './attachment';
import { attachmentId } from '../ids';
import { THREAD_MESSAGE_IDS } from '../thread/fixtures';

// One image attachment on the comment about the postcode regex — exercises image rendering.

export const ATTACHMENTS = [
  {
    id: attachmentId('eeeeeeee-1111-1111-1111-eeeeeeeeeeee'),
    thread_message_id: THREAD_MESSAGE_IDS.B_C1,
    kind: 'image',
    filename: 'postcode-regex-tests.png',
    mime_type: 'image/png',
    size_bytes: 48_211,
    url: 'https://placehold.co/600x400/png?text=postcode+regex+tests',
    caption: 'Existing test cases for the validator',
    created_at: '2026-04-23T11:46:00Z',
  },
] as const satisfies readonly Attachment[];
