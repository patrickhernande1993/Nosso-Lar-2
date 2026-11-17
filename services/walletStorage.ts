import { supabase } from '../lib/supabase';
import { Account, AccountType, CreditCard } from '../types';

const toAccount = (r: any): Account => ({
  id: r.id,
  name: r.name,
  type: (r.type || 'checking') as AccountType,
  owner: r.owner ?? null,
  initialBalance: Number(r.initial_balance) || 0,
  initialInvested: Number(r.initial_invested_balance) || 0,
  color: r.color || '#2f6b57',
});

const toCard = (r: any): CreditCard => ({
  id: r.id,
  name: r.name,
  owner: r.owner ?? null,
  color: r.color || '#5279a3',
  creditLimit: Number(r.credit_limit) || 0,
  closingDay: Number(r.closing_day) || 1,
  dueDay: Number(r.due_day) || 10,
  accountId: r.account_id ?? null,
});

const accountRow = (a: Omit<Account, 'id'>) => ({
  name: a.name,
  type: a.type,
  owner: a.owner,
  initial_balance: a.initialBalance,
  initial_invested_balance: a.initialInvested,
  color: a.color,
});

const cardRow = (c: Omit<CreditCard, 'id'>) => ({
  name: c.name,
  owner: c.owner,
  color: c.color,
  credit_limit: c.creditLimit,
  closing_day: c.closingDay,
  due_day: c.dueDay,
  account_id: c.accountId,
});

export const WalletService = {
  /** Se as tabelas não existirem (script supabase_contas_cartoes.sql), tableMissing = true. */
  list: async (): Promise<{ accounts: Account[]; cards: CreditCard[]; tableMissing: boolean; reserveMissing: boolean }> => {
    const [acc, cards, reserveCol] = await Promise.all([
      supabase.from('accounts').select('*').order('name'),
      supabase.from('credit_cards').select('*').order('name'),
      // Coluna criada por supabase_reserva.sql
      supabase.from('expenses').select('reserve_account_id').limit(1),
    ]);
    if (acc.error || cards.error) {
      console.warn('Contas/cartões indisponíveis:', (acc.error || cards.error)?.message);
      return { accounts: [], cards: [], tableMissing: true, reserveMissing: true };
    }
    return { accounts: (acc.data ?? []).map(toAccount), cards: (cards.data ?? []).map(toCard), tableMissing: false, reserveMissing: !!reserveCol.error };
  },

  saveAccount: async (a: Omit<Account, 'id'> & { id?: string }) => {
    const { error } = a.id
      ? await supabase.from('accounts').update(accountRow(a)).eq('id', a.id)
      : await supabase.from('accounts').insert([accountRow(a)]);
    if (error) throw error;
  },

  saveCard: async (c: Omit<CreditCard, 'id'> & { id?: string }) => {
    const { error } = c.id
      ? await supabase.from('credit_cards').update(cardRow(c)).eq('id', c.id)
      : await supabase.from('credit_cards').insert([cardRow(c)]);
    if (error) throw error;
  },

  removeAccount: async (id: string) => {
    const { error } = await supabase.from('accounts').delete().eq('id', id);
    if (error) throw error;
  },

  removeCard: async (id: string) => {
    const { error } = await supabase.from('credit_cards').delete().eq('id', id);
    if (error) throw error;
  },

  /** Quantos lançamentos usam a conta/cartão (para avisar antes de excluir). */
  countUsage: async (column: 'account_id' | 'card_id', id: string): Promise<number> => {
    const { count, error } = await supabase.from('expenses').select('id', { count: 'exact', head: true }).eq(column, id);
    if (error) throw error;
    return count ?? 0;
  },
};
