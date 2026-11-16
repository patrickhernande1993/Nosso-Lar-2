-- Nosso Lar · Subcategorias (grupos de categorias)
-- Rode este script UMA vez no Supabase: SQL Editor > New query > colar > Run.
--
-- O que ele faz:
--   1. Adiciona duas colunas na tabela de categorias:
--        is_group   -> a categoria é um grupo (ex.: Moradia) e não recebe lançamentos
--        parent_key -> o grupo ao qual a categoria pertence (vazio = sem grupo)
--   2. Cria o grupo "Moradia" e coloca dentro dele: Financiamento, Notas Promissórias,
--      Condomínio, IPTU e Móveis Planejados.
-- Nenhum lançamento (tabela expenses) é alterado.

alter table public.categories
  add column if not exists is_group boolean not null default false,
  add column if not exists parent_key text references public.categories(key) on update cascade on delete restrict;

alter table public.categories drop constraint if exists categories_parent_not_self;
alter table public.categories add constraint categories_parent_not_self check (parent_key is null or parent_key <> key);

-- Grupo Moradia (fica no topo do menu)
insert into public.categories (key, name, description, icon, color, sort_order, is_group)
values ('MORADIA', 'Moradia', 'Financiamento, condomínio, impostos e tudo do apartamento.', 'Home', '#2f6b57', 0, true)
on conflict (key) do update set is_group = true;

-- Subcategorias de Moradia, na ordem em que aparecem dentro do grupo
update public.categories c
set parent_key = 'MORADIA', sort_order = v.ord
from (values ('INSTALLMENT', 1), ('FEE', 2), ('IPTU', 3), ('FURNITURE', 4), ('NOTE', 5)) as v(key, ord)
where c.key = v.key;

notify pgrst, 'reload schema';
