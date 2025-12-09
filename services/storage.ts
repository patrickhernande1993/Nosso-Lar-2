import { ExpenseItem, ExpenseType, ExpenseStatus } from '../types';
import { supabase } from '../lib/supabase';

// Função auxiliar para upload de arquivo
const uploadReceipt = async (file: File): Promise<string | null> => {
  try {
    // Gera um nome de arquivo seguro usando Timestamp + String Aleatória
    // Isso evita problemas com acentos, espaços e caracteres especiais do SO do usuário
    const fileExt = file.name.split('.').pop() || 'unknown';
    const randomString = Math.random().toString(36).substring(2, 10);
    const fileName = `${Date.now()}_${randomString}.${fileExt}`;
    const filePath = `${fileName}`;

    console.log('Iniciando upload seguro:', filePath);

    // Upload com upsert true para garantir escrita
    const { error: uploadError } = await supabase.storage
      .from('receipts')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) {
      console.error('Erro detalhado do Supabase Storage:', uploadError);
      throw uploadError;
    }

    // Obtém a URL pública
    const { data } = supabase.storage
      .from('receipts')
      .getPublicUrl(filePath);

    console.log('Upload sucesso, URL gerada:', data.publicUrl);
    return data.publicUrl;
  } catch (error) {
    console.error('FALHA CRÍTICA NO UPLOAD:', error);
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
      receiptUrl: item.receipt_url,
      status: item.status || 'PENDING' // Fallback para registros antigos
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
      receiptUrl: item.receipt_url,
      status: item.status || 'PENDING'
    }));
  },

  add: async (item: ExpenseItem, file?: File): Promise<void> => {
    let receiptUrl = item.receiptUrl;

    if (file) {
      console.log('Arquivo detectado para upload (Novo Item)...');
      const uploadedUrl = await uploadReceipt(file);
      if (uploadedUrl) {
          receiptUrl = uploadedUrl;
      } else {
          // Se falhar o upload, lançamos erro para não salvar o registro sem o anexo
          throw new Error("Falha no upload do comprovante. O registro não foi salvo.");
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
      receipt_url: receiptUrl,
      status: item.status
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
      console.log('Arquivo detectado para atualização (Edit Item)...');
      const uploadedUrl = await uploadReceipt(file);
      if (uploadedUrl) {
        receiptUrl = uploadedUrl;
      } else {
        throw new Error("Falha no upload do novo comprovante.");
      }
    }

    const dbItem = {
      type: updatedItem.type,
      description: updatedItem.description,
      amount: updatedItem.amount,
      date: updatedItem.date,
      month_year: updatedItem.monthYear,
      receipt_url: receiptUrl,
      status: updatedItem.status
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