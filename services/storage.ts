import { ExpenseItem, ExpenseType } from '../types';

const STORAGE_KEY = 'condo_manager_data_v1';

export const StorageService = {
  getAll: (): ExpenseItem[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Error reading from localStorage', e);
      return [];
    }
  },

  save: (items: ExpenseItem[]): void => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.error('Error saving to localStorage', e);
    }
  },

  add: (item: ExpenseItem): ExpenseItem[] => {
    const items = StorageService.getAll();
    const newItems = [...items, item];
    StorageService.save(newItems);
    return newItems;
  },

  update: (updatedItem: ExpenseItem): ExpenseItem[] => {
    const items = StorageService.getAll();
    const newItems = items.map((item) =>
      item.id === updatedItem.id ? updatedItem : item
    );
    StorageService.save(newItems);
    return newItems;
  },

  delete: (id: string): ExpenseItem[] => {
    const items = StorageService.getAll();
    const newItems = items.filter((item) => item.id !== id);
    StorageService.save(newItems);
    return newItems;
  },
  
  getByType: (type: ExpenseType): ExpenseItem[] => {
      const items = StorageService.getAll();
      return items.filter(i => i.type === type);
  }
};
