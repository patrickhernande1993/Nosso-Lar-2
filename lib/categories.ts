import {
  CreditCard, FileText, Wallet, Landmark, Sofa, Zap, Home, Car, ShoppingCart, Wifi, Droplets, Flame,
  Wrench, Shield, PawPrint, GraduationCap, HeartPulse, Plane, Gift, Hammer, Tv, Utensils, Receipt, PiggyBank,
  type LucideIcon,
} from 'lucide-react';

export interface Category {
  id?: string;
  key: string; // valor gravado em expenses.type
  name: string;
  description: string;
  icon: string;
  color: string;
  sort_order: number;
}

// Ícones disponíveis para escolher ao criar uma categoria.
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Wallet, CreditCard, FileText, Landmark, Sofa, Zap, Home, Car, ShoppingCart, Wifi, Droplets, Flame,
  Wrench, Shield, PawPrint, GraduationCap, HeartPulse, Plane, Gift, Hammer, Tv, Utensils, Receipt, PiggyBank,
};

export const CATEGORY_COLORS = [
  '#2f6b57', '#c46a3c', '#c99a2e', '#5279a3', '#8a6aa6', '#7f9150',
  '#b5536b', '#3d8a8a', '#a07a4a', '#6b6252', '#d07a2e', '#4a5fa8',
];

export const getCategoryIcon = (name: string): LucideIcon => CATEGORY_ICONS[name] ?? Wallet;
export const categoryPath = (key: string) => `/categoria/${encodeURIComponent(key)}`;

// Usadas enquanto a tabela `categories` ainda não existir no Supabase (ver supabase_categories.sql).
export const DEFAULT_CATEGORIES: Category[] = [
  { key: 'INSTALLMENT', name: 'Financiamento', description: 'Parcelas do financiamento do imóvel.', icon: 'CreditCard', color: '#2f6b57', sort_order: 1 },
  { key: 'NOTE', name: 'Notas Promissórias', description: 'Débitos avulsos e pagamentos únicos.', icon: 'FileText', color: '#c46a3c', sort_order: 2 },
  { key: 'FEE', name: 'Condomínio', description: 'Arrecadação mensal do condomínio.', icon: 'Wallet', color: '#c99a2e', sort_order: 3 },
  { key: 'IPTU', name: 'IPTU', description: 'Imposto Predial e Territorial Urbano.', icon: 'Landmark', color: '#5279a3', sort_order: 4 },
  { key: 'FURNITURE', name: 'Móveis Planejados', description: 'Custos com mobília e marcenaria.', icon: 'Sofa', color: '#8a6aa6', sort_order: 5 },
  { key: 'UTILITIES', name: 'Energia Elétrica', description: 'Histórico das contas de luz.', icon: 'Zap', color: '#7f9150', sort_order: 6 },
];

// Códigos já usados no banco que não podem ser reaproveitados por uma categoria nova
// (documentos e os antigos lançamentos de casamento, que continuam salvos).
export const RESERVED_KEYS = ['DOCUMENT', 'EVENT_SPACE', 'BUFFET', 'PHOTOGRAPHER', 'DECORATION', 'NON_ALCOHOLIC_BAR', 'CEREMONIALIST'];

export const makeCategoryKey = (name: string, taken: string[]) => {
  const base =
    name
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 40) || 'CATEGORIA';
  const used = new Set([...taken, ...RESERVED_KEYS]);
  let key = base;
  for (let n = 2; used.has(key); n++) key = `${base}_${n}`;
  return key;
};

export const formatBRL = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
