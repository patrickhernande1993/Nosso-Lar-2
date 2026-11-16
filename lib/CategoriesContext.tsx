import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Category, CategoryNode, DEFAULT_CATEGORIES, buildCategoryTree, leafCategories } from './categories';
import { CategoryService } from '../services/categoryStorage';

interface CategoriesState {
  /** Todas as categorias, incluindo grupos. */
  categories: Category[];
  /** Somente as que recebem lançamentos. */
  leaves: Category[];
  /** Estrutura do menu: grupos com subcategorias e categorias sem grupo. */
  tree: CategoryNode[];
  categoryByKey: Map<string, Category>;
  tableMissing: boolean;
  groupsMissing: boolean;
  isLoading: boolean;
  reload: () => Promise<void>;
}

const CategoriesContext = createContext<CategoriesState>({
  categories: DEFAULT_CATEGORIES,
  leaves: DEFAULT_CATEGORIES,
  tree: buildCategoryTree(DEFAULT_CATEGORIES),
  categoryByKey: new Map(),
  tableMissing: false,
  groupsMissing: false,
  isLoading: true,
  reload: async () => {},
});

export const CategoriesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [tableMissing, setTableMissing] = useState(false);
  const [groupsMissing, setGroupsMissing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const reload = useCallback(async () => {
    const result = await CategoryService.list();
    setCategories(result.categories);
    setTableMissing(result.tableMissing);
    setGroupsMissing(result.groupsMissing);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const value = useMemo(
    () => ({
      categories,
      leaves: leafCategories(categories),
      tree: buildCategoryTree(categories),
      categoryByKey: new Map(categories.map(c => [c.key, c])),
      tableMissing,
      groupsMissing,
      isLoading,
      reload,
    }),
    [categories, tableMissing, groupsMissing, isLoading, reload]
  );

  return <CategoriesContext.Provider value={value}>{children}</CategoriesContext.Provider>;
};

export const useCategories = () => useContext(CategoriesContext);
