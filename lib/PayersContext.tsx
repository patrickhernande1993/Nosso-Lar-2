import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Payer } from '../types';
import { PayerService } from '../services/payerStorage';

interface PayersState {
  payers: Payer[];
  payerById: Map<string, Payer>;
  tableMissing: boolean;
  isLoading: boolean;
  reload: () => Promise<void>;
}

const PayersContext = createContext<PayersState>({
  payers: [],
  payerById: new Map(),
  tableMissing: false,
  isLoading: true,
  reload: async () => {},
});

export const PayersProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [payers, setPayers] = useState<Payer[]>([]);
  const [tableMissing, setTableMissing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const reload = useCallback(async () => {
    const result = await PayerService.list();
    setPayers(result.payers);
    setTableMissing(result.tableMissing);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const payerById = useMemo(() => new Map(payers.map(p => [p.id, p])), [payers]);

  return (
    <PayersContext.Provider value={{ payers, payerById, tableMissing, isLoading, reload }}>
      {children}
    </PayersContext.Provider>
  );
};

export const usePayers = () => useContext(PayersContext);

export const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('');
