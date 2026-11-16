export enum ExpenseType {
  INSTALLMENT = 'INSTALLMENT', // Parcelas
  NOTE = 'NOTE', // Notas Promissórias
  FEE = 'FEE', // Taxas de Condomínio
  FURNITURE = 'FURNITURE', // Móveis Planejados
  UTILITIES = 'UTILITIES', // Energia Elétrica / Utilidades
  DOCUMENT = 'DOCUMENT', // Documentos e Contratos
  IPTU = 'IPTU', // IPTU
}

export type ExpenseStatus = 'PAID' | 'PENDING';

export interface ExpenseItem {
  id: string;
  type: string; // chave da categoria (categories.key) ou DOCUMENT
  description: string;
  amount: number;
  date: string; // ISO String or YYYY-MM-DD
  monthYear?: string; // Format MM/YYYY for recurring items
  createdAt: number;
  receiptUrl?: string; // URL pública do comprovante
  status: ExpenseStatus;
}

// --- Pagantes e divisão de despesas ---

export interface Payer {
  id: string;
  name: string;
  color: string;
}

/** Parte de uma despesa que outro pagante deve reembolsar. */
export interface ExpenseShare {
  id: string;
  expenseId: string;
  payerId: string;
  amount: number;
  reimbursed: boolean;
}

/** Parte sendo editada no formulário (ainda sem id). */
export interface ShareDraft {
  payerId: string;
  amount: number;
  reimbursed: boolean;
}
