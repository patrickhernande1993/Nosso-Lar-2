import { ExpenseItem, ExpenseType } from '../types';
import { supabase } from '../lib/supabase';

// Função auxiliar para upload de arquivo
const uploadReceipt = async (file: File): Promise<string | null> => {
  try {
    // Sanitizar o nome do arquivo (remove acentos e caracteres especiais)
    const fileExt = file.name.split('.').pop();
    const cleanFileName = file.name
        .replace(/[^a-zA-Z0-9]/g, '') // Remove tudo que não for letra ou número
        .substring(0, 20); // Limita tamanho
        
    const fileName = `${Date.now()}-${cleanFileName}.${fileExt}`;
    const filePath = `${fileName}`;

    console.log('Iniciando upload:', filePath);

    const { error: uploadError } = await supabase.storage
      .from('receipts')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Erro detalhado do Supabase Storage:', uploadError);
      throw uploadError;
    }

    const { data } = supabase.storage
      .from('receipts')
      .getPublicUrl(filePath);

    console.log('Upload sucesso, URL:', data.publicUrl);
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
      receiptUrl: item.receipt_url
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
      console.log('Arquivo detectado para upload...');
      const uploadedUrl = await uploadReceipt(file);
      if (uploadedUrl) {
          receiptUrl = uploadedUrl;
      } else {
          console.warn('Upload falhou, salvando registro sem anexo.');
      }
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
      console.error('Erro ao salvar no banco:', error);
      throw error;
    }
  },

  update: async (updatedItem: ExpenseItem, file?: File): Promise<void> => {
    let receiptUrl = updatedItem.receiptUrl;

    if (file) {
      console.log('Arquivo detectado para atualização...');
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
      console.error('Erro ao atualizar no banco:', error);
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