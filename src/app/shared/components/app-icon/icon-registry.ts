import {
  Archive,
  Check,
  ChevronsDown,
  Clock,
  Dumbbell,
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
  Sunrise,
  Trash2,
  UtensilsCrossed,
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
  today:          Sunrise,
  food:           UtensilsCrossed,
  gym:            Dumbbell,
} as const satisfies Record<string, LucideIconData>;

export type IconName = keyof typeof ICONS;

export const ICON_NAMES: readonly IconName[] = Object.keys(ICONS) as IconName[];
