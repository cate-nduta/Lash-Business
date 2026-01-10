-- Creates the generic JSON document store used by the app
create table if not exists public.app_documents (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- Optional: quickly check when the document was last touched
create index if not exists app_documents_updated_at_idx on public.app_documents (updated_at desc);

-- Enable RLS (Row Level Security)
-- Note: Service role key bypasses RLS automatically, so admin operations will work
-- RLS is enabled for future security enhancements, but service role operations are not blocked
alter table public.app_documents enable row level security;

-- Optional: Create a policy for authenticated users (if needed in the future)
-- The service role key bypasses RLS, so this is mainly for future client-side access
-- Uncomment and customize if you need authenticated user access:
-- drop policy if exists "Authenticated users can read all documents" on public.app_documents;
-- create policy "Authenticated users can read all documents"
--   on public.app_documents
--   for select
--   using (auth.role() = 'authenticated');

