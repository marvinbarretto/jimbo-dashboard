-- Phase A1 hotfix: remove the dispatch_queue.skill → skills.id FK so production
-- runners (Boris/Ralph) can enqueue skills again. The flat-slug rename in 0008
-- broke runners that read slash paths from the filesystem registry. This
-- migration drops the FK; Phase A2 then drops the skills table entirely once
-- the filesystem-backed gate lands. Empty data step intentional — verified
-- 0 rows currently reference flat slugs in dispatch_queue.skill.

ALTER TABLE "dispatch_queue" DROP CONSTRAINT IF EXISTS "dispatch_queue_skill_skills_id_fk";
