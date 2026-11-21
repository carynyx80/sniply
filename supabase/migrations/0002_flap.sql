-- Flap launch preparation (metadata CID, vanity salt, predicted token) stored per draft.
alter table token_drafts add column if not exists flap jsonb;
