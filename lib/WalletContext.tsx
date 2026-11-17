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
  isLoading: boolean;
  reload: () => Promise<void>;
}

const WalletContext = createContext<WalletState>({
  accounts: [],
  cards: [],
  accountById: new Map(),
  cardById: new Map(),
  tableMissing: false,
  isLoading: true,
  reload: async () => {},
});

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [tableMissing, setTableMissing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const reload = useCallback(async () => {
    const r = await WalletService.list();
    setAccounts(r.accounts);
    setCards(r.cards);
    setTableMissing(r.tableMissing);
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
      isLoading,
      reload,
    }),
    [accounts, cards, tableMissing, isLoading, reload]
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

/**
 * Saldo de uma conta, com a mesma regra do sistema antigo:
 * - só contam lançamentos já pagos/recebidos ligados à conta;
 * - "reserva" marcada: recebimento deposita na reserva, despesa resgata da reserva;
 * - categoria com "invest" no nome sem a marcação: despesa = aporte (sai da conta, entra na reserva),
 *   recebimento = resgate (sai da reserva, entra na conta).
 */
export const computeAccountBalance = (account: Account, items: ExpenseItem[], categoryByKey: Map<string, Category>) => {
  let liquid = account.initialBalance;
  let invested = account.initialInvested;
  items
    .filter(i => i.accountId === account.id && i.status === 'PAID')
    .forEach(i => {
      const cat = categoryByKey.get(i.type);
      const income = isIncome(cat);
      const investCategory = (cat?.name ?? '').toLowerCase().includes('invest');
      const value = Number(i.amount);
      if (income) {
        if (i.isReserve) invested += value;
        else if (investCategory) { invested -= value; liquid += value; }
        else liquid += value;
      } else {
        if (i.isReserve) invested -= value;
        else if (investCategory) { invested += value; liquid -= value; }
        else liquid -= value;
      }
    });
  return { liquid, invested, total: liquid + invested };
};
