create table if not exists public.payment_settings (
  id boolean primary key default true check (id),
  pix_enabled boolean not null default true,
  card_enabled boolean not null default true,
  environment text not null default 'sandbox' check (environment in ('sandbox', 'production')),
  api_key_ciphertext text,
  api_key_iv text,
  webhook_token_ciphertext text,
  webhook_token_iv text,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);
alter table public.payment_settings enable row level security;
revoke all on public.payment_settings from anon, authenticated;
grant select, insert, update on public.payment_settings to service_role;
insert into public.payment_settings (id) values (true) on conflict (id) do nothing;