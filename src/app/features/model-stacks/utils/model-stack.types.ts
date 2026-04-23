// model_ids is an ordered array: [primary, fallback1, fallback2, ...].
// Named slots (primary_model_id, fallback_model_id) cap at a fixed depth and
// inevitably grow into fallback_2_id, fallback_3_id as rate-limit failures
// accumulate. An array is the honest data structure for an ordered cascade.
//
// fast_model_id is separate because it's a deliberate routing choice for
// lightweight subtasks — not a failure fallback.
export interface ModelStack {
  id: string;                      // slug: 'code-reasoning', 'vision', 'budget'
  display_name: string;
  description: string | null;
  model_ids: string[];             // ordered fallback cascade, primary first
  fast_model_id: string | null;    // cheap pass for lightweight work in this domain
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type CreateModelStackPayload = Omit<ModelStack, 'created_at' | 'updated_at'>;
export type UpdateModelStackPayload = Partial<Omit<ModelStack, 'id' | 'created_at' | 'updated_at'>>;
