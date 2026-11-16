import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Category, DEFAULT_CATEGORIES } from './categories';
import { CategoryService } from '../services/categoryStorage';

interface CategoriesState {
  categories: Category[];
  tableMissing: boolean;
  isLoading: boolean;
  reload: () => Promise<void>;
}

const CategoriesContext = createContext<CategoriesState>({
  categories: DEFAULT_CATEGORIES,
  tableMissing: false,
  isLoading: true,
  reload: async () => {},
});

export const CategoriesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [tableMissing, setTableMissing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const reload = useCallback(async () => {
    const result = await CategoryService.list();
    setCategories(result.categories);
    setTableMissing(result.tableMissing);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return (
    <CategoriesContext.Provider value={{ categories, tableMissing, isLoading, reload }}>
      {children}
    </CategoriesContext.Provider>
  );
};

export const useCategories = () => useContext(CategoriesContext);
