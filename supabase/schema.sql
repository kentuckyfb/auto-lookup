create table if not exists public.vehicle_cache (
  cache_key text primary key,
  year integer not null,
  make text not null,
  model text not null,
  source text not null,
  payload jsonb not null,
  fetched_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists vehicle_cache_expiry_idx on public.vehicle_cache (expires_at);

create table if not exists public.provider_connections (
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  encrypted_key text not null,
  key_hint text not null,
  verified_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, provider)
);

alter table public.vehicle_cache enable row level security;
alter table public.provider_connections enable row level security;

-- Server routes use the service role. Signed-in users may only see safe connection metadata.
create policy "read own provider metadata" on public.provider_connections
  for select to authenticated
  using (auth.uid() = user_id);

revoke all on public.vehicle_cache from anon, authenticated;
revoke all on public.provider_connections from anon, authenticated;
grant select (provider, key_hint, verified_at) on public.provider_connections to authenticated;
