-- Nosso Lar: método de pagamento (Pix, Débito, Cartão de crédito, Dinheiro, Boleto...).
-- Rode uma vez no SQL Editor do Supabase.
alter table public.expenses add column if not exists payment_method text;
alter table public.expense_shares add column if not exists payment_method text;
