import React from 'react';

export enum ExpenseType {
  INSTALLMENT = 'INSTALLMENT', // Parcelas
  NOTE = 'NOTE', // Notas Promissórias
  FEE = 'FEE', // Taxas de Condomínio
}

export interface ExpenseItem {
  id: string;
  type: ExpenseType;
  description: string;
  amount: number;
  date: string; // ISO String or YYYY-MM-DD
  monthYear?: string; // Format MM/YYYY for recurring items
  createdAt: number;
}

export interface NavigationItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  type?: ExpenseType;
}