import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, FileDown, CheckCheck, Users, Settings, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Button, Card, PageHeader } from './UI';
import { StorageService } from '../services/storage';
import { ShareService } from '../services/payerStorage';
import { ExpenseItem, ExpenseShare } from '../types';
import { usePayers, initials } from '../lib/PayersContext';
import { useCategories } from '../lib/CategoriesContext';
import { formatBRL } from '../lib/categories';

type Preset = 'MONTH' | 'YEAR' | 'ALL' | 'CUSTOM';

const pad = (n: number) => String(n).padStart(2, '0');
const today = new Date();
const monthStart = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-01`;
const monthEnd = new Date(Date.UTC(today.getFullYear(), today.getMonth() + 1, 0)).toISOString().slice(0, 10);
const dateBR = (d: string) => new Date(d).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

interface Row {
  share: ExpenseShare;
  item: ExpenseItem;
}

export const PayersPage: React.FC = () => {
  const { payers, payerById, tableMissing, isLoading: payersLoading } = usePayers();
  const { categoryByKey } = useCategories();
  const [items, setItems] = useState<ExpenseItem[]>([]);
  const [shares, setShares] = useState<ExpenseShare[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [preset, setPreset] = useState<Preset>('ALL');
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(monthEnd);
  const [selected, setSelected] = useState<string | null>(null);
  const [onlyPending, setOnlyPending] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([StorageService.getAll(), ShareService.getAll()])
      .then(([all, s]) => { setItems(all); setShares(s); })
      .finally(() => setIsLoading(false));
  }, []);

  const applyPreset = (p: Preset) => {
    setPreset(p);
    if (p === 'MONTH') { setFrom(monthStart); setTo(monthEnd); }
    if (p === 'YEAR') { setFrom(`${today.getFullYear()}-01-01`); setTo(`${today.getFullYear()}-12-31`); }
  };

  const periodLabel = useMemo(() => {
    if (preset === 'ALL') return 'Todo o período';
    if (preset === 'MONTH') return `${MONTHS[today.getMonth()]} de ${today.getFullYear()}`;
    if (preset === 'YEAR') return `Ano de ${today.getFullYear()}`;
    return `${dateBR(from)} a ${dateBR(to)}`;
  }, [preset, from, to]);

  const itemById = useMemo(() => new Map(items.map(i => [String(i.id), i])), [items]);

  // Partes dentro do período escolhido
  const rows: Row[] = useMemo(
    () =>
      shares
        .map(share => ({ share, item: itemById.get(share.expenseId)! }))
        .filter(r => r.item && (preset === 'ALL' || (r.item.date >= from && r.item.date <= to)))
        .sort((a, b) => a.item.date.localeCompare(b.item.date)),
    [shares, itemById, preset, from, to]
  );

  const summary = useMemo(
    () =>
      payers
        .map(p => {
          const pr = rows.filter(r => r.share.payerId === p.id);
          const due = pr.reduce((s, r) => s + r.share.amount, 0);
          const paid = pr.filter(r => r.share.reimbursed).reduce((s, r) => s + r.share.amount, 0);
          return { payer: p, count: pr.length, due, paid, pending: due - paid };
        })
        .filter(s => s.count > 0)
        .sort((a, b) => b.pending - a.pending),
    [payers, rows]
  );

  const totals = summary.reduce((t, s) => ({ due: t.due + s.due, paid: t.paid + s.paid }), { due: 0, paid: 0 });
  const payer = selected ? payerById.get(selected) : undefined;
  const detail = rows.filter(r => r.share.payerId === selected && (!onlyPending || !r.share.reimbursed));

  const setReimbursed = async (ids: string[], value: boolean, key: string) => {
    setBusy(key);
    try {
      await ShareService.setReimbursedMany(ids, value);
      setShares(prev => prev.map(s => (ids.includes(s.id) ? { ...s, reimbursed: value } : s)));
    } catch (e: any) {
      alert('Erro ao atualizar: ' + (e?.message || 'verifique o console.'));
    } finally {
      setBusy(null);
    }
  };

  const exportPayer = async () => {
    if (!payer) return;
    setBusy('pdf');
    try {
      // A biblioteca de PDF só é baixada quando alguém exporta
      const { downloadPayerStatement } = await import('../lib/pdfReports');
      await downloadPayerStatement(
        payer.name,
        periodLabel,
        detail.map(r => ({
          date: r.item.date,
          description: r.item.description,
          category: categoryByKey.get(r.item.type)?.name ?? '—',
          total: Number(r.item.amount),
          share: r.share.amount,
          reimbursed: r.share.reimbursed,
        })),
        onlyPending
      );
    } finally {
      setBusy(null);
    }
  };

  const exportSummary = async () => {
    setBusy('pdf-all');
    try {
      const { downloadPayersSummary } = await import('../lib/pdfReports');
      await downloadPayersSummary(periodLabel, summary.map(s => ({ name: s.payer.name, count: s.count, due: s.due, paid: s.paid })));
    } finally {
      setBusy(null);
    }
  };

  if (isLoading || payersLoading) {
    return <div className="flex h-[60vh] items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-brand-600" /></div>;
  }

  if (tableMissing || payers.length === 0) {
    return (
      <div>
        <PageHeader eyebrow="Geral" title="Pagantes" />
        <Card className="text-center py-12">
          <Users className="w-10 h-10 text-sand-300 mx-auto mb-3" />
          <p className="text-sand-700 font-medium">Nenhum pagante cadastrado</p>
          <Link to="/configuracoes" className="inline-flex items-center gap-2 mt-4 text-sm font-semibold text-brand-700 hover:underline">
            <Settings className="w-4 h-4" /> Cadastrar em Configurações
          </Link>
        </Card>
      </div>
    );
  }

  const presetBtn = (p: Preset, label: string) => (
    <button
      key={p}
      onClick={() => applyPreset(p)}
      className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${preset === p ? 'bg-white shadow-sm text-sand-900' : 'text-sand-500 hover:text-sand-800'}`}
    >
      {label}
    </button>
  );

  return (
    <div>
      <PageHeader
        eyebrow="Geral"
        title={payer ? payer.name : 'Pagantes'}
        description={payer ? `Despesas divididas com ${payer.name} · ${periodLabel}` : `Quanto cada pessoa deve das despesas divididas · ${periodLabel}`}
        actions={
          payer ? (
            <Button onClick={exportPayer} disabled={busy === 'pdf' || detail.length === 0} className="w-full md:w-auto">
              {busy === 'pdf' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />} Baixar extrato (PDF)
            </Button>
          ) : (
            <Button onClick={exportSummary} disabled={busy === 'pdf-all' || summary.length === 0} className="w-full md:w-auto">
              {busy === 'pdf-all' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />} Relatório geral (PDF)
            </Button>
          )
        }
      />

      {/* Período */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
        <div className="inline-flex gap-1 p-1 bg-sand-200/60 rounded-xl self-start" role="tablist" aria-label="Período">
          {presetBtn('MONTH', 'Este mês')}
          {presetBtn('YEAR', 'Este ano')}
          {presetBtn('ALL', 'Tudo')}
          {presetBtn('CUSTOM', 'Escolher datas')}
        </div>
        {preset === 'CUSTOM' && (
          <div className="flex items-center gap-2 text-sm text-sand-600">
            <input type="date" value={from} onChange={e => setFrom(e.target.value)} aria-label="De" className="rounded-xl border border-sand-200 bg-white px-3 py-2 text-sm" />
            até
            <input type="date" value={to} onChange={e => setTo(e.target.value)} aria-label="Até" className="rounded-xl border border-sand-200 bg-white px-3 py-2 text-sm" />
          </div>
        )}
      </div>

      {!payer ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            {[
              { label: 'Total devido', value: totals.due, cls: 'text-sand-900' },
              { label: 'Já reembolsado', value: totals.paid, cls: 'text-brand-700' },
              { label: 'A receber', value: totals.due - totals.paid, cls: 'text-[#3d5f85]' },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-2xl border border-sand-200 shadow-soft px-5 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-sand-400">{s.label}</p>
                <p className={`text-xl font-bold mt-1 tabular ${s.cls}`}>{formatBRL(s.value)}</p>
              </div>
            ))}
          </div>

          <Card className="p-0 overflow-hidden">
            {summary.length === 0 ? (
              <p className="py-12 text-center text-sm text-sand-400">Nenhuma despesa dividida neste período.</p>
            ) : (
              <ul className="divide-y divide-sand-100">
                {summary.map(s => {
                  const pct = s.due > 0 ? (s.paid / s.due) * 100 : 0;
                  return (
                    <li key={s.payer.id}>
                      <button onClick={() => setSelected(s.payer.id)} className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-sand-50/70 transition">
                        <div className="grid place-items-center w-11 h-11 rounded-full text-sm font-bold text-white flex-shrink-0" style={{ backgroundColor: s.payer.color }}>
                          {initials(s.payer.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sand-900 text-sm">{s.payer.name}</p>
                          <div className="h-1.5 rounded-full bg-sand-100 mt-2 overflow-hidden max-w-xs">
                            <div className="h-full rounded-full bg-brand-500" style={{ width: `${pct}%` }} />
                          </div>
                          <p className="text-[11px] text-sand-400 mt-1">{s.count} {s.count === 1 ? 'lançamento' : 'lançamentos'} · {formatBRL(s.paid)} de {formatBRL(s.due)} reembolsado</p>
                        </div>
                        <div className="text-right">
                          <p className={`text-lg font-bold tabular ${s.pending > 0 ? 'text-[#3d5f85]' : 'text-brand-700'}`}>{formatBRL(s.pending)}</p>
                          <p className="text-[11px] text-sand-400">{s.pending > 0 ? 'a receber' : 'tudo recebido'}</p>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </>
      ) : (
        (() => {
          const all = rows.filter(r => r.share.payerId === payer.id);
          const due = all.reduce((s, r) => s + r.share.amount, 0);
          const paid = all.filter(r => r.share.reimbursed).reduce((s, r) => s + r.share.amount, 0);
          const pendingIds = all.filter(r => !r.share.reimbursed).map(r => r.share.id);
          return (
            <>
              <button onClick={() => setSelected(null)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-sand-600 hover:text-sand-900 mb-4">
                <ArrowLeft className="w-4 h-4" /> Todos os pagantes
              </button>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                {[
                  { label: `Parte de ${payer.name}`, value: due, cls: 'text-sand-900' },
                  { label: 'Já pago', value: paid, cls: 'text-brand-700' },
                  { label: 'Saldo a pagar', value: due - paid, cls: 'text-[#3d5f85]' },
                ].map(s => (
                  <div key={s.label} className="bg-white rounded-2xl border border-sand-200 shadow-soft px-5 py-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-sand-400">{s.label}</p>
                    <p className={`text-xl font-bold mt-1 tabular ${s.cls}`}>{formatBRL(s.value)}</p>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                <label className="flex items-center gap-2 text-sm text-sand-700 cursor-pointer select-none">
                  <input type="checkbox" checked={onlyPending} onChange={e => setOnlyPending(e.target.checked)} className="w-4 h-4 accent-brand-700" />
                  Mostrar (e exportar) só o que está pendente
                </label>
                {pendingIds.length > 0 && (
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={busy === 'all'}
                    onClick={() => {
                      if (window.confirm(`Marcar ${pendingIds.length} lançamento(s) de ${payer.name} como recebidos (${formatBRL(due - paid)})?`)) {
                        setReimbursed(pendingIds, true, 'all');
                      }
                    }}
                  >
                    {busy === 'all' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCheck className="w-3.5 h-3.5" />} Marcar tudo como recebido
                  </Button>
                )}
              </div>

              <Card className="p-0 overflow-hidden">
                {detail.length === 0 ? (
                  <p className="py-12 text-center text-sm text-sand-400">{onlyPending ? 'Nada pendente neste período.' : 'Nenhum lançamento neste período.'}</p>
                ) : (
                  <ul className="divide-y divide-sand-100">
                    {detail.map(({ share, item }) => (
                      <li key={share.id} className="flex items-center gap-3 px-5 py-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-sand-900 truncate">{item.description}</p>
                          <p className="text-[11px] text-sand-400">{dateBR(item.date)} · {categoryByKey.get(item.type)?.name ?? '—'} · total {formatBRL(Number(item.amount))}</p>
                        </div>
                        <span className="text-sm font-semibold text-sand-900 tabular">{formatBRL(share.amount)}</span>
                        <button
                          onClick={() => setReimbursed([share.id], !share.reimbursed, share.id)}
                          disabled={busy === share.id}
                          title={share.reimbursed ? 'Marcar como a receber' : 'Marcar como recebido'}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition disabled:opacity-50 ${
                            share.reimbursed ? 'bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-600/15' : 'bg-sky-50 text-[#3d5f85] ring-1 ring-inset ring-[#5279a3]/20 hover:bg-sky-100'
                          }`}
                        >
                          {busy === share.id ? <Loader2 className="w-3 h-3 animate-spin" /> : share.reimbursed ? <><CheckCircle2 className="w-3 h-3" /> Recebido</> : 'A receber'}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </>
          );
        })()
      )}
    </div>
  );
};
