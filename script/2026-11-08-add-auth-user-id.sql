-- 2026-11-08: link local profiles to auth-service users.
-- The book business tables and Client.owner_id are unchanged.
alter table "User" add column if not exists auth_user_id integer;
create unique index if not exists user_auth_user_id_key on "User"(auth_user_id);
