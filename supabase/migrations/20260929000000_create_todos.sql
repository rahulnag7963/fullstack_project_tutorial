-- Each row is one todo that belongs to exactly one user.
create table public.todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  note text not null default '' check (char_length(note) <= 200),
  done boolean not null default false,
  created_at timestamptz not null default now()
);

-- Makes "all todos for this user, oldest first" fast.
create index todos_user_id_created_at_idx on public.todos (user_id, created_at);

-- Only logged-in users may touch this table at all. Visitors who are not logged in get nothing.
revoke all on public.todos from anon;
grant select, insert, update, delete on public.todos to authenticated;

-- ROW LEVEL SECURITY: the database itself refuses to show or change another user's rows,
-- even if the server code had a bug. This is the second lock behind the Express server.
alter table public.todos enable row level security;

create policy "Users can read their own todos"
  on public.todos for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create todos for themselves"
  on public.todos for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own todos"
  on public.todos for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own todos"
  on public.todos for delete to authenticated
  using ((select auth.uid()) = user_id);
