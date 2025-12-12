import React from 'react';

export enum ExpenseType {
  INSTALLMENT = 'INSTALLMENT', // Parcelas
  NOTE = 'NOTE', // Notas Promissórias
  FEE = 'FEE', // Taxas de Condomínio
  FURNITURE = 'FURNITURE', // Móveis Planejados
  UTILITIES = 'UTILITIES', // Energia Elétrica / Utilidades
  
  // Novos tipos para Casamento
  EVENT_SPACE = 'EVENT_SPACE', // Espaço Evento
  BUFFET = 'BUFFET', // Buffet
  PHOTOGRAPHER = 'PHOTOGRAPHER', // Fotógrafo
  DECORATION = 'DECORATION', // Decoração
  NON_ALCOHOLIC_BAR = 'NON_ALCOHOLIC_BAR', // Bar sem álcool
  CEREMONIALIST = 'CEREMONIALIST', // Cerimonialista
}

export type ExpenseStatus = 'PAID' | 'PENDING';

export interface ExpenseItem {
  id: string;
  type: ExpenseType;
  description: string;
  amount: number;
  date: string; // ISO String or YYYY-MM-DD
  monthYear?: string; // Format MM/YYYY for recurring items
  createdAt: number;
  receiptUrl?: string; // URL pública do comprovante
  status: ExpenseStatus; // Novo campo de status
}

export interface NavigationItem {
  label: string;
  path?: string;
  icon: React.ReactNode;
  type?: ExpenseType;
  children?: NavigationItem[];
}

// --- Tipos para Lista de Convidados ---

export type GuestSide = 'BRIDE' | 'GROOM';

export interface Guest {
  id: string;
  name: string;
  side: GuestSide;
  createdAt: number;
}