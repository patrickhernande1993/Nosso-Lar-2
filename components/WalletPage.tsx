import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, ChevronLeft, ChevronRight, Landmark, CreditCard as CardIcon, ChevronDown, Settings } from 'lucide-react';
import { Card, PageHeader, StatusBadge } from './UI';
import { StorageService } from '../services/storage';
import { ShareService } from '../services/payerStorage';
import { ExpenseItem, ExpenseShare } from '../types';
import { useWallet, computeAccountBalance, ACCOUNT_TYPE_LABEL } from '../lib/WalletContext';
import { useCategories } from '../lib/CategoriesContext';
import { formatBRL, isIncome } from '../lib/categories';

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const formatShortDate = (d: string) => new Date(d).toLocaleDateString('pt-BR', { timeZone: 'UTC', day: '2-digit', month: '2-digit' });

export const WalletPage: React.FC = () => {
  const { accounts, cards, tableMissing, isLoading: walletLoading } = useWallet();
  const { categoryByKey } = useCategories();
  const [items, setItems] = useState<ExpenseItem[]>([]);
  const [shares, setShares] = useState<ExpenseShare[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [openCard, setOpenCard] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([StorageService.getAll(), ShareService.getAll()])
      .then(([all, s]) => { setItems(all); setShares(s); })
      .finally(() => setIsLoading(false));
  }, []);

  const shareTotal = useMemo(() => {
    const m = new Map<string, number>();
    shares.forEach(s => m.set(s.expenseId, (m.get(s.expenseId) ?? 0) + s.amount));
    return m;
  }, [shares]);

  const monthKey = `${year}-${String(month).padStart(2, '0')}`;

  const accountRows = useMemo(
    () =>
      accounts.map(a => {
        const balance = computeAccountBalance(a, items, categoryByKey);
        const linkedCards = cards.filter(c => c.accountId === a.id).map(c => c.id);
        const cardDebt = items
          .filter(i => i.cardId && linkedCards.includes(i.cardId) && i.status === 'PENDING' && !isIncome(categoryByKey.get(i.type)))
          .reduce((s, i) => s + Number(i.amount), 0);
        return { account: a, ...balance, cardDebt };
      }),
    [accounts, cards, items, categoryByKey]
  );

  const cardRows = useMemo(
    () =>
      cards.map(c => {
        const cardItems = items.filter(i => i.cardId === c.id && !isIncome(categoryByKey.get(i.type)));
        const monthItems = cardItems.filter(i => i.date.slice(0, 7) === monthKey).sort((a, b) => a.date.localeCompare(b.date));
        const bill = monthItems.reduce((s, i) => s + Number(i.amount), 0);
        const mine = monthItems.reduce((s, i) => s + Number(i.amount) - (shareTotal.get(String(i.id)) ?? 0), 0);
        const used = cardItems.filter(i => i.status === 'PENDING').reduce((s, i) => s + Number(i.amount), 0);
        const paidThisMonth = monthItems.length > 0 && monthItems.every(i => i.status === 'PAID');
        return { card: c, monthItems, bill, mine, used, paidThisMonth };
      }),
    [cards, items, categoryByKey, monthKey, shareTotal]
  );

  const totals = accountRows.reduce((t, r) => ({ liquid: t.liquid + r.liquid, invested: t.invested + r.invested }), { liquid: 0, invested: 0 });

  const shiftMonth = (delta: number) => {
    let m = month + delta;
    let y = year;
    if (m < 1) { m = 12; y -= 1; }
    if (m > 12) { m = 1; y += 1; }
    setMonth(m);
    setYear(y);
  };

  if (isLoading || walletLoading) {
    return <div className="flex h-[60vh] items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-brand-600" /></div>;
  }

  if (tableMissing || (accounts.length === 0 && cards.length === 0)) {
    return (
      <div>
        <PageHeader eyebrow="Geral" title="Contas e cartões" />
        <Card className="text-center py-12">
          <p className="text-sand-700 font-medium">{tableMissing ? 'Falta rodar o script de contas e cartões no Supabase' : 'Nenhuma conta ou cartão cadastrado'}</p>
          <p className="text-sm text-sand-400 mt-1">Cadastre em Configurações → Contas e cartões.</p>
          <Link to="/configuracoes" className="inline-flex items-center gap-2 mt-4 text-sm font-semibold text-brand-700 hover:underline">
            <Settings className="w-4 h-4" /> Ir para Configurações
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow="Geral"
        title="Contas e cartões"
        description="Saldos das contas (com a reserva) e as faturas dos cartões."
        actions={
          <div className="flex items-center gap-2">
            <button onClick={() => shiftMonth(-1)} aria-label="Mês anterior" className="p-2.5 rounded-xl border border-sand-200 bg-white text-sand-600 hover:bg-sand-50"><ChevronLeft className="w-4 h-4" /></button>
            <span className="min-w-[150px] text-center text-sm font-semibold text-sand-800">{MONTHS[month - 1]} de {year}</span>
            <button onClick={() => shiftMonth(1)} aria-label="Próximo mês" className="p-2.5 rounded-xl border border-sand-200 bg-white text-sand-600 hover:bg-sand-50"><ChevronRight className="w-4 h-4" /></button>
          </div>
        }
      />

      {accountRows.length > 0 && (
        <>
          <div className="relative overflow-hidden rounded-3xl bg-brand-900 text-white p-6 md:p-8 mb-4">
            <div className="absolute -right-16 -top-24 w-72 h-72 rounded-full bg-brand-500/20 blur-3xl pointer-events-none" />
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-200/70">Patrimônio nas contas (hoje)</p>
            <p className="font-display text-4xl md:text-5xl font-semibold mt-2 tabular">{formatBRL(totals.liquid + totals.invested)}</p>
            <div className="grid grid-cols-2 gap-3 mt-6 max-w-md">
              <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-200/70">Disponível</p>
                <p className="text-lg font-bold mt-1 tabular">{formatBRL(totals.liquid)}</p>
              </div>
              <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-200/70">Reserva / investido</p>
                <p className="text-lg font-bold mt-1 tabular">{formatBRL(totals.invested)}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {accountRows.map(r => (
              <Card key={r.account.id} className="p-5">
                <div className="flex items-center gap-3">
                  <div className="grid place-items-center w-10 h-10 rounded-xl" style={{ backgroundColor: `${r.account.color}1a`, color: r.account.color }}>
                    <Landmark className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sand-900 text-sm truncate">{r.account.name}</p>
                    <p className="text-xs text-sand-400">{ACCOUNT_TYPE_LABEL[r.account.type]}{r.account.owner ? ` · ${r.account.owner}` : ''}</p>
                  </div>
                </div>
                <p className={`text-2xl font-bold mt-4 tabular ${r.total < 0 ? 'text-clay-600' : 'text-sand-900'}`}>{formatBRL(r.total)}</p>
                <dl className="mt-3 space-y-1 text-xs">
                  <div className="flex justify-between"><dt className="text-sand-500">Disponível</dt><dd className="tabular text-sand-800">{formatBRL(r.liquid)}</dd></div>
                  <div className="flex justify-between"><dt className="text-sand-500">Reserva</dt><dd className="tabular text-sand-800">{formatBRL(r.invested)}</dd></div>
                  {r.cardDebt > 0 && (
                    <div className="flex justify-between"><dt className="text-sand-500">Cartões a pagar</dt><dd className="tabular text-clay-600">{formatBRL(r.cardDebt)}</dd></div>
                  )}
                </dl>
              </Card>
            ))}
          </div>
        </>
      )}

      {cardRows.length > 0 && (
        <>
          <h2 className="font-display text-xl font-semibold text-sand-900 mt-10 mb-4">Cartões · fatura de {MONTHS[month - 1].toLowerCase()}</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {cardRows.map(r => {
              const usedPct = r.card.creditLimit > 0 ? Math.min(100, (r.used / r.card.creditLimit) * 100) : 0;
              const open = openCard === r.card.id;
              return (
                <Card key={r.card.id} className="p-0 overflow-hidden">
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="grid place-items-center w-10 h-10 rounded-xl flex-shrink-0" style={{ backgroundColor: `${r.card.color}1a`, color: r.card.color }}>
                          <CardIcon className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-sand-900 text-sm truncate">{r.card.name}</p>
                          <p className="text-xs text-sand-400">{r.card.owner ? `${r.card.owner} · ` : ''}fecha dia {r.card.closingDay} · vence dia {r.card.dueDay}</p>
                        </div>
                      </div>
                      {r.monthItems.length > 0 && (
                        <span className={`text-[11px] font-semibold rounded-full px-2.5 py-1 ${r.paidThisMonth ? 'bg-brand-50 text-brand-700' : 'bg-clay-50 text-clay-700'}`}>
                          {r.paidThisMonth ? 'Fatura paga' : 'Em aberto'}
                        </span>
                      )}
                    </div>
                    <div className="flex items-end justify-between mt-4">
                      <div>
                        <p className="text-[11px] uppercase tracking-wider font-semibold text-sand-400">Fatura do mês</p>
                        <p className="text-2xl font-bold text-sand-900 tabular">{formatBRL(r.bill)}</p>
                      </div>
                      {r.mine !== r.bill && (
                        <div className="text-right">
                          <p className="text-[11px] uppercase tracking-wider font-semibold text-sand-400">Sua parte</p>
                          <p className="text-sm font-semibold text-sand-700 tabular">{formatBRL(r.mine)}</p>
                        </div>
                      )}
                    </div>
                    {r.card.creditLimit > 0 && (
                      <div className="mt-4">
                        <div className="flex justify-between text-xs text-sand-500 mb-1.5">
                          <span>Limite usado {formatBRL(r.used)}</span>
                          <span>de {formatBRL(r.card.creditLimit)}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-sand-100 overflow-hidden">
                          <div className={`h-full rounded-full ${usedPct > 85 ? 'bg-clay-500' : 'bg-brand-500'}`} style={{ width: `${usedPct}%` }} />
                        </div>
                      </div>
                    )}
                  </div>
                  {r.monthItems.length > 0 && (
                    <>
                      <button
                        onClick={() => setOpenCard(open ? null : r.card.id)}
                        aria-expanded={open}
                        className="w-full flex items-center justify-between px-5 py-2.5 border-t border-sand-100 bg-sand-50/60 text-xs font-semibold text-sand-600 hover:bg-sand-100/60"
                      >
                        {r.monthItems.length} {r.monthItems.length === 1 ? 'compra' : 'compras'} no mês
                        <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
                      </button>
                      {open && (
                        <ul className="divide-y divide-sand-100 max-h-72 overflow-y-auto scroll-thin-light">
                          {r.monthItems.map(i => (
                            <li key={i.id} className="flex items-center gap-3 px-5 py-2.5">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-sand-800 truncate">{i.description}</p>
                                <p className="text-[11px] text-sand-400">{formatShortDate(i.date)} · {categoryByKey.get(i.type)?.name ?? '—'}</p>
                              </div>
                              <StatusBadge status={i.status} />
                              <span className="text-sm font-semibold text-sand-900 tabular w-24 text-right">{formatBRL(Number(i.amount))}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </>
                  )}
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
