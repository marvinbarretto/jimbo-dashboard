import {
  Archive,
  Check,
  ChevronsDown,
  Clock,
  ExternalLink,
  Github,
  GitBranch,
  GripVertical,
  LogOut,
  MessageSquare,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  X,
  type LucideIconData,
} from 'lucide-angular';

// Semantic names (not lucide names) so the underlying icon can be swapped without
// touching call sites. Keep this list curated — only add what we actually use.
export const ICONS = {
  edit:           Pencil,
  delete:         Trash2,
  add:            Plus,
  clock:          Clock,
  'external-link': ExternalLink,
  'grip-vertical': GripVertical,
  approve:        Check,
  reject:         X,
  archive:        Archive,
  answer:         MessageSquare,
  decompose:      GitBranch,
  retry:          RotateCcw,
  demote:         ChevronsDown,
  'mark-done':    Check,
  github:         Github,
  search:         Search,
  'sign-out':     LogOut,
} as const satisfies Record<string, LucideIconData>;

export type IconName = keyof typeof ICONS;

export const ICON_NAMES: readonly IconName[] = Object.keys(ICONS) as IconName[];
