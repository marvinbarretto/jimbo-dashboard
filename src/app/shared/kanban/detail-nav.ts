import { Router } from '@angular/router';

// Pure router-navigation helpers for the vault-item detail deep-link.
// Kept separate from detail-modal.ts so components that only need to
// navigate (not open the dialog) don't pull in VaultItemDetailDialog.
export function swapDetailSeq(router: Router, seq: number): void {
  router.navigate([], {
    queryParams: { detail: seq },
    queryParamsHandling: 'merge',
  });
}

export function closeDetail(router: Router): void {
  router.navigate([], {
    queryParams: { detail: null, note: null },
    queryParamsHandling: 'merge',
    replaceUrl: true,
  });
}
