// Mirror of OpenRouter's model schema. Field names + units match upstream
// verbatim so a sync job can replace this slice wholesale without translation.
//
// Reference: https://openrouter.ai/docs/client-sdks/typescript/api-reference/models

export interface OpenRouterArchitecture {
  modality: string;                 // 'text->text', 'text+image->text', etc.
  input_modalities: string[];       // ['text', 'image', 'audio', ...]
  output_modalities: string[];      // ['text']
  tokenizer: string;
  instruct_type: string | null;
}

// All prices are strings expressed as USD per token (OpenRouter convention).
// Display layers convert to $/MTok at render time.
export interface OpenRouterPricing {
  prompt: string;
  completion: string;
  web_search?: string;
  input_cache_read?: string;
  input_cache_write?: string;
}

export interface OpenRouterTopProvider {
  context_length: number;
  max_completion_tokens: number | null;
  is_moderated: boolean;
}
