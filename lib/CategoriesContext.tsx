import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Category, CategoryNode, DEFAULT_CATEGORIES, buildCategoryTree, isIncome, leafCategories } from './categories';
import { CategoryService } from '../services/categoryStorage';

interface CategoriesState {
  /** Todas as categorias, incluindo grupos e recebimentos. */
  categories: Category[];
  /** Somente as que recebem lançamentos (despesas e recebimentos). */
  leaves: Category[];
  /** Estrutura completa: grupos com subcategorias e categorias sem grupo. */
  tree: CategoryNode[];
  /** Só os itens de despesa / só os de recebimento, para o menu e o painel. */
  expenseTree: CategoryNode[];
  incomeTree: CategoryNode[];
  categoryByKey: Map<string, Category>;
  tableMissing: boolean;
  groupsMissing: boolean;
  kindMissing: boolean;
  isLoading: boolean;
  reload: () => Promise<void>;
}

const CategoriesContext = createContext<CategoriesState>({
  categories: DEFAULT_CATEGORIES,
  leaves: DEFAULT_CATEGORIES,
  tree: buildCategoryTree(DEFAULT_CATEGORIES),
  expenseTree: buildCategoryTree(DEFAULT_CATEGORIES),
  incomeTree: [],
  categoryByKey: new Map(),
  tableMissing: false,
  groupsMissing: false,
  kindMissing: false,
  isLoading: true,
  reload: async () => {},
});

export const CategoriesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [tableMissing, setTableMissing] = useState(false);
  const [groupsMissing, setGroupsMissing] = useState(false);
  const [kindMissing, setKindMissing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const reload = useCallback(async () => {
    const result = await CategoryService.list();
    setCategories(result.categories);
    setTableMissing(result.tableMissing);
    setGroupsMissing(result.groupsMissing);
    setKindMissing(result.kindMissing);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const value = useMemo(() => {
    const tree = buildCategoryTree(categories);
    return {
      categories,
      leaves: leafCategories(categories),
      tree,
      expenseTree: tree.filter(n => !isIncome(n.category)),
      incomeTree: tree.filter(n => isIncome(n.category)),
      categoryByKey: new Map(categories.map(c => [c.key, c])),
      tableMissing,
      groupsMissing,
      kindMissing,
      isLoading,
      reload,
    };
  }, [categories, tableMissing, groupsMissing, kindMissing, isLoading, reload]);

  return <CategoriesContext.Provider value={value}>{children}</CategoriesContext.Provider>;
};

export const useCategories = () => useContext(CategoriesContext);
