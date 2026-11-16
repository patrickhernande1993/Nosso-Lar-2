-- Nosso Lar · Pagantes e divisão de despesas
-- Rode este script UMA vez no Supabase: SQL Editor > New query > colar > Run.
-- Cria duas tabelas novas. Nenhuma despesa existente é alterada.

-- 1) Pagantes: pessoas que dividem despesas com vocês
create table if not exists public.payers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text not null default '#5279a3',
  created_at timestamptz not null default now()
);

-- 2) Divisões: quanto cada pagante deve de uma despesa e se já reembolsou.
--    O tipo de expense_id é copiado de expenses.id para a ligação funcionar.
do $$
declare
  id_type text;
begin
  select format_type(atttypid, atttypmod) into id_type
  from pg_attribute
  where attrelid = 'public.expenses'::regclass and attname = 'id';

  execute format($f$
    create table if not exists public.expense_shares (
      id uuid primary key default gen_random_uuid(),
      expense_id %s not null references public.expenses(id) on delete cascade,
      payer_id uuid not null references public.payers(id) on delete restrict,
      amount numeric(12,2) not null check (amount > 0),
      reimbursed boolean not null default false,
      reimbursed_at timestamptz,
      created_at timestamptz not null default now()
    )$f$, id_type);
end $$;

create index if not exists expense_shares_expense_idx on public.expense_shares (expense_id);
create index if not exists expense_shares_payer_idx on public.expense_shares (payer_id);

-- O app não usa login (chave anon), igual às outras tabelas.
alter table public.payers enable row level security;
alter table public.expense_shares enable row level security;

drop policy if exists "payers_anon_all" on public.payers;
create policy "payers_anon_all" on public.payers
  for all to anon, authenticated using (true) with check (true);

drop policy if exists "expense_shares_anon_all" on public.expense_shares;
create policy "expense_shares_anon_all" on public.expense_shares
  for all to anon, authenticated using (true) with check (true);

notify pgrst, 'reload schema';
