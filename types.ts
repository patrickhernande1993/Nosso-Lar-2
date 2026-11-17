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
  status: ExpenseStatus; // em recebimentos: PAID = recebido, PENDING = a receber
  receiver?: string | null; // recebimentos: Isabelly, Patrick ou Ambos
  accountId?: string | null; // conta de onde saiu / para onde entrou
  cardId?: string | null; // cartão de crédito usado
  paymentDate?: string | null; // YYYY-MM-DD em que foi pago/recebido
  isReserve?: boolean; // pago com a reserva (investimentos) ou depositado nela
  reserveAccountId?: string | null; // aporte/resgate: conta cuja reserva recebe ou cede o valor
}

// --- Contas e cartões ---

export type AccountType = 'checking' | 'savings' | 'investment' | 'cash' | 'other';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  owner: string | null;
  initialBalance: number;
  initialInvested: number;
  color: string;
}

export interface CreditCard {
  id: string;
  name: string;
  owner: string | null;
  color: string;
  creditLimit: number;
  closingDay: number;
  dueDay: number;
  accountId: string | null;
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
