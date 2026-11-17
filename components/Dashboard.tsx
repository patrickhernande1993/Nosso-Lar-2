import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Loader2, ArrowUpRight, CalendarClock, AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, Search, Paperclip, RotateCcw, UserRound } from 'lucide-react';
import { StorageService } from '../services/storage';
import { ExpenseItem, ExpenseShare } from '../types';
import { ShareService } from '../services/payerStorage';
import { usePayers, initials } from '../lib/PayersContext';
import { useWallet, paymentInfo } from '../lib/WalletContext';
import { Card, PageHeader, StatusBadge } from './UI';
import { RECEIVERS, categoryPath, formatBRL, getCategoryIcon, isIncome } from '../lib/categories';
import { useCategories } from '../lib/CategoriesContext';
import { NewEntryLauncher } from './NewEntryLauncher';

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const MONTHS_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

const compactBRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1 }).format(v);
const formatDate = (d: string) => new Date(d).toLocaleDateString('pt-BR', { timeZone: 'UTC', day: '2-digit', month: 'short', year: 'numeric' });
const formatShortDate = (d: string) => new Date(d).toLocaleDateString('pt-BR', { timeZone: 'UTC', day: '2-digit', month: '2-digit' });
const sum = (items: ExpenseItem[]) => items.reduce((acc, i) => acc + i.amount, 0);

const now = new Date();
const CURRENT_YEAR = String(now.getFullYear());
const CURRENT_MONTH = String(now.getMonth() + 1).padStart(2, '0');

const tooltipStyle = {
  borderRadius: 12,
  border: '1px solid #e8e1d4',
  boxShadow: '0 10px 30px -12px rgba(37,34,30,.25)',
  fontSize: 12,
  fontFamily: 'Manrope',
};

const selectCls =
  'select-clean pl-3.5 pr-9 py-2.5 bg-white border border-sand-200 rounded-xl text-sm font-medium text-sand-800 focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500';

type StatusFilter = 'ALL' | 'PENDING' | 'PAID';

