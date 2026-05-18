-- Figure Atlas · Supabase schema
-- Run this in your Supabase project's SQL editor

create table if not exists access_keys (
  id                 uuid        default gen_random_uuid() primary key,
  key                text        unique not null,
  payment_intent_id  text        unique not null,
  used               boolean     default false,
  created_at         timestamptz default now(),
  used_at            timestamptz
);

-- Fast key lookups
create index if not exists access_keys_key_idx on access_keys (key);

-- Only the service-role key (backend) can read/write — no public access
alter table access_keys enable row level security;

-- No RLS policies needed: service-role bypasses RLS by default.
-- Public (anon) key has zero access to this table.
