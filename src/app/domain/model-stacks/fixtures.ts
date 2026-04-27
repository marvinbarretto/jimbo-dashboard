import type { ModelStack } from './model-stack';

export const MODEL_STACKS = [
  {
    id: 'claude-cheap-to-premium',
    name: 'claude-cheap-to-premium',
    description: 'Try Haiku, fall back to Sonnet, then Opus.',
    metadata: {
      chain: [
        'anthropic/claude-haiku-4-5-20251001',
        'anthropic/claude-sonnet-4-6',
        'anthropic/claude-opus-4-7',
      ],
    },
    body: '\nWill back grooming once fallback support lands.\n',
  },
] as const satisfies readonly ModelStack[];
