-- Add 'answer' to the thread_messages kind check constraint.
-- 'correction' is retained because 1 existing row uses it.
ALTER TABLE thread_messages DROP CONSTRAINT IF EXISTS thread_messages_kind_check;
ALTER TABLE thread_messages ADD CONSTRAINT thread_messages_kind_check
  CHECK (kind IN ('comment', 'question', 'answer', 'correction', 'rejection'));
