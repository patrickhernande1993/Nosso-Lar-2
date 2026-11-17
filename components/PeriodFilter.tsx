import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';

export const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const now = new Date();
const CURRENT_YEAR = String(now.getFullYear());
const CURRENT_MONTH = String(now.getMonth() + 1).padStart(2, '0');

/** Período: ano e mês ('' = todos). */
export interface Period { year: string; month: string }

const STORAGE_KEY = 'nosso-lar:periodo-categorias';
const readPeriod = (): Period => {
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null');
    if (saved && typeof saved.year === 'string' && typeof saved.month === 'string') return saved;
  } catch { /* sem armazenamento */ }
  return { year: CURRENT_YEAR, month: CURRENT_MONTH };
};

/** Período das páginas de categoria: abre no mês atual e é mantido ao trocar de categoria (nesta aba). */
export const useCategoryPeriod = () => {
  const [period, setPeriodState] = useState<Period>(readPeriod);
  const setPeriod = (p: Period) => {
    setPeriodState(p);
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(p)); } catch { /* sem armazenamento */ }
  };
  return [period, setPeriod] as const;
};

export const inPeriod = (date: string, p: Period) => {
  const [y, m] = date.split('-');
  return (!p.year || y === p.year) && (!p.month || m === p.month);
};

export const periodLabel = (p: Period) => {
  if (p.month && p.year) return `${MONTHS[Number(p.month) - 1]} de ${p.year}`;
  if (p.month) return `${MONTHS[Number(p.month) - 1]} · todos os anos`;
  if (p.year) return `Ano de ${p.year}`;
  return 'Todo o período';
};

const selectCls =
  'select-clean min-w-0 pl-3 pr-8 sm:pl-3.5 sm:pr-9 py-2.5 bg-white border border-sand-200 rounded-xl text-sm font-medium text-sand-800 focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500';
const arrowCls = 'p-2.5 rounded-xl border border-sand-200 bg-white text-sand-600 hover:bg-sand-50 transition flex-shrink-0';

export const PeriodFilter: React.FC<{ value: Period; onChange: (p: Period) => void; years: string[] }> = ({ value, onChange, years }) => {
  const single = !!(value.year && value.month);
  const isCurrent = value.year === CURRENT_YEAR && value.month === CURRENT_MONTH;
  const yearOptions = Array.from(new Set([CURRENT_YEAR, ...years, ...(value.year ? [value.year] : [])])).sort().reverse();

  const shift = (delta: number) => {
    let m = Number(value.month) + delta;
    let y = Number(value.year);
    if (m < 1) { m = 12; y -= 1; }
    if (m > 12) { m = 1; y += 1; }
    onChange({ year: String(y), month: String(m).padStart(2, '0') });
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <p className="text-sm font-semibold text-sand-700 truncate">{periodLabel(value)}</p>
        {!isCurrent && (
          <button
            onClick={() => onChange({ year: CURRENT_YEAR, month: CURRENT_MONTH })}
            className="flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-900 whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Mês atual
          </button>
        )}
      </div>
      <div className="flex items-center gap-2 w-full sm:w-auto">
        {single && (
          <button onClick={() => shift(-1)} aria-label="Mês anterior" className={arrowCls}>
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
        <select aria-label="Mês" value={value.month} onChange={e => onChange({ ...value, month: e.target.value })} className={`${selectCls} flex-[3] sm:flex-none sm:w-40`}>
          <option value="">Todos os meses</option>
          {MONTHS.map((m, i) => <option key={m} value={String(i + 1).padStart(2, '0')}>{m}</option>)}
        </select>
        <select aria-label="Ano" value={value.year} onChange={e => onChange({ ...value, year: e.target.value })} className={`${selectCls} flex-[2] sm:flex-none sm:w-32`}>
          <option value="">Todos os anos</option>
          {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        {single && (
          <button onClick={() => shift(1)} aria-label="Próximo mês" className={arrowCls}>
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
