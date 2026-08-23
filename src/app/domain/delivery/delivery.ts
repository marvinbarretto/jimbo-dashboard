/**
 * Delivery — what agents have built that has not reached production.
 *
 * The model is trunk-based with manual promotion: agents merge continuously,
 * and production moves only when Marvin cuts a release and deploys. So the
 * headline is not throughput, it is the size of the gap between master and
 * what users actually have.
 */
export type CiState = 'passing' | 'failing' | 'pending' | 'none';

export interface DeliveryPr {
  number:     number;
  title:      string;
  url:        string;
  ci:         CiState;
  /** Set to merge itself once checks pass. */
  autoMerge:  boolean;
  ageDays:    number;
  /** Vault item this came from, via the `dispatch/<note_id>` branch. */
  noteSeq:    number | null;
  draft:      boolean;
}

export interface DeliveryProject {
  projectId:   string;
  displayName: string;
  repo:        string;
  latestTag:   string | null;
  /** Commits since `latestTag` — built, not released. */
  unshipped:   number;
  openPrs:     DeliveryPr[];
  /** Open PRs whose checks failed. With auto-merge these fail silently. */
  failing:     number;
  /** Per-repo failure. The row renders; it just admits it is stale. */
  error:       string | null;
}

export interface DeliveryTotals {
  unshipped: number;
  openPrs:   number;
  failing:   number;
}

export interface Delivery {
  projects: DeliveryProject[];
  totals:   DeliveryTotals;
}
