-- Nosso Lar · Reserva com conta de origem e destino
-- Rode este script UMA vez no Supabase: SQL Editor > New query > colar > Run.
--
-- Adiciona aos lançamentos a "conta da reserva":
--   - aporte (despesa em categoria de investimento): sai do corrente de account_id
--     e entra na reserva de reserve_account_id;
--   - resgate (recebimento em categoria de investimento): sai da reserva de reserve_account_id
--     e entra no corrente de account_id.
-- Se ficar vazio, vale a mesma conta do lançamento (como era antes). Nada é alterado nos dados.

alter table public.expenses
  add column if not exists reserve_account_id uuid references public.accounts(id) on delete set null;

notify pgrst, 'reload schema';
