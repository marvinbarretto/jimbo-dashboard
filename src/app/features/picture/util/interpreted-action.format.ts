import type { InterpretedAction } from '@domain/clarifications';

export interface FormattedInterpretedAction {
  summary: string;
  detail: string | null;
}

export function formatInterpretedAction(action: InterpretedAction): FormattedInterpretedAction {
  switch (action.action) {
    case 'update_vault_note':
      return { summary: 'Updated vault note', detail: action.append_body || null };
    case 'archive_vault_note':
      return { summary: 'Archived vault note', detail: action.reason || null };
    case 'create_task':
      return { summary: `Created task "${action.title}"`, detail: action.body || null };
    case 'ephemeral_context':
      return {
        summary: action.timeframe ? `Noted for ${action.timeframe}` : 'Noted',
        detail: action.content || null,
      };
    case 'noop':
      return { summary: 'No action taken', detail: action.reason || null };
  }
}
