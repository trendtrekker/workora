alter table workora.internal_users add column if not exists password_hash text;
alter table workora.internal_users add column if not exists password_salt text;
alter table workora.internal_users add column if not exists mfa_secret text;
create table if not exists workora.mfa_challenges (id uuid primary key, user_id uuid not null references workora.internal_users(id) on delete cascade, expires_at timestamptz not null, used_at timestamptz);
create index if not exists mfa_challenges_active_idx on workora.mfa_challenges(user_id, expires_at) where used_at is null;
