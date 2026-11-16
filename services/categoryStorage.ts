import { supabase } from '../lib/supabase';
import { Category, DEFAULT_CATEGORIES } from '../lib/categories';

const COLUMNS = 'id, key, name, description, icon, color, sort_order';

export const CategoryService = {
  /** Retorna as categorias. Se a tabela ainda não existir, devolve as categorias padrão. */
  list: async (): Promise<{ categories: Category[]; tableMissing: boolean }> => {
    const { data, error } = await supabase
      .from('categories')
      .select(COLUMNS)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      console.warn('Tabela de categorias indisponível, usando padrão:', error.message);
      return { categories: DEFAULT_CATEGORIES, tableMissing: true };
    }
    return { categories: data as Category[], tableMissing: false };
  },

  create: async (category: Omit<Category, 'id'>): Promise<void> => {
    const { error } = await supabase.from('categories').insert([category]);
    if (error) throw error;
  },

  /** A chave (key) nunca muda: é ela que liga a categoria aos lançamentos. */
  update: async (id: string, changes: Pick<Category, 'name' | 'description' | 'icon' | 'color'>): Promise<void> => {
    const { error } = await supabase.from('categories').update(changes).eq('id', id);
    if (error) throw error;
  },

  updateOrder: async (ordered: Category[]): Promise<void> => {
    const results = await Promise.all(
      ordered.map((c, i) => supabase.from('categories').update({ sort_order: i + 1 }).eq('id', c.id!))
    );
    const failed = results.find(r => r.error);
    if (failed?.error) throw failed.error;
  },

  remove: async (id: string): Promise<void> => {
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) throw error;
  },

  countExpenses: async (key: string): Promise<number> => {
    const { count, error } = await supabase
      .from('expenses')
      .select('id', { count: 'exact', head: true })
      .eq('type', key);
    if (error) throw error;
    return count ?? 0;
  },
};
