-- Nosso Lar · Trancar o banco para usuários logados
--
-- ATENÇÃO À ORDEM:
--   1. Publique a versão do app que tem a tela de login.
--   2. Crie as contas de vocês (Authentication > Users > Add user) e confirme que conseguem entrar.
--   3. Só então rode este script (SQL Editor > New query > colar > Run).
-- Se rodar antes, o app antigo (sem login) para de mostrar os dados.
--
-- O script remove as regras antigas que liberavam acesso para qualquer pessoa com a chave
-- pública do app e cria regras novas: só quem estiver logado lê e grava. Nenhum dado é apagado.

do $$
declare
  t text;
  pol record;
begin
  foreach t in array array['expenses', 'categories', 'payers', 'expense_shares', 'guests'] loop
    if to_regclass('public.' || t) is null then
      continue; -- tabela não existe neste projeto
    end if;

    for pol in select policyname from pg_policies where schemaname = 'public' and tablename = t loop
      execute format('drop policy %I on public.%I', pol.policyname, t);
    end loop;

    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy %I on public.%I for all to authenticated using (true) with check (true)',
      t || '_somente_logados', t
    );
  end loop;
end $$;

-- Comprovantes e documentos (bucket "receipts"): envio, troca e exclusão só para usuários logados.
-- Os links públicos já gerados continuam abrindo normalmente.
do $$
declare
  pol record;
begin
  for pol in
    select policyname from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and (coalesce(qual, '') ilike '%receipts%' or coalesce(with_check, '') ilike '%receipts%')
  loop
    execute format('drop policy %I on storage.objects', pol.policyname);
  end loop;
end $$;

create policy "receipts_somente_logados" on storage.objects
  for all to authenticated
  using (bucket_id = 'receipts')
  with check (bucket_id = 'receipts');

notify pgrst, 'reload schema';
