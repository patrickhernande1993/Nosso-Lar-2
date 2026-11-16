import React from 'react';
import { Link } from 'react-router-dom';
import { Plus, X, Users, Check } from 'lucide-react';
import { usePayers, initials } from '../lib/PayersContext';
import { formatBRL } from '../lib/categories';
import { ShareDraft } from '../types';

/** Linha do formulário: valor como texto para o input. */
export interface ShareRow {
  payerId: string;
  amount: string;
  reimbursed: boolean;
}

export const toRows = (shares: ShareDraft[]): ShareRow[] =>
  shares.map(s => ({ payerId: s.payerId, amount: String(s.amount), reimbursed: s.reimbursed }));

/** Valida as linhas e devolve as partes prontas para salvar, ou uma mensagem de erro. */
export const validateRows = (rows: ShareRow[], total: number): { shares: ShareDraft[] } | { error: string } => {
  const shares: ShareDraft[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const amount = parseFloat(row.amount);
    if (!row.payerId) return { error: 'Escolha o pagante em todas as linhas da divisão.' };
    if (seen.has(row.payerId)) return { error: 'O mesmo pagante aparece duas vezes na divisão.' };
    if (!(amount > 0)) return { error: 'Informe um valor maior que zero para cada pagante.' };
    seen.add(row.payerId);
    shares.push({ payerId: row.payerId, amount: Math.round(amount * 100) / 100, reimbursed: row.reimbursed });
  }
  const sum = shares.reduce((a, s) => a + s.amount, 0);
  if (sum - total > 0.009) return { error: `A soma das partes (${formatBRL(sum)}) passa do valor da despesa (${formatBRL(total)}).` };
  return { shares };
};

interface SplitEditorProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  rows: ShareRow[];
  onChange: (rows: ShareRow[]) => void;
  total: number;
  disabled?: boolean;
  /** Na geração em lote o reembolso ainda não existe, então a opção fica oculta. */
  showReimbursed?: boolean;
}

export const SplitEditor: React.FC<SplitEditorProps> = ({ enabled, onToggle, rows, onChange, total, disabled, showReimbursed = true }) => {
  const { payers, payerById, tableMissing } = usePayers();
  if (tableMissing) return null;

  const others = rows.reduce((a, r) => a + (parseFloat(r.amount) || 0), 0);
  const mine = total - others;
  const update = (i: number, patch: Partial<ShareRow>) => onChange(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const usedIds = new Set(rows.map(r => r.payerId));
  const nextFree = payers.find(p => !usedIds.has(p.id))?.id ?? '';

  // Divide igualmente entre você e os pagantes da lista.
  const splitEqually = () => {
    if (!total || rows.length === 0) return;
    const each = Math.floor((total / (rows.length + 1)) * 100) / 100;
    onChange(rows.map(r => ({ ...r, amount: each.toFixed(2) })));
  };

  return (
    <div className={`rounded-2xl border transition-colors ${enabled ? 'border-brand-200 bg-brand-50/40' : 'border-sand-200 bg-sand-50/60'}`}>
      <label className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={enabled}
          disabled={disabled}
          onChange={e => {
            onToggle(e.target.checked);
            if (e.target.checked && rows.length === 0 && payers[0]) onChange([{ payerId: payers[0].id, amount: '', reimbursed: false }]);
          }}
          className="w-4 h-4 rounded accent-brand-700"
        />
        <Users className="w-4 h-4 text-sand-500" />
        <span className="flex-1 text-sm font-semibold text-sand-800">Dividir com outras pessoas</span>
        {enabled && total > 0 && (
          <span className={`text-xs font-semibold tabular ${mine < -0.009 ? 'text-clay-600' : 'text-brand-700'}`}>Sua parte: {formatBRL(mine)}</span>
        )}
      </label>

      {enabled && (
        <div className="px-4 pb-4 space-y-2">
          {payers.length === 0 ? (
            <p className="text-sm text-sand-500">
              Nenhum pagante cadastrado. Cadastre em{' '}
              <Link to="/configuracoes" className="font-semibold text-brand-700 underline">Configurações → Pagantes</Link>.
            </p>
          ) : (
            <>
              {rows.map((row, i) => {
                const payer = payerById.get(row.payerId);
                return (
                  <div key={i} className="flex items-center gap-2">
                    <div
                      className="grid place-items-center w-8 h-8 rounded-full text-[11px] font-bold text-white flex-shrink-0"
                      style={{ backgroundColor: payer?.color ?? '#b3a68f' }}
                    >
                      {payer ? initials(payer.name) : '?'}
                    </div>
                    <select
                      aria-label="Pagante"
                      value={row.payerId}
                      onChange={e => update(i, { payerId: e.target.value })}
                      disabled={disabled}
                      className="select-clean flex-1 min-w-0 pl-3 pr-8 py-2 bg-white border border-sand-200 rounded-xl text-sm text-sand-800 focus:outline-none focus:border-brand-500"
                    >
                      <option value="">Escolha...</option>
                      {payers.map(p => (
                        <option key={p.id} value={p.id} disabled={p.id !== row.payerId && usedIds.has(p.id)}>{p.name}</option>
                      ))}
                    </select>
                    <div className="relative w-32 flex-shrink-0">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-sand-400">R$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        inputMode="decimal"
                        aria-label="Valor da parte"
                        value={row.amount}
                        onChange={e => update(i, { amount: e.target.value })}
                        disabled={disabled}
                        placeholder="0,00"
                        className="w-full pl-9 pr-2 py-2 bg-white border border-sand-200 rounded-xl text-sm text-sand-900 tabular focus:outline-none focus:border-brand-500"
                      />
                    </div>
                    {showReimbursed && (
                      <button
                        type="button"
                        onClick={() => update(i, { reimbursed: !row.reimbursed })}
                        disabled={disabled}
                        title={row.reimbursed ? 'Já reembolsou' : 'Ainda não reembolsou'}
                        aria-pressed={row.reimbursed}
                        className={`flex items-center gap-1 px-2 py-2 rounded-xl text-xs font-semibold border transition flex-shrink-0 ${
                          row.reimbursed ? 'bg-brand-700 border-brand-700 text-white' : 'bg-white border-sand-200 text-sand-500 hover:text-sand-800'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">{row.reimbursed ? 'Pago' : 'Pagou?'}</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onChange(rows.filter((_, idx) => idx !== i))}
                      disabled={disabled}
                      aria-label="Remover pagante"
                      className="p-2 rounded-lg text-sand-400 hover:text-clay-600 hover:bg-clay-50 flex-shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
              <div className="flex flex-wrap gap-2 pt-1">
                {nextFree && (
                  <button
                    type="button"
                    onClick={() => onChange([...rows, { payerId: nextFree, amount: '', reimbursed: false }])}
                    disabled={disabled}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-brand-700 bg-white border border-brand-200 hover:bg-brand-50"
                  >
                    <Plus className="w-3.5 h-3.5" /> Adicionar pagante
                  </button>
                )}
                {rows.length > 0 && total > 0 && (
                  <button
                    type="button"
                    onClick={splitEqually}
                    disabled={disabled}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-sand-600 bg-white border border-sand-200 hover:bg-sand-50"
                  >
                    Dividir igualmente ({rows.length + 1} pessoas)
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
