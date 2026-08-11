-- Run this once in Supabase Dashboard > SQL Editor.
-- Use Email authentication in Supabase: Authentication > Providers > Email.

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('income', 'expense')),
  description text not null,
  amount numeric not null check (amount > 0),
  category text not null,
  date date not null,
  created_at timestamptz not null default now()
);
alter table public.transactions add column if not exists receipt_url text;

create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  "when" timestamptz not null,
  notified boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.transactions enable row level security;
alter table public.reminders enable row level security;

drop policy if exists "Users manage their own transactions" on public.transactions;
drop policy if exists "Users manage their own reminders" on public.reminders;
create policy "Users manage their own transactions" on public.transactions
  for all to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users manage their own reminders" on public.reminders
  for all to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  category text not null, monthly_limit numeric not null check (monthly_limit > 0), created_at timestamptz default now(), unique(user_id, category)
);
create table if not exists public.saving_goals (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  title text not null, target numeric not null check (target > 0), saved numeric not null default 0 check (saved >= 0), target_date date, created_at timestamptz default now()
);
create table if not exists public.recurring_transactions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('income','expense')), description text not null, amount numeric not null check (amount > 0), category text not null, day_of_month int not null check (day_of_month between 1 and 28), created_at timestamptz default now()
);
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  monthly_income numeric check (monthly_income >= 0),
  avatar_url text,
  updated_at timestamptz not null default now()
);
alter table public.profiles add column if not exists avatar_url text;

insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;
drop policy if exists "Public avatar images" on storage.objects;
drop policy if exists "Users manage own avatar" on storage.objects;
create policy "Public avatar images" on storage.objects for select using (bucket_id = 'avatars');
create policy "Users manage own avatar" on storage.objects for all to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid()::text))
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid()::text));

insert into storage.buckets (id, name, public) values ('receipts', 'receipts', true)
on conflict (id) do update set public = true;
drop policy if exists "Public receipt files" on storage.objects;
drop policy if exists "Users manage own receipts" on storage.objects;
create policy "Public receipt files" on storage.objects for select using (bucket_id = 'receipts');
create policy "Users manage own receipts" on storage.objects for all to authenticated
  using (bucket_id = 'receipts' and (storage.foldername(name))[1] = (select auth.uid()::text))
  with check (bucket_id = 'receipts' and (storage.foldername(name))[1] = (select auth.uid()::text));
alter table public.budgets enable row level security;
alter table public.saving_goals enable row level security;
alter table public.recurring_transactions enable row level security;
alter table public.profiles enable row level security;
drop policy if exists "Users manage own budgets" on public.budgets;
drop policy if exists "Users manage own goals" on public.saving_goals;
drop policy if exists "Users manage own recurring" on public.recurring_transactions;
drop policy if exists "Users manage own profile" on public.profiles;
create policy "Users manage own budgets" on public.budgets for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy "Users manage own goals" on public.saving_goals for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy "Users manage own recurring" on public.recurring_transactions for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy "Users manage own profile" on public.profiles for all to authenticated using ((select auth.uid())=id) with check ((select auth.uid())=id);

-- Keep private files private: users may only read files in their own folder.
update storage.buckets set public = false where id in ('avatars', 'receipts');
drop policy if exists "Public avatar images" on storage.objects;
drop policy if exists "Public receipt files" on storage.objects;
drop policy if exists "Users view own avatar" on storage.objects;
drop policy if exists "Users view own receipts" on storage.objects;
create policy "Users view own avatar" on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid()::text));
create policy "Users view own receipts" on storage.objects for select to authenticated
  using (bucket_id = 'receipts' and (storage.foldername(name))[1] = (select auth.uid()::text));

alter table public.reminders add column if not exists repeat_monthly boolean not null default false;

create table if not exists public.goal_contributions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid not null references public.saving_goals(id) on delete cascade,
  amount numeric not null check (amount > 0),
  note text,
  created_at timestamptz not null default now()
);
alter table public.goal_contributions enable row level security;
drop policy if exists "Users manage own goal contributions" on public.goal_contributions;
create policy "Users manage own goal contributions" on public.goal_contributions for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