export const Dashboard: React.FC = () => {
  const { categories, expenseTree, incomeTree, isLoading: categoriesLoading } = useCategories();
  const [kindFilter, setKindFilter] = useState<'ALL' | 'EXPENSE' | 'INCOME'>('ALL');
  const [rawItems, setRawItems] = useState<ExpenseItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // Por padrão a visão geral abre no mês corrente.
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);
  const [selectedMonth, setSelectedMonth] = useState(CURRENT_MONTH);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [search, setSearch] = useState('');
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [shares, setShares] = useState<ExpenseShare[]>([]);
  const { payers, payerById } = usePayers();
  const { tableMissing: walletMissing, accountById, cardById } = useWallet();

  const payInfo = (item: ExpenseItem) => paymentInfo(item, categoryByKey.get(item.type), accountById, cardById);

  useEffect(() => {
    Promise.all([StorageService.getAll(), ShareService.getAll()])
      .then(([items, allShares]) => {
        setRawItems(items);
        setShares(allShares);
      })
      .catch(e => console.error('Error loading dashboard', e))
      .finally(() => setIsLoading(false));
  }, []);

  const categoryByKey = useMemo(() => new Map(categories.map(c => [c.key, c])), [categories]);
  const sharesByExpense = useMemo(() => {
    const map = new Map<string, ExpenseShare[]>();
    shares.forEach(s => map.set(s.expenseId, [...(map.get(s.expenseId) ?? []), s]));
    return map;
  }, [shares]);

  const toggleReimbursed = async (share: ExpenseShare) => {
    setTogglingId(share.id);
    try {
      await ShareService.setReimbursed(share.id, !share.reimbursed);
      setShares(prev => prev.map(s => (s.id === share.id ? { ...s, reimbursed: !s.reimbursed } : s)));
    } catch (e: any) {
      alert('Erro ao atualizar reembolso: ' + (e?.message || 'verifique o console.'));
    } finally {
      setTogglingId(null);
    }
  };
  // Só entram lançamentos de categorias cadastradas (ignora documentos e registros antigos).
  const allItems = useMemo(() => rawItems.filter(i => categoryByKey.has(i.type)), [rawItems, categoryByKey]);

  const availableYears = useMemo(
    () => Array.from(new Set([CURRENT_YEAR, ...allItems.map(i => i.date.split('-')[0])])).sort().reverse(),
    [allItems]
  );

  const data = useMemo(() => {
    const items = allItems.filter(item => {
      const [y, m] = item.date.split('-');
      return (!selectedYear || y === selectedYear) && (!selectedMonth || m === selectedMonth);
    });

    const isInc = (i: ExpenseItem) => isIncome(categoryByKey.get(i.type));
    const expItems = items.filter(i => !isInc(i));
    const incItems = items.filter(isInc);

    // Despesas (valor cheio)
    const paid = sum(expItems.filter(i => i.status === 'PAID'));
    const pending = sum(expItems.filter(i => i.status === 'PENDING'));

    // "Minha parte" de cada despesa = valor - partes de outros pagantes
    const mineOf = (i: ExpenseItem) => i.amount - (sharesByExpense.get(String(i.id)) ?? []).reduce((a, s) => a + s.amount, 0);
    const outTotal = expItems.reduce((a, i) => a + mineOf(i), 0);
    const outPaid = expItems.filter(i => i.status === 'PAID').reduce((a, i) => a + mineOf(i), 0);

    // Recebimentos
    const inTotal = sum(incItems);
    const inReceived = sum(incItems.filter(i => i.status === 'PAID'));

    const byReceiver = [...RECEIVERS, 'Não informado']
      .map(r => {
        const rItems = incItems.filter(i => (i.receiver || 'Não informado') === r);
        return { name: r, total: sum(rItems), received: sum(rItems.filter(i => i.status === 'PAID')) };
      })
      .filter(r => r.total > 0);

    const summarize = (nodes: typeof expenseTree, pool: ExpenseItem[]) => nodes.map(({ category: cat, children }) => {
      const keys = new Set(cat.is_group ? children.map(c => c.key) : [cat.key]);
      const catItems = pool.filter(i => keys.has(i.type));
      const catTotal = sum(catItems);
      const catPaid = sum(catItems.filter(i => i.status === 'PAID'));
      const subs = cat.is_group
        ? children
            .map(ch => ({ ...ch, total: sum(catItems.filter(i => i.type === ch.key)) }))
            .filter(s => s.total > 0)
            .sort((a, b) => b.total - a.total)
        : [];
      return { ...cat, total: catTotal, paid: catPaid, pending: catTotal - catPaid, count: catItems.length, subs };
    });
    const byCategory = summarize(expenseTree, expItems);
    const byIncomeCategory = summarize(incomeTree, incItems);

    // Mês a mês: entradas x saídas (minha parte)
    const byMonth = new Map<string, { entradas: number; saidas: number }>();
    items.forEach(i => {
      const key = i.date.slice(0, 7);
      const row = byMonth.get(key) ?? { entradas: 0, saidas: 0 };
      if (isInc(i)) row.entradas += i.amount;
      else row.saidas += i.amount;
      byMonth.set(key, row);
    });
    const monthly = Array.from(byMonth.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, v]) => {
        const [y, m] = key.split('-');
        return { name: `${MONTHS_SHORT[Number(m) - 1]}/${y.slice(2)}`, ...v };
      });

    let period = 'Todo o período';
    if (selectedYear && selectedMonth) period = `${MONTHS[Number(selectedMonth) - 1]} de ${selectedYear}`;
    else if (selectedYear) period = `Ano de ${selectedYear}`;
    else if (selectedMonth) period = `${MONTHS[Number(selectedMonth) - 1]} (todos os anos)`;

    // Divisões das despesas do período
    const periodShares = items.flatMap(i => sharesByExpense.get(String(i.id)) ?? []);
    const others = periodShares.reduce((a, s) => a + s.amount, 0);
    const toReceive = periodShares.filter(s => !s.reimbursed).reduce((a, s) => a + s.amount, 0);
    const itemById = new Map(items.map(i => [String(i.id), i]));
    const byPayer = payers
      .map(p => {
        const ps = periodShares.filter(s => s.payerId === p.id);
        return {
          payer: p,
          shares: ps.map(s => ({ share: s, item: itemById.get(s.expenseId)! })).sort((a, b) => a.item.date.localeCompare(b.item.date)),
          pending: ps.filter(s => !s.reimbursed).reduce((a, s) => a + s.amount, 0),
          received: ps.filter(s => s.reimbursed).reduce((a, s) => a + s.amount, 0),
        };
      })
      .filter(g => g.shares.length > 0);

    return {
      items, paid, pending, total: paid + pending, byCategory, byIncomeCategory, monthly, period,
      mine: paid + pending - others, toReceive, byPayer, hasShares: periodShares.length > 0,
      inTotal, inReceived, outTotal, outPaid, byReceiver, hasIncome: incItems.length > 0,
      // Igual ao sistema antigo: entradas − todas as saídas do período (valor cheio, pagas ou não)
      saldoMes: inTotal - (paid + pending), saldoRealizado: inReceived - paid,
    };
  }, [allItems, expenseTree, incomeTree, categoryByKey, selectedYear, selectedMonth, sharesByExpense, payers]);

  const listItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.items
      .filter(i => kindFilter === 'ALL' || (kindFilter === 'INCOME') === isIncome(categoryByKey.get(i.type)))
      .filter(i => statusFilter === 'ALL' || i.status === statusFilter)
      .filter(i => !q || i.description.toLowerCase().includes(q) || categoryByKey.get(i.type)?.name.toLowerCase().includes(q))
      .sort((a, b) => a.date.localeCompare(b.date) || a.description.localeCompare(b.description));
  }, [data.items, kindFilter, statusFilter, search, categoryByKey]);

  // Vencimentos são sempre calculados sobre todos os lançamentos, independente do filtro.
  const dueInfo = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const open = allItems.filter(i => i.status === 'PENDING' && !isIncome(categoryByKey.get(i.type))).sort((a, b) => a.date.localeCompare(b.date));
    const overdue = open.filter(i => i.date < today);
    return { overdueCount: overdue.length, overdueAmount: sum(overdue), next: open.find(i => i.date >= today), today };
  }, [allItems, categoryByKey]);

  const shiftMonth = (delta: number) => {
    let m = Number(selectedMonth) + delta;
    let y = Number(selectedYear);
    if (m < 1) { m = 12; y -= 1; }
    if (m > 12) { m = 1; y += 1; }
    setSelectedMonth(String(m).padStart(2, '0'));
    setSelectedYear(String(y));
  };

  const toggleStatus = async (item: ExpenseItem) => {
    const newStatus = item.status === 'PAID' ? 'PENDING' : 'PAID';
    const updated: ExpenseItem = {
      ...item,
      status: newStatus,
      // Registra a data do pagamento (só se a coluna já existir)
      ...(walletMissing ? {} : { paymentDate: newStatus === 'PAID' ? new Date().toISOString().slice(0, 10) : null }),
    };
    setTogglingId(item.id);
    try {
      await StorageService.update(updated);
      setRawItems(prev => prev.map(i => (i.id === item.id ? updated : i)));
    } catch (e: any) {
      alert('Erro ao atualizar status: ' + (e?.message || 'verifique o console.'));
    } finally {
      setTogglingId(null);
    }
  };

  if (isLoading || categoriesLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
      </div>
    );
  }

  const paidPct = data.total > 0 ? (data.paid / data.total) * 100 : 0;
  const pieData = data.byCategory.filter(c => c.total > 0);
  const isSingleMonth = !!(selectedYear && selectedMonth);
  const isCurrentMonth = selectedYear === CURRENT_YEAR && selectedMonth === CURRENT_MONTH;
  const nextCategory = dueInfo.next && categoryByKey.get(dueInfo.next.type);
  const kindItems = data.items.filter(i => kindFilter === 'ALL' || (kindFilter === 'INCOME') === isIncome(categoryByKey.get(i.type)));
  const counts = {
    ALL: kindItems.length,
    PENDING: kindItems.filter(i => i.status === 'PENDING').length,
    PAID: kindItems.filter(i => i.status === 'PAID').length,
  };

  return (
    <div>
      <PageHeader
        eyebrow="Visão geral"
        title={data.period}
        description="Entradas, saídas e o saldo do período, somando todas as categorias."
        actions={
          <>
          <div className="flex items-center gap-2 w-full">
            {isSingleMonth && (
              <button onClick={() => shiftMonth(-1)} aria-label="Mês anterior" className="p-2.5 rounded-xl border border-sand-200 bg-white text-sand-600 hover:bg-sand-50 transition">
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            <select aria-label="Mês" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className={`${selectCls} flex-1 min-w-0 md:flex-none md:w-40`}>
              <option value="">Todos os meses</option>
              {MONTHS.map((m, i) => (
                <option key={m} value={String(i + 1).padStart(2, '0')}>{m}</option>
              ))}
            </select>
            <select aria-label="Ano" value={selectedYear} onChange={e => setSelectedYear(e.target.value)} className={`${selectCls} flex-1 min-w-0 md:flex-none md:w-32`}>
              <option value="">Todos os anos</option>
              {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            {isSingleMonth && (
              <button onClick={() => shiftMonth(1)} aria-label="Próximo mês" className="p-2.5 rounded-xl border border-sand-200 bg-white text-sand-600 hover:bg-sand-50 transition">
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
            {!isCurrentMonth && (
              <button
                onClick={() => { setSelectedYear(CURRENT_YEAR); setSelectedMonth(CURRENT_MONTH); }}
                title="Voltar para o mês atual"
                aria-label="Voltar para o mês atual"
                className="p-2.5 rounded-xl border border-sand-200 bg-white text-sand-500 hover:text-brand-700 hover:border-brand-200 transition"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </div>
          <NewEntryLauncher />
          </>
        }
      />

      {/* Resumo */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <div className="lg:col-span-2 relative overflow-hidden rounded-3xl bg-brand-900 text-white p-6 md:p-8">
          <div className="absolute -right-16 -top-24 w-72 h-72 rounded-full bg-brand-500/20 blur-3xl pointer-events-none" />
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-200/70">Saldo · {data.period}</p>
          <p className={`font-display text-4xl md:text-5xl font-semibold mt-2 tabular ${data.saldoMes < 0 ? 'text-clay-200' : ''}`}>{formatBRL(data.saldoMes)}</p>
          <p className="text-sm text-brand-100/70 mt-2">
            Entradas menos todas as saídas do período. Realizado até agora (recebido − pago):{' '}
            <span className={`font-semibold tabular ${data.saldoRealizado < 0 ? 'text-clay-200' : 'text-white'}`}>{formatBRL(data.saldoRealizado)}</span>
          </p>

          <div className="grid grid-cols-2 gap-3 md:gap-4 mt-6">
            {[
              { label: 'Entradas', value: data.inTotal, sub: `${formatBRL(data.inReceived)} recebido`, dot: 'bg-brand-300' },
              { label: 'Saídas', value: data.total, sub: data.hasShares ? `sua parte ${formatBRL(data.outTotal)}` : `${formatBRL(data.paid)} pago`, dot: 'bg-clay-300' },
              { label: 'Falta pagar', value: data.pending, sub: `de ${formatBRL(data.total)} em despesas`, dot: 'bg-clay-400' },
              { label: 'A receber', value: data.inTotal - data.inReceived + data.toReceive, sub: data.hasShares ? `inclui ${formatBRL(data.toReceive)} de reembolsos` : 'recebimentos pendentes', dot: 'bg-sky-300' },
            ].map(s => (
              <div key={s.label} className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-4 min-w-0">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-brand-200/70 whitespace-nowrap">
                  <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} /> {s.label}
                </p>
                <p className="text-lg md:text-xl font-bold mt-1 tabular truncate">{formatBRL(s.value)}</p>
                <p className="text-[11px] text-brand-100/50 mt-0.5 truncate">{s.sub}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-rows-2 gap-4">
          <Card className="flex flex-col justify-between">
            <div className="flex items-center gap-2 text-sand-500 text-xs font-semibold uppercase tracking-wider">
              <CalendarClock className="w-4 h-4 text-brand-600" /> Próximo vencimento
            </div>
            {dueInfo.next ? (
              <div className="mt-3">
                <p className="text-2xl font-bold text-sand-900 tabular">{formatBRL(dueInfo.next.amount)}</p>
                <p className="text-sm text-sand-500 mt-1 line-clamp-1">
                  {formatDate(dueInfo.next.date)} · {nextCategory?.name ?? dueInfo.next.description}
                </p>
              </div>
            ) : (
              <p className="mt-3 text-sm text-sand-500">Nenhum pagamento futuro em aberto.</p>
            )}
          </Card>
          <Card className={`flex flex-col justify-between ${dueInfo.overdueCount > 0 ? 'bg-clay-50 border-clay-200' : ''}`}>
            {dueInfo.overdueCount > 0 ? (
              <>
                <div className="flex items-center gap-2 text-clay-700 text-xs font-semibold uppercase tracking-wider">
                  <AlertCircle className="w-4 h-4" /> Em atraso (geral)
                </div>
                <div className="mt-3">
                  <p className="text-2xl font-bold text-clay-700 tabular">{formatBRL(dueInfo.overdueAmount)}</p>
                  <p className="text-sm text-clay-600/80 mt-1">
                    {dueInfo.overdueCount} {dueInfo.overdueCount === 1 ? 'lançamento vencido' : 'lançamentos vencidos'} sem pagamento
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 text-brand-700 text-xs font-semibold uppercase tracking-wider">
                  <CheckCircle2 className="w-4 h-4" /> Em dia
                </div>
                <p className="mt-3 text-sm text-sand-500">Nenhum lançamento vencido. Tudo certo por aqui.</p>
              </>
            )}
          </Card>
        </div>
      </div>

      {/* Lançamentos do período */}
      <Card className="p-0 overflow-hidden mt-10">
        <div className="px-5 pt-5 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-semibold text-sand-900">Lançamentos</h2>
            <p className="text-xs text-sand-400">{data.period} · todas as categorias</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
            {data.hasIncome && (
              <div className="grid grid-cols-3 gap-1 p-1 bg-sand-100 rounded-xl" role="tablist" aria-label="Tipo">
                {([['ALL', 'Tudo'], ['EXPENSE', 'Despesas'], ['INCOME', 'Entradas']] as const).map(([value, label]) => (
                  <button
                    key={value}
                    role="tab"
                    aria-selected={kindFilter === value}
                    onClick={() => setKindFilter(value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                      kindFilter === value ? 'bg-white shadow-sm text-sand-900' : 'text-sand-500 hover:text-sand-800'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
            <div className="grid grid-cols-3 gap-1 p-1 bg-sand-100 rounded-xl" role="tablist" aria-label="Status">
              {([['ALL', 'Todos'], ['PENDING', 'Em aberto'], ['PAID', 'Quitados']] as const).map(([value, label]) => (
                <button
                  key={value}
                  role="tab"
                  aria-selected={statusFilter === value}
                  onClick={() => setStatusFilter(value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                    statusFilter === value ? 'bg-white shadow-sm text-sand-900' : 'text-sand-500 hover:text-sand-800'
                  }`}
                >
                  {label} <span className="text-sand-400 font-medium">{counts[value]}</span>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-sand-200 bg-sand-50/60 focus-within:bg-white focus-within:border-brand-500">
              <Search className="w-4 h-4 text-sand-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..." className="bg-transparent text-sm outline-none w-full sm:w-36 placeholder-sand-400" />
            </div>
          </div>
        </div>

        {listItems.length === 0 ? (
          <div className="py-14 text-center border-t border-sand-100">
            <p className="text-sand-600 font-medium">Nenhum lançamento encontrado</p>
            <p className="text-sm text-sand-400 mt-1">Tente outro período ou filtro.</p>
          </div>
        ) : (
          <>
          {/* Cabeçalho das colunas (computador): vencimento e status primeiro */}
          <div className="hidden sm:flex items-center gap-3 md:gap-4 px-5 py-2 border-t border-sand-100 bg-sand-50/70 text-[10px] font-bold uppercase tracking-[0.12em] text-sand-400">
            <span className="w-[72px] flex-shrink-0">Vencimento</span>
            <span className="w-[104px] flex-shrink-0">Status</span>
            <span className="flex-1">Descrição</span>
            <span className="hidden lg:block w-40 flex-shrink-0">Conta</span>
            <span className="hidden lg:block w-32 flex-shrink-0">Método</span>
            <span className="w-24 md:w-28 text-right">Valor</span>
          </div>
          <ul className="divide-y divide-sand-100 border-t border-sand-100 max-h-[560px] overflow-y-auto scroll-thin-light">
            {listItems.map(item => {
              const cat = categoryByKey.get(item.type)!;
              const Icon = getCategoryIcon(cat.icon);
              const income = isIncome(cat);
              const overdue = item.status === 'PENDING' && item.date < dueInfo.today;
              const pay = payInfo(item);
              const statusButton = (
                <button
                  onClick={() => toggleStatus(item)}
                  disabled={togglingId === item.id}
                  title={item.status === 'PAID' ? (income ? 'Marcar como a receber' : 'Marcar como em aberto') : income ? 'Marcar como recebido' : 'Marcar como pago'}
                  className="flex-shrink-0 disabled:opacity-50 hover:opacity-80 transition"
                >
                  {togglingId === item.id ? <Loader2 className="w-4 h-4 animate-spin text-sand-400 mx-4" /> : <StatusBadge status={item.status} income={income} />}
                </button>
              );
              return (
                <li key={item.id} className="flex items-center gap-3 md:gap-4 px-4 sm:px-5 py-3 hover:bg-sand-50/60 transition-colors">
                  {/* Computador: vencimento e status nas primeiras colunas */}
                  <div className="hidden sm:block w-[72px] flex-shrink-0">
                    <span className={`block text-sm tabular ${overdue ? 'text-clay-600 font-semibold' : 'text-sand-700'}`}>{formatShortDate(item.date)}</span>
                    {overdue && <span className="block text-[10px] font-semibold uppercase tracking-wide text-clay-600">{income ? 'atrasado' : 'vencido'}</span>}
                  </div>
                  <div className="hidden sm:block w-[104px] flex-shrink-0">{statusButton}</div>
                  <div className="grid place-items-center w-9 h-9 rounded-lg flex-shrink-0" style={{ backgroundColor: `${cat.color}1a`, color: cat.color }}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-sand-900 line-clamp-2 break-words sm:truncate">{item.description}</p>
                    <p className="text-xs text-sand-400 truncate">
                      {cat.parent_key && categoryByKey.get(cat.parent_key) && <span>{categoryByKey.get(cat.parent_key)!.name} › </span>}<Link to={categoryPath(cat.key)} className="hover:text-sand-700 hover:underline">{cat.name}</Link>
                      {income && item.receiver && <span> · {item.receiver}</span>}
                      {pay && <span className="lg:hidden"> · {pay.conta} · {pay.metodo}</span>}
                      <span className={`sm:hidden ${overdue ? 'text-clay-600 font-semibold' : ''}`}> · {income ? 'recebe' : 'vence'} {formatShortDate(item.date)}{overdue && (income ? ' · atrasado' : ' · vencido')}</span>
                    </p>
                  </div>
                  <div className="hidden lg:flex items-center gap-1.5 w-40 flex-shrink-0 min-w-0 text-xs text-sand-600" title={pay?.conta}>
                    {pay ? <><span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: pay.color }} /><span className="truncate">{pay.conta}</span></> : <span className="text-sand-300">—</span>}
                  </div>
                  <div className="hidden lg:block w-32 flex-shrink-0 min-w-0 text-xs text-sand-600 truncate" title={pay?.metodo}>
                    {pay ? pay.metodo : <span className="text-sand-300">—</span>}
                  </div>
                  {item.receiptUrl && (
                    <a href={item.receiptUrl} target="_blank" rel="noopener noreferrer" title="Ver comprovante" className="hidden sm:grid place-items-center p-1.5 rounded-lg text-brand-700 hover:bg-brand-50">
                      <Paperclip className="w-4 h-4" />
                    </a>
                  )}
                  {/* No celular: valor em cima e situação embaixo, para sobrar espaço para a descrição */}
                  <div className="flex flex-col-reverse items-end gap-1 flex-shrink-0">
                  <div className="sm:hidden">{statusButton}</div>
                  <div className="sm:w-24 md:w-28 text-right flex-shrink-0">
                    <span className={`block text-sm font-semibold tabular whitespace-nowrap ${income ? 'text-emerald-700' : 'text-red-600'}`}>{income ? '+ ' : '− '}{formatBRL(item.amount)}</span>
                    {(() => {
                      const itemShares = sharesByExpense.get(String(item.id));
                      if (!itemShares?.length) return null;
                      const mine = item.amount - itemShares.reduce((a, s) => a + s.amount, 0);
                      return (
                        <span className="flex items-center justify-end gap-1 mt-0.5" title={itemShares.map(s => `${payerById.get(s.payerId)?.name}: ${formatBRL(s.amount)}`).join('\n')}>
                          <span className="flex -space-x-1">
                            {itemShares.map(s => (
                              <span key={s.id} className="w-3 h-3 rounded-full ring-1 ring-white" style={{ backgroundColor: payerById.get(s.payerId)?.color ?? '#b3a68f' }} />
                            ))}
                          </span>
                          <span className="text-[11px] text-sand-400 tabular">sua {formatBRL(mine)}</span>
                        </span>
                      );
                    })()}
                  </div>
                  </div>
                </li>
              );
            })}
          </ul>
          </>
        )}
        {listItems.length > 0 && (
          <div className="flex justify-between px-5 py-3 border-t border-sand-100 bg-sand-50/70 text-sm">
            <span className="text-sand-500">{listItems.length} {listItems.length === 1 ? 'item' : 'itens'}</span>
            <span className="font-bold text-sand-900 tabular">{formatBRL(sum(listItems))}</span>
          </div>
        )}
      </Card>

      {/* A receber por pagante */}
      {data.byPayer.length > 0 && (
        <>
          <h2 className="font-display text-xl font-semibold text-sand-900 mt-10 mb-1">A receber</h2>
          <p className="text-xs text-sand-400 mb-4">Partes de outras pessoas nas despesas de {data.period.toLowerCase()}. Clique em uma parte para marcar o reembolso.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.byPayer.map(group => (
              <Card key={group.payer.id} className="p-0 overflow-hidden">
                <div className="flex items-center gap-3 px-5 py-4 border-b border-sand-100">
                  <div className="grid place-items-center w-10 h-10 rounded-full text-sm font-bold text-white flex-shrink-0" style={{ backgroundColor: group.payer.color }}>
                    {initials(group.payer.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sand-900 text-sm truncate">{group.payer.name}</p>
                    <p className="text-xs text-sand-400">{formatBRL(group.received)} já reembolsado</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-bold tabular ${group.pending > 0 ? 'text-[#5279a3]' : 'text-brand-700'}`}>{formatBRL(group.pending)}</p>
                    <p className="text-[11px] text-sand-400">{group.pending > 0 ? 'a receber' : 'tudo recebido'}</p>
                  </div>
                </div>
                <ul className="divide-y divide-sand-100 max-h-64 overflow-y-auto scroll-thin-light">
                  {group.shares.map(({ share, item }) => (
                    <li key={share.id} className="flex items-center gap-3 px-5 py-2.5">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-sand-800 truncate">{item.description}</p>
                        <p className="text-[11px] text-sand-400">vence {formatShortDate(item.date)} · total {formatBRL(item.amount)}</p>
                      </div>
                      <span className="text-sm font-semibold text-sand-900 tabular">{formatBRL(share.amount)}</span>
                      <button
                        onClick={() => toggleReimbursed(share)}
                        disabled={togglingId === share.id}
                        title={share.reimbursed ? 'Marcar como não reembolsado' : 'Marcar como reembolsado'}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition disabled:opacity-50 ${
                          share.reimbursed ? 'bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-600/15' : 'bg-sky-50 text-[#3d5f85] ring-1 ring-inset ring-[#5279a3]/20 hover:bg-sky-100'
                        }`}
                      >
                        {togglingId === share.id ? <Loader2 className="w-3 h-3 animate-spin" /> : share.reimbursed ? <><CheckCircle2 className="w-3 h-3" /> Recebido</> : 'A receber'}
                      </button>
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Categorias */}
      {data.hasIncome && (
        <>
          <h2 className="font-display text-xl font-semibold text-sand-900 mt-10 mb-4">Recebimentos</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.byIncomeCategory.filter(c => c.count > 0).map(cat => {
              const Icon = getCategoryIcon(cat.icon);
              const pct = cat.total > 0 ? (cat.paid / cat.total) * 100 : 0;
              return (
                <Link key={cat.key} to={categoryPath(cat.key)} className="group bg-white rounded-2xl border border-sand-200 shadow-soft p-5 hover:border-sand-300 hover:-translate-y-0.5 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="grid place-items-center w-10 h-10 rounded-xl" style={{ backgroundColor: `${cat.color}1a`, color: cat.color }}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sand-900 text-sm truncate">{cat.name}</p>
                      <p className="text-xs text-sand-400">{cat.count} {cat.count === 1 ? 'recebimento' : 'recebimentos'}</p>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-sand-300 group-hover:text-sand-600 transition" />
                  </div>
                  <p className="text-2xl font-bold text-brand-700 mt-5 tabular">+ {formatBRL(cat.total)}</p>
                  <div className="h-1.5 rounded-full bg-sand-100 mt-3 overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: cat.color }} />
                  </div>
                  <div className="flex justify-between text-xs mt-2">
                    <span className="text-sand-500">{Math.round(pct)}% recebido</span>
                    <span className={cat.pending > 0 ? 'text-[#3d5f85] font-medium' : 'text-sand-400'}>
                      {cat.pending > 0 ? `${formatBRL(cat.pending)} a receber` : 'Tudo recebido'}
                    </span>
                  </div>
                </Link>
              );
            })}
            {data.byReceiver.length > 0 && (
              <Card className="p-5">
                <div className="flex items-center gap-2 text-sand-500 text-xs font-semibold uppercase tracking-wider">
                  <UserRound className="w-4 h-4 text-brand-600" /> Por pessoa
                </div>
                <ul className="mt-4 space-y-3">
                  {data.byReceiver.map(r => (
                    <li key={r.name}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-sand-800">{r.name}</span>
                        <span className="font-semibold text-sand-900 tabular">{formatBRL(r.total)}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-sand-100 mt-1.5 overflow-hidden">
                        <div className="h-full rounded-full bg-brand-500" style={{ width: `${data.inTotal ? (r.total / data.inTotal) * 100 : 0}%` }} />
                      </div>
                      <p className="text-[11px] text-sand-400 mt-1">{formatBRL(r.received)} recebido</p>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </div>
        </>
      )}

      <h2 className="font-display text-xl font-semibold text-sand-900 mt-10 mb-4">{data.hasIncome ? 'Despesas por categoria' : 'Por categoria'}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.byCategory.map(cat => {
          const Icon = getCategoryIcon(cat.icon);
          const pct = cat.total > 0 ? (cat.paid / cat.total) * 100 : 0;
          return (
            <Link
              key={cat.key}
              to={categoryPath(cat.key)}
              className={`group bg-white rounded-2xl border border-sand-200 shadow-soft p-5 hover:border-sand-300 hover:-translate-y-0.5 transition-all ${cat.count === 0 ? 'opacity-60' : ''}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="grid place-items-center w-10 h-10 rounded-xl" style={{ backgroundColor: `${cat.color}1a`, color: cat.color }}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-sand-900 text-sm">{cat.name}</p>
                    <p className="text-xs text-sand-400">{cat.count} {cat.count === 1 ? 'lançamento' : 'lançamentos'}</p>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-sand-300 group-hover:text-sand-600 transition" />
              </div>
              <p className="text-2xl font-bold text-sand-900 mt-5 tabular">{formatBRL(cat.total)}</p>
              <div className="h-1.5 rounded-full bg-sand-100 mt-3 overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: cat.color }} />
              </div>
              <div className="flex justify-between text-xs mt-2">
                <span className="text-sand-500">{cat.count ? `${Math.round(pct)}% pago` : 'Sem lançamentos'}</span>
                <span className={cat.pending > 0 ? 'text-clay-600 font-medium' : 'text-sand-400'}>
                  {cat.pending > 0 ? `${formatBRL(cat.pending)} em aberto` : cat.count ? 'Nada em aberto' : ''}
                </span>
              </div>
              {cat.subs.length > 0 && (
                <ul className="mt-4 pt-3 border-t border-sand-100 space-y-1.5">
                  {cat.subs.map(s => (
                    <li key={s.key} className="flex items-center justify-between gap-2 text-xs">
                      <span className="flex items-center gap-2 text-sand-600 min-w-0">
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                        <span className="truncate">{s.name}</span>
                      </span>
                      <span className="text-sand-500 tabular flex-shrink-0">{formatBRL(s.total)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Link>
          );
        })}
      </div>

      {/* Gráficos */}
      {pieData.length > 0 && (
        <div className={`grid grid-cols-1 gap-4 mt-10 ${isSingleMonth ? '' : 'lg:grid-cols-5'}`}>
          <Card className={isSingleMonth ? '' : 'lg:col-span-2'}>
            <h3 className="font-display text-lg font-semibold text-sand-900">Distribuição</h3>
            <p className="text-xs text-sand-400 mb-2">Participação de cada categoria no total de despesas</p>
            <div className={isSingleMonth ? 'grid md:grid-cols-2 gap-6 items-center' : ''}>
              <div className="relative h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="total" nameKey="name" innerRadius={68} outerRadius={92} paddingAngle={2} stroke="none">
                      {pieData.map(c => <Cell key={c.key} fill={c.color} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatBRL(v)} contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 grid place-items-center pointer-events-none text-center">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-sand-400 font-semibold">Total</p>
                    <p className="font-display text-2xl font-semibold text-sand-900">{compactBRL(data.total)}</p>
                  </div>
                </div>
              </div>
              <ul className="space-y-2 mt-2">
                {pieData.map(c => (
                  <li key={c.key} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-sand-600">
                      <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: c.color }} />
                      {c.name}
                    </span>
                    <span className="text-sand-400 tabular text-xs">{((c.total / data.total) * 100).toFixed(1)}%</span>
                  </li>
                ))}
              </ul>
            </div>
          </Card>

          {!isSingleMonth && (
            <Card className="lg:col-span-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-display text-lg font-semibold text-sand-900">Entradas x saídas</h3>
                  <p className="text-xs text-sand-400">Entradas e saídas (sua parte) por mês</p>
                </div>
                <div className="flex gap-3 text-xs text-sand-500">
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-brand-600" /> Entradas</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-clay-300" /> Saídas</span>
                </div>
              </div>
              <div className="h-80 mt-4 -ml-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.monthly} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="#f4f0e8" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#8c806b' }} axisLine={false} tickLine={false} minTickGap={8} />
                    <YAxis tickFormatter={compactBRL} tick={{ fontSize: 11, fill: '#8c806b' }} axisLine={false} tickLine={false} width={64} />
                    <Tooltip cursor={{ fill: '#faf8f4' }} formatter={(v: number) => formatBRL(v)} contentStyle={tooltipStyle} />
                    <Bar dataKey="entradas" name="Entradas" fill="#2f6b57" radius={[6, 6, 0, 0]} maxBarSize={20} />
                    <Bar dataKey="saidas" name="Saídas" fill="#e4a178" radius={[6, 6, 0, 0]} maxBarSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};
