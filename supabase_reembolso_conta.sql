-- Nosso Lar: guarda em qual conta cada reembolso de pagante foi recebido.
-- Rode uma vez no SQL Editor do Supabase.
alter table public.expense_shares
  add column if not exists account_id uuid references public.accounts(id) on delete set null;
