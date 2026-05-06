import type { Model } from './model';

// Pricing values in seed mode use OpenRouter's $/token string convention.
// Display layers convert to $/MTok at render time.
export const MODELS = [
  {
    id: 'anthropic/claude-haiku-4-5',
    name: 'claude-haiku-4-5',
    description: 'Cheap, fast, good for grooming.',
    metadata: {
      status: 'preferred',
      source: 'openrouter',
      provider: 'anthropic',
      classes: ['fast', 'vision'],
      canonical_slug: 'anthropic/claude-haiku-4-5',
      context_length: 200000,
      architecture: {
        modality: 'text+image->text',
        input_modalities: ['text', 'image'],
        output_modalities: ['text'],
        tokenizer: 'Claude',
        instruct_type: null,
      },
      pricing: {
        prompt: '0.000001',
        completion: '0.000005',
        input_cache_read: '0.0000001',
        input_cache_write: '0.00000125',
      },
      supported_parameters: ['max_tokens', 'temperature', 'tools', 'tool_choice'],
    },
    body: '\nUsed by vault-grooming/* skills.\n',
  },
  {
    id: 'anthropic/claude-sonnet-4-6',
    name: 'claude-sonnet-4-6',
    description: 'Balanced quality + cost.',
    metadata: {
      status: 'preferred',
      source: 'openrouter',
      provider: 'anthropic',
      classes: ['frontier', 'vision'],
      canonical_slug: 'anthropic/claude-sonnet-4-6',
      context_length: 200000,
      architecture: {
        modality: 'text+image->text',
        input_modalities: ['text', 'image'],
        output_modalities: ['text'],
        tokenizer: 'Claude',
        instruct_type: null,
      },
      pricing: {
        prompt: '0.000003',
        completion: '0.000015',
        input_cache_read: '0.0000003',
        input_cache_write: '0.00000375',
      },
      supported_parameters: ['max_tokens', 'temperature', 'tools', 'tool_choice', 'reasoning'],
    },
    body: '\nUsed by code/pr-from-issue + research.\n',
  },
  {
    id: 'anthropic/claude-opus-4-7',
    name: 'claude-opus-4-7',
    description: 'Highest capability. Used as the premium step in multi-stage stacks.',
    metadata: {
      status: 'preferred',
      source: 'openrouter',
      provider: 'anthropic',
      classes: ['frontier', 'vision', 'long-context'],
      canonical_slug: 'anthropic/claude-opus-4-7',
      context_length: 200000,
      architecture: {
        modality: 'text+image->text',
        input_modalities: ['text', 'image'],
        output_modalities: ['text'],
        tokenizer: 'Claude',
        instruct_type: null,
      },
      pricing: {
        prompt: '0.000015',
        completion: '0.000075',
        input_cache_read: '0.0000015',
        input_cache_write: '0.00001875',
      },
      supported_parameters: ['max_tokens', 'temperature', 'tools', 'tool_choice', 'reasoning'],
    },
    body: '\nUsed as the premium tier in claude-cheap-to-premium stack.\n',
  },
] as const satisfies readonly Model[];
