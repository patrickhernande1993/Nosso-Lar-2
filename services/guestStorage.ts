import { Guest, GuestSide } from '../types';
import { supabase } from '../lib/supabase';

export const GuestService = {
  getAll: async (): Promise<Guest[]> => {
    const { data, error } = await supabase
      .from('guests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar convidados:', error);
      // Fallback gracioso caso a tabela não exista ainda
      return [];
    }

    return data.map((item: any) => ({
      id: item.id,
      name: item.name,
      side: item.side as GuestSide,
      createdAt: new Date(item.created_at).getTime(),
    }));
  },

  add: async (name: string, side: GuestSide): Promise<Guest | null> => {
    const newGuest = {
      name,
      side,
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('guests')
      .insert([newGuest])
      .select()
      .single();

    if (error) {
      console.error('Erro ao adicionar convidado:', error);
      throw error;
    }

    return {
      id: data.id,
      name: data.name,
      side: data.side,
      createdAt: new Date(data.created_at).getTime()
    };
  },

  delete: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('guests')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao deletar convidado:', error);
      throw error;
    }
  }
};