import { test, expect } from './fixtures';

// Regression-locks the readiness gate added in the command layer. The
// original screenshot showed dispatches failing with `expected ungroomed,
// got intake_rejected` — items had advanced to `ready` without the
// preconditions agents need to claim them. The defenses now in place:
//
//   * `VaultItemCommands.approveForDispatch` runs computeReadiness and
//     refuses + toasts when AC / owner / priority / questions / blockers
//     fail. Verified at unit level in vault-item-commands.spec.ts.
//
//   * `VaultItemCommands.setStatus` refuses transitions outside the
//     allowed-transitions table unless `force: true`. Kanban drag-drop
//     passes force; the approve action button does not.
//
// This spec exercises the happy path end-to-end through the UI so a
// future refactor that breaks the wiring (template binding, command
// dispatch, store reactivity) trips a real test rather than a unit-only
// one.

test.describe('grooming: approve flow', () => {
  test.beforeEach(async ({ groomingBoardPage }) => {
    await groomingBoardPage.goto();
  });

  test('clicking approve on a fully-groomed decomposed item moves it to Ready', async ({ page, groomingBoardPage }) => {
    // T (#2420) is the canonical "ready to flip" fixture — decomposed, owner
    // assigned, priority set, all 3 AC marked done. Passes every readiness
    // check; should advance cleanly.
    await groomingBoardPage.expectCardInColumn(2420, 'Decomposed');

    const card = groomingBoardPage.cardForSeq(2420);
    // Card actions are visible on hover; force the click so we don't depend
    // on hover state during automation.
    await card.getByRole('button', { name: /^approve$/i }).click();

    // Item moves to Ready column. setGroomingStatus deliberately doesn't
    // toast (drag-drop fires it on every column move and would be noise) —
    // the column-move IS the assertion.
    await groomingBoardPage.expectCardInColumn(2420, 'Ready');
  });
});
