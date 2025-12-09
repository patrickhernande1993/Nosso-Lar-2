import { ExpenseItem, ExpenseType } from '../types';
import { supabase } from '../lib/supabase';

// Função auxiliar para upload de arquivo
const uploadReceipt = async (file: File): Promise<string | null> => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('receipts')
      .upload(filePath, file);

    if (uploadError) {
      console.error('Erro no upload:', uploadError);
      throw uploadError;
    }

    const { data } = supabase.storage
      .from('receipts')
      .getPublicUrl(filePath);

    return data.publicUrl;
  } catch (error) {
    console.error('Erro ao fazer upload do comprovante:', error);
    return null;
  }
};

export const StorageService = {
  getAll: async (): Promise<ExpenseItem[]> => {
    const { data, error } = await supabase
      .from('expenses')
      .select('*');

    if (error) {
      console.error('Erro ao buscar dados:', error);
      return [];
    }

    return data.map((item: any) => ({
      id: item.id,
      type: item.type as ExpenseType,
      description: item.description,
      amount: item.amount,
      date: item.date,
      monthYear: item.month_year,
      createdAt: item.created_at,
      receiptUrl: item.receipt_url // Mapeamento do novo campo
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
      createdAt: item.created_at,
      receiptUrl: item.receipt_url
    }));
  },

  add: async (item: ExpenseItem, file?: File): Promise<void> => {
    let receiptUrl = item.receiptUrl;

    if (file) {
      const uploadedUrl = await uploadReceipt(file);
      if (uploadedUrl) receiptUrl = uploadedUrl;
    }

    const dbItem = {
      id: item.id,
      type: item.type,
      description: item.description,
      amount: item.amount,
      date: item.date,
      month_year: item.monthYear,
      created_at: item.createdAt,
      receipt_url: receiptUrl
    };

    const { error } = await supabase
      .from('expenses')
      .insert([dbItem]);

    if (error) {
      console.error('Erro ao salvar:', error);
      throw error;
    }
  },

  update: async (updatedItem: ExpenseItem, file?: File): Promise<void> => {
    let receiptUrl = updatedItem.receiptUrl;

    if (file) {
      const uploadedUrl = await uploadReceipt(file);
      if (uploadedUrl) receiptUrl = uploadedUrl;
    }

    const dbItem = {
      type: updatedItem.type,
      description: updatedItem.description,
      amount: updatedItem.amount,
      date: updatedItem.date,
      month_year: updatedItem.monthYear,
      receipt_url: receiptUrl
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
    // Nota: O ideal seria deletar o arquivo do Storage também, 
    // mas para simplificar vamos apenas remover o registro do banco por enquanto.
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