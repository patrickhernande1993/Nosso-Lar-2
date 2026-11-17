-- Nosso Lar · Contas bancárias e cartões de crédito
-- Rode este script UMA vez no Supabase: SQL Editor > New query > colar > Run.
--
-- O que ele faz:
--   1. Cria as tabelas de contas (accounts) e cartões (credit_cards).
--   2. Adiciona aos lançamentos: conta usada, cartão usado, data do pagamento,
--      se foi pago com a reserva (investimentos) e a origem (para a migração).
-- Nenhum lançamento existente é alterado.

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null default 'checking',           -- checking, savings, investment, cash, other
  owner text,                                       -- Isabelly, Patrick ou Ambos
  initial_balance numeric(14,2) not null default 0, -- saldo em conta no início
  initial_invested_balance numeric(14,2) not null default 0, -- reserva / investido no início
  color text not null default '#2f6b57',
  created_at timestamptz not null default now()
);

create table if not exists public.credit_cards (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner text,
  color text not null default '#5279a3',
  credit_limit numeric(14,2) not null default 0,
  closing_day integer not null default 1 check (closing_day between 1 and 31),
  due_day integer not null default 10 check (due_day between 1 and 31),
  account_id uuid references public.accounts(id) on delete set null, -- conta que paga a fatura
  created_at timestamptz not null default now()
);

alter table public.expenses
  add column if not exists account_id uuid references public.accounts(id) on delete set null,
  add column if not exists card_id uuid references public.credit_cards(id) on delete set null,
  add column if not exists payment_date date,
  add column if not exists is_reserve_withdrawal boolean not null default false,
  add column if not exists origem text;

-- Só usuários logados (igual às outras tabelas)
alter table public.accounts enable row level security;
alter table public.credit_cards enable row level security;

drop policy if exists accounts_somente_logados on public.accounts;
create policy accounts_somente_logados on public.accounts for all to authenticated using (true) with check (true);

drop policy if exists credit_cards_somente_logados on public.credit_cards;
create policy credit_cards_somente_logados on public.credit_cards for all to authenticated using (true) with check (true);

notify pgrst, 'reload schema';
