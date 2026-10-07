create table if not exists public.portfolio_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.portfolio_admins enable row level security;
revoke all on public.portfolio_admins from anon, authenticated;

create or replace function public.is_portfolio_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.portfolio_admins
    where user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_portfolio_admin() from public;
grant execute on function public.is_portfolio_admin() to anon, authenticated;

create table if not exists public.project_documentation (
  id bigint generated always as identity primary key,
  project_slug text not null check (length(project_slug) between 1 and 100),
  storage_path text not null unique,
  caption text not null default '' check (length(caption) <= 240),
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now()
);

create index if not exists project_documentation_project_created_idx
  on public.project_documentation (project_slug, created_at desc);

alter table public.project_documentation enable row level security;
grant select on public.project_documentation to anon, authenticated;
grant insert, delete on public.project_documentation to authenticated;
grant usage, select on sequence public.project_documentation_id_seq to authenticated;

drop policy if exists "Anyone can view project documentation" on public.project_documentation;
create policy "Anyone can view project documentation"
  on public.project_documentation for select
  to anon, authenticated
  using (true);

drop policy if exists "Admins can add project documentation" on public.project_documentation;
create policy "Admins can add project documentation"
  on public.project_documentation for insert
  to authenticated
  with check (public.is_portfolio_admin() and created_by = (select auth.uid()));

drop policy if exists "Admins can remove project documentation" on public.project_documentation;
create policy "Admins can remove project documentation"
  on public.project_documentation for delete
  to authenticated
  using (public.is_portfolio_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'project-documentation',
  'project-documentation',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Anyone can view project documentation files" on storage.objects;
create policy "Anyone can view project documentation files"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'project-documentation');

drop policy if exists "Admins can upload project documentation files" on storage.objects;
create policy "Admins can upload project documentation files"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'project-documentation' and public.is_portfolio_admin());

drop policy if exists "Admins can remove project documentation files" on storage.objects;
create policy "Admins can remove project documentation files"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'project-documentation' and public.is_portfolio_admin());

-- After creating the admin account in Supabase Authentication, add its UUID:
-- insert into public.portfolio_admins (user_id)
-- values ('PASTE_THE_AUTH_USER_UUID_HERE');
