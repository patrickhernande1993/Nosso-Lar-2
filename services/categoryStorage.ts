import { supabase } from '../lib/supabase';
import { Category, DEFAULT_CATEGORIES } from '../lib/categories';

const BASE_COLUMNS = 'id, key, name, description, icon, color, sort_order';
const GROUP_COLUMNS = `${BASE_COLUMNS}, is_group, parent_key`;
const FULL_COLUMNS = `${GROUP_COLUMNS}, kind`;

export interface CategoryListResult {
  categories: Category[];
  /** A tabela categories não existe (script supabase_categories.sql não rodado). */
  tableMissing: boolean;
  /** As colunas de grupo não existem (script supabase_subcategorias.sql não rodado). */
  groupsMissing: boolean;
  /** A coluna kind não existe (script supabase_recebimentos.sql não rodado). */
  kindMissing: boolean;
}

const fetchCategories = (columns: string) =>
  supabase
    .from('categories')
    .select(columns)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

export const CategoryService = {
  /** Tenta as colunas mais novas primeiro e vai recuando se algum script ainda não foi rodado. */
  list: async (): Promise<CategoryListResult> => {
    const full = await fetchCategories(FULL_COLUMNS);
    if (!full.error) {
      return { categories: full.data as unknown as Category[], tableMissing: false, groupsMissing: false, kindMissing: false };
    }

    const withGroups = await fetchCategories(GROUP_COLUMNS);
    if (!withGroups.error) {
      return { categories: withGroups.data as unknown as Category[], tableMissing: false, groupsMissing: false, kindMissing: true };
    }

    const plain = await fetchCategories(BASE_COLUMNS);
    if (!plain.error) {
      return { categories: plain.data as unknown as Category[], tableMissing: false, groupsMissing: true, kindMissing: true };
    }

    console.warn('Tabela de categorias indisponível, usando padrão:', plain.error.message);
    return { categories: DEFAULT_CATEGORIES, tableMissing: true, groupsMissing: true, kindMissing: true };
  },

  create: async (category: Omit<Category, 'id'>): Promise<void> => {
    const { error } = await supabase.from('categories').insert([category]);
    if (error) throw error;
  },

  /** A chave (key) nunca muda: é ela que liga a categoria aos lançamentos. */
  update: async (id: string, changes: Partial<Pick<Category, 'name' | 'description' | 'icon' | 'color' | 'parent_key' | 'sort_order'>>): Promise<void> => {
    const { error } = await supabase.from('categories').update(changes).eq('id', id);
    if (error) throw error;
  },

  /** Regrava a ordem de um conjunto de categorias irmãs (mesmo grupo ou topo do menu). */
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
