// Mirrors jimbo-api/src/schemas/context.ts — context_files/sections/items.
// Editable (content/label/timeframe + add/remove) within the Picture page's
// Context tab via full CRUD endpoints, but there's no confidence/evidence
// machinery here, unlike belief entities — no accuracy feedback loop.
// 'archived' is server-set only (the context-expire cron flips expired items
// to it) — never sent on a create/update request.
export type ContextItemStatus = 'active' | 'paused' | 'completed' | 'deferred' | 'archived';
export type ContextItemCategory = 'project' | 'life-area' | 'habit' | 'one-off';
export type ContextSectionFormat = 'list' | 'prose';

export interface ContextItem {
  id: number;
  section_id: number;
  label: string | null;
  content: string;
  timeframe: string | null;
  status: ContextItemStatus | null;
  category: ContextItemCategory | null;
  expires_at: string | null;
  // Set when this item was auto-created from an answered clarification (see
  // clarification-interpret.ts's ephemeral_context action) — null for
  // hand-curated items and anything predating this column.
  source_clarification_id: string | null;
  sort_order: number;
  updated_at: string;
}

export interface ContextSection {
  id: number;
  file_id: number;
  name: string;
  format: ContextSectionFormat;
  sort_order: number;
  updated_at: string;
  items: ContextItem[];
}

export interface ContextFile {
  id: number;
  slug: string;
  display_name: string;
  sort_order: number;
  updated_at: string;
  sections: ContextSection[];
}
