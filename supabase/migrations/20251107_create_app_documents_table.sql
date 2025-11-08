-- Creates the generic JSON document store used by the app
create table if not exists public.app_documents (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- Optional: quickly check when the document was last touched
create index if not exists app_documents_updated_at_idx on public.app_documents (updated_at desc);

-- Allow RLS policies to be added later but keep table readable by service role
alter table public.app_documents enable row level security;

