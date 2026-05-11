import {
  Clock,
  ExternalLink,
  GripVertical,
  Pencil,
  Trash2,
  type LucideIconData,
} from 'lucide-angular';

// Semantic names (not lucide names) so the underlying icon can be swapped without
// touching call sites. Keep this list curated — only add what we actually use.
export const ICONS = {
  edit:           Pencil,
  delete:         Trash2,
  clock:          Clock,
  'external-link': ExternalLink,
  'grip-vertical': GripVertical,
} as const satisfies Record<string, LucideIconData>;

export type IconName = keyof typeof ICONS;

export const ICON_NAMES: readonly IconName[] = Object.keys(ICONS) as IconName[];
