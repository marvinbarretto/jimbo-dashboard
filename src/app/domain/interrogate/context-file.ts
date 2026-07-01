// Mirrors jimbo-api/src/schemas/context.ts — context_files/sections/items.
// Rendered read-only within the Picture page's Context tab (no
// confidence/evidence/audit machinery exists for these, unlike belief
// entities — see picture.routes.ts plan notes).
export type ContextItemStatus = 'active' | 'paused' | 'completed' | 'deferred';
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
