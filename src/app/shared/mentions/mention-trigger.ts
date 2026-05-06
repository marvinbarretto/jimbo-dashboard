import type { Observable } from 'rxjs';

/**
 * One row in the mention dropdown. A trigger's `search` returns these.
 * The dropdown groups consecutive items with the same `group` label.
 */
export interface MentionItem {
  /** Unique key for *ngFor / track. */
  id: string;
  /** Primary text shown to the user. */
  label: string;
  /** Optional muted text rendered before the label (e.g. "#234"). */
  prefix?: string;
  /** Optional group header label. Consecutive items with the same group are grouped. */
  group?: string;
  /** Optional CSS color (hex/css var) — rendered as a leading dot. */
  color?: string | null;
  /** Original entity — passed back to onSelect so the use-site can dispatch. */
  payload: unknown;
}

/**
 * One trigger character + its behavior. Multiple triggers can be wired to a
 * single textarea via `[appMention]="[#tagTrigger, projectActorTrigger, vaultItemTrigger]"`.
 */
export interface MentionTrigger {
  /** Single character that opens the dropdown when typed at start-of-word. */
  char: string;
  /** Returns matches for the typed query (no leading trigger char). */
  search: (q: string) => Observable<MentionItem[]>;
  /**
   * Called when a row is committed (Enter/Tab/click).
   * Return a string to replace the `<char><query>` text, or null to remove it entirely.
   * Use null when the metadata is captured as a chip *outside* the textarea.
   */
  onSelect: (item: MentionItem) => string | null;
}
