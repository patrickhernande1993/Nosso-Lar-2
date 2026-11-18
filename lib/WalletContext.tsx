import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Account, CreditCard, ExpenseItem } from '../types';
import { WalletService } from '../services/walletStorage';
import { Category, isIncome } from './categories';

interface WalletState {
  accounts: Account[];
  cards: CreditCard[];
  accountById: Map<string, Account>;
  cardById: Map<string, CreditCard>;
  tableMissing: boolean;
  /** Coluna reserve_account_id ainda não existe (supabase_reserva.sql). */
  reserveMissing: boolean;
  isLoading: boolean;
  reload: () => Promise<void>;
}

const WalletContext = createContext<WalletState>({
  accounts: [],
  cards: [],
  accountById: new Map(),
  cardById: new Map(),
  tableMissing: false,
  reserveMissing: true,
  isLoading: true,
  reload: async () => {},
});

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [tableMissing, setTableMissing] = useState(false);
  const [reserveMissing, setReserveMissing] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  const reload = useCallback(async () => {
    const r = await WalletService.list();
    setAccounts(r.accounts);
    setCards(r.cards);
    setTableMissing(r.tableMissing);
    setReserveMissing(r.reserveMissing);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const value = useMemo(
    () => ({
      accounts,
      cards,
      accountById: new Map(accounts.map(a => [a.id, a])),
      cardById: new Map(cards.map(c => [c.id, c])),
      tableMissing,
      reserveMissing,
      isLoading,
      reload,
    }),
    [accounts, cards, tableMissing, reserveMissing, isLoading, reload]
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
};

export const useWallet = () => useContext(WalletContext);

export const ACCOUNT_TYPE_LABEL: Record<string, string> = {
  checking: 'Conta corrente',
  savings: 'Poupança',
  investment: 'Investimentos',
  cash: 'Dinheiro',
  other: 'Outra',
};

/** Categoria de investimento: o nome contém "invest" (ex.: Investimentos, Investimentos (resgates)). */
export const isInvestmentCategory = (cat?: Category) => (cat?.name ?? '').toLowerCase().includes('invest');

/** Conta e método de pagamento de um lançamento (cartão, conta, reserva ou transferência para a reserva). */
export const paymentInfo = (
  item: ExpenseItem,
  cat: Category | undefined,
  accountById: Map<string, Account>,
  cardById: Map<string, CreditCard>
): { conta: string; metodo: string; color: string } | null => {
  const card = item.cardId ? cardById.get(item.cardId) : undefined;
  if (card) {
    const acc = card.accountId ? accountById.get(card.accountId) : undefined;
    return { conta: acc?.name ?? card.name, metodo: item.paymentMethod ? `${item.paymentMethod} · ${card.name}` : `Cartão ${card.name}`, color: card.color };
  }
  const acc = item.accountId ? accountById.get(item.accountId) : undefined;
  if (!acc) return item.paymentMethod ? { conta: '—', metodo: item.paymentMethod, color: '#b3a68f' } : null;
  if (isInvestmentCategory(cat) && !item.isReserve) {
    const res = accountById.get(item.reserveAccountId ?? acc.id) ?? acc;
    return { conta: isIncome(cat) ? `Reserva ${res.name} → ${acc.name}` : `${acc.name} → reserva ${res.name}`, metodo: 'Transferência', color: acc.color };
  }
  if (item.isReserve) return { conta: acc.name, metodo: 'Reserva', color: acc.color };
  return { conta: acc.name, metodo: item.paymentMethod || 'Pix / débito', color: acc.color };
};

/**
 * Saldos de todas as contas, com a mesma regra do sistema antigo e reserva entre contas:
 * - só contam lançamentos já pagos/recebidos;
 * - aporte (despesa em categoria de investimento): sai do corrente da conta do lançamento
 *   e entra na reserva da "conta da reserva" (se vazia, a mesma conta);
 * - resgate (recebimento em categoria de investimento): sai da reserva da "conta da reserva"
 *   e entra no corrente da conta do lançamento;
 * - "pago com a reserva" numa despesa comum: sai da reserva da conta; num recebimento: entra na reserva;
 * - demais lançamentos movimentam o corrente da conta.
 */
export const computeBalances = (accounts: Account[], items: ExpenseItem[], categoryByKey: Map<string, Category>) => {
  const bal = new Map(accounts.map(a => [a.id, { liquid: a.initialBalance, invested: a.initialInvested }]));
  const add = (id: string | null | undefined, field: 'liquid' | 'invested', value: number) => {
    const b = id ? bal.get(id) : undefined;
    if (b) b[field] += value;
  };
  items
    .filter(i => i.status === 'PAID' && (i.accountId || i.reserveAccountId))
    .forEach(i => {
      const cat = categoryByKey.get(i.type);
      const income = isIncome(cat);
      const value = Number(i.amount);
      const reserveAcc = i.reserveAccountId ?? i.accountId;
      if (isInvestmentCategory(cat) && !i.isReserve) {
        if (income) { add(reserveAcc, 'invested', -value); add(i.accountId, 'liquid', value); }
        else { add(i.accountId, 'liquid', -value); add(reserveAcc, 'invested', value); }
      } else if (i.isReserve) {
        add(reserveAcc, 'invested', income ? value : -value);
      } else {
        add(i.accountId, 'liquid', income ? value : -value);
      }
    });
  return new Map([...bal].map(([id, b]) => [id, { ...b, total: b.liquid + b.invested }]));
};
