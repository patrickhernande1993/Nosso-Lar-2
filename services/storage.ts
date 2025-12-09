import { ExpenseItem, ExpenseType } from '../types';
import { supabase } from '../lib/supabase';

export const StorageService = {
  getAll: async (): Promise<ExpenseItem[]> => {
    const { data, error } = await supabase
      .from('expenses')
      .select('*');

    if (error) {
      console.error('Erro ao buscar dados:', error);
      return [];
    }

    // Mapear snake_case do banco para camelCase da aplicação
    return data.map((item: any) => ({
      id: item.id,
      type: item.type as ExpenseType,
      description: item.description,
      amount: item.amount,
      date: item.date,
      monthYear: item.month_year,
      createdAt: item.created_at
    }));
  },

  getByType: async (type: ExpenseType): Promise<ExpenseItem[]> => {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('type', type);

    if (error) {
      console.error('Erro ao buscar dados por tipo:', error);
      return [];
    }

    return data.map((item: any) => ({
      id: item.id,
      type: item.type as ExpenseType,
      description: item.description,
      amount: item.amount,
      date: item.date,
      monthYear: item.month_year,
      createdAt: item.created_at
    }));
  },

  add: async (item: ExpenseItem): Promise<void> => {
    // Preparar objeto para o banco (snake_case e remover ID para deixar o banco gerar se for novo, 
    // mas se o app gera UUID, podemos passar. O script SQL usa default gen_random_uuid, 
    // mas se passarmos o ID, ele usa o nosso).
    const dbItem = {
      id: item.id,
      type: item.type,
      description: item.description,
      amount: item.amount,
      date: item.date,
      month_year: item.monthYear,
      created_at: item.createdAt
    };

    const { error } = await supabase
      .from('expenses')
      .insert([dbItem]);

    if (error) {
      console.error('Erro ao salvar:', error);
      throw error;
    }
  },

  update: async (updatedItem: ExpenseItem): Promise<void> => {
    const dbItem = {
      type: updatedItem.type,
      description: updatedItem.description,
      amount: updatedItem.amount,
      date: updatedItem.date,
      month_year: updatedItem.monthYear,
      // created_at geralmente não muda
    };

    const { error } = await supabase
      .from('expenses')
      .update(dbItem)
      .eq('id', updatedItem.id);

    if (error) {
      console.error('Erro ao atualizar:', error);
      throw error;
    }
  },

  delete: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao deletar:', error);
      throw error;
    }
  }
};