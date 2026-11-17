-- Nosso Lar · Recebimentos (entradas de dinheiro)
-- Rode este script UMA vez no Supabase: SQL Editor > New query > colar > Run.
--
-- O que ele faz:
--   1. categories.kind  -> diz se a categoria é de DESPESA ('EXPENSE') ou de RECEBIMENTO ('INCOME').
--                          Todas as categorias atuais continuam como despesa.
--   2. expenses.receiver -> quem recebeu (Isabelly, Patrick ou Ambos). Só é usado em recebimentos.
--   3. Cria as categorias de recebimento "Salário" e "Extras".
-- Nenhum lançamento existente é alterado.

alter table public.categories
  add column if not exists kind text not null default 'EXPENSE';

alter table public.categories drop constraint if exists categories_kind_check;
alter table public.categories add constraint categories_kind_check check (kind in ('EXPENSE', 'INCOME'));

alter table public.expenses
  add column if not exists receiver text;

-- Categorias de recebimento iniciais (aparecem na seção "Recebimentos" do menu)
insert into public.categories (key, name, description, icon, color, sort_order, kind)
values
  ('SALARIO', 'Salário', 'Salários e pró-labore.', 'Briefcase', '#2f6b57', 1, 'INCOME'),
  ('EXTRAS',  'Extras',  'Freelas, vendas, restituições e outras entradas.', 'Coins', '#3d8a8a', 2, 'INCOME')
on conflict (key) do nothing;

notify pgrst, 'reload schema';
