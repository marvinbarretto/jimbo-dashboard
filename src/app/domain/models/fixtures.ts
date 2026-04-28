import type { Model } from './model';

export const MODELS = [
  {
    id: 'anthropic/claude-haiku-4-5-20251001',
    name: 'claude-haiku-4-5-20251001',
    description: 'Cheap, fast, good for grooming.',
    metadata: {
      status: 'preferred',
      provider: 'anthropic',
      context_window: 200000,
      prices_usd_per_million: { input: 1, output: 5, cache_read: 0.1, cache_write: 1.25 },
    },
    body: '\nUsed by vault-grooming/* skills.\n',
  },
  {
    id: 'anthropic/claude-sonnet-4-6',
    name: 'claude-sonnet-4-6',
    description: 'Balanced quality + cost.',
    metadata: {
      status: 'preferred',
      provider: 'anthropic',
      context_window: 200000,
      prices_usd_per_million: { input: 3, output: 15, cache_read: 0.3, cache_write: 3.75 },
    },
    body: '\nUsed by code/pr-from-issue + research.\n',
  },
  {
    id: 'anthropic/claude-opus-4-7',
    name: 'claude-opus-4-7',
    description: 'Highest capability. Used as the premium step in multi-stage stacks.',
    metadata: {
      status: 'preferred',
      provider: 'anthropic',
      context_window: 200000,
      prices_usd_per_million: { input: 15, output: 75, cache_read: 1.5, cache_write: 18.75 },
    },
    body: '\nUsed as the premium tier in claude-cheap-to-premium stack.\n',
  },
] as const satisfies readonly Model[];
