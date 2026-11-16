import { supabase } from '../lib/supabase';
import { Payer, ExpenseShare, ShareDraft } from '../types';

const mapShare = (row: any): ExpenseShare => ({
  id: row.id,
  expenseId: String(row.expense_id),
  payerId: row.payer_id,
  amount: Number(row.amount),
  reimbursed: !!row.reimbursed,
});

export const PayerService = {
  /** Se as tabelas ainda não existirem, devolve tableMissing = true e o app esconde a divisão. */
  list: async (): Promise<{ payers: Payer[]; tableMissing: boolean }> => {
    const { data, error } = await supabase.from('payers').select('id, name, color').order('name');
    if (error) {
      console.warn('Tabela de pagantes indisponível:', error.message);
      return { payers: [], tableMissing: true };
    }
    return { payers: data as Payer[], tableMissing: false };
  },

  create: async (payer: Omit<Payer, 'id'>): Promise<void> => {
    const { error } = await supabase.from('payers').insert([payer]);
    if (error) throw error;
  },

  update: async (id: string, changes: Omit<Payer, 'id'>): Promise<void> => {
    const { error } = await supabase.from('payers').update(changes).eq('id', id);
    if (error) throw error;
  },

  remove: async (id: string): Promise<void> => {
    const { error } = await supabase.from('payers').delete().eq('id', id);
    if (error) throw error;
  },

  countShares: async (payerId: string): Promise<number> => {
    const { count, error } = await supabase
      .from('expense_shares')
      .select('id', { count: 'exact', head: true })
      .eq('payer_id', payerId);
    if (error) throw error;
    return count ?? 0;
  },
};

export const ShareService = {
  getAll: async (): Promise<ExpenseShare[]> => {
    const { data, error } = await supabase.from('expense_shares').select('id, expense_id, payer_id, amount, reimbursed');
    if (error) return [];
    return (data ?? []).map(mapShare);
  },

  /** Substitui todas as divisões de uma despesa pelas informadas. */
  replaceForExpense: async (expenseId: string, shares: ShareDraft[]): Promise<void> => {
    const { error: delError } = await supabase.from('expense_shares').delete().eq('expense_id', expenseId);
    if (delError) throw delError;
    if (shares.length === 0) return;
    const { error } = await supabase.from('expense_shares').insert(
      shares.map(s => ({
        expense_id: expenseId,
        payer_id: s.payerId,
        amount: s.amount,
        reimbursed: s.reimbursed,
        reimbursed_at: s.reimbursed ? new Date().toISOString() : null,
      }))
    );
    if (error) throw error;
  },

  /** Cria as mesmas divisões para várias despesas (geração em lote). */
  addForExpenses: async (expenseIds: string[], shares: ShareDraft[]): Promise<void> => {
    if (shares.length === 0 || expenseIds.length === 0) return;
    const rows = expenseIds.flatMap(expenseId =>
      shares.map(s => ({ expense_id: expenseId, payer_id: s.payerId, amount: s.amount, reimbursed: false }))
    );
    const { error } = await supabase.from('expense_shares').insert(rows);
    if (error) throw error;
  },

  setReimbursed: async (shareId: string, reimbursed: boolean): Promise<void> => {
    const { error } = await supabase
      .from('expense_shares')
      .update({ reimbursed, reimbursed_at: reimbursed ? new Date().toISOString() : null })
      .eq('id', shareId);
    if (error) throw error;
  },
};
