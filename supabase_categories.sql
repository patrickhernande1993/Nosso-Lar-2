-- Nosso Lar · Categorias dinâmicas
-- Rode este script UMA vez no Supabase: Dashboard > SQL Editor > New query > colar > Run.
-- Ele cria a tabela de categorias e cadastra as 6 categorias que já existem no app,
-- mantendo os mesmos códigos (key) usados na coluna expenses.type. Nenhum lançamento é alterado.

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,              -- valor gravado em expenses.type
  name text not null,
  description text not null default '',
  icon text not null default 'Wallet',   -- nome do ícone (lucide)
  color text not null default '#2f6b57',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- O app não usa login (acessa com a chave anon), igual à tabela expenses.
alter table public.categories enable row level security;

drop policy if exists "categories_anon_all" on public.categories;
create policy "categories_anon_all" on public.categories
  for all to anon, authenticated
  using (true) with check (true);

insert into public.categories (key, name, description, icon, color, sort_order) values
  ('INSTALLMENT', 'Financiamento',      'Parcelas do financiamento do imóvel.',  'CreditCard', '#2f6b57', 1),
  ('NOTE',        'Notas Promissórias', 'Débitos avulsos e pagamentos únicos.',  'FileText',   '#c46a3c', 2),
  ('FEE',         'Condomínio',         'Arrecadação mensal do condomínio.',     'Wallet',     '#c99a2e', 3),
  ('IPTU',        'IPTU',               'Imposto Predial e Territorial Urbano.', 'Landmark',   '#5279a3', 4),
  ('FURNITURE',   'Móveis Planejados',  'Custos com mobília e marcenaria.',      'Sofa',       '#8a6aa6', 5),
  ('UTILITIES',   'Energia Elétrica',   'Histórico das contas de luz.',          'Zap',        '#7f9150', 6)
on conflict (key) do nothing;

-- Atualiza o cache da API para a tabela aparecer imediatamente
notify pgrst, 'reload schema';
