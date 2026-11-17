import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button, Modal } from './UI';
import { useCategories } from '../lib/CategoriesContext';
import { categoryPath } from '../lib/categories';

const selectCls =
  'select-clean w-full pl-3.5 pr-9 py-2.5 rounded-xl border border-sand-200 bg-sand-50/60 text-sm text-sand-900 focus:bg-white focus:border-brand-500 focus:outline-none';

/** Botão "Novo lançamento" da visão geral: escolhe Despesa ou Receita e a categoria, e abre o formulário completo dela. */
export const NewEntryLauncher: React.FC = () => {
  const { expenseTree, incomeTree } = useCategories();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
  const [cat, setCat] = useState('');

  const tree = kind === 'INCOME' ? incomeTree : expenseTree;
  const leaves = tree.flatMap(({ category, children }) => (category.is_group ? children : [category]));

  const start = () => {
    setKind('EXPENSE');
    setCat('');
    setOpen(true);
  };
  const changeKind = (k: 'EXPENSE' | 'INCOME') => {
    setKind(k);
    setCat('');
  };

  const go = (e: React.FormEvent) => {
    e.preventDefault();
    const key = cat || leaves[0]?.key;
    if (!key) return;
    setOpen(false);
    navigate(`${categoryPath(key)}?novo=1`);
  };

  return (
    <>
      <Button onClick={start} className="w-full sm:w-auto whitespace-nowrap">
        <Plus className="w-4 h-4" /> Novo lançamento
      </Button>
      <Modal isOpen={open} onClose={() => setOpen(false)} title="Novo lançamento">
        <form onSubmit={go} className="space-y-4">
          <div className="grid grid-cols-2 gap-1 p-1 bg-sand-100 rounded-xl" role="radiogroup" aria-label="Tipo">
            {([['EXPENSE', 'Despesa (a pagar)', 'text-clay-700'], ['INCOME', 'Receita (a receber)', 'text-brand-700']] as const).map(([v, l, cls]) => (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={kind === v}
                onClick={() => changeKind(v)}
                className={`py-2 rounded-lg text-sm font-semibold transition-all ${kind === v ? `bg-white shadow-sm ${cls}` : 'text-sand-500 hover:text-sand-800'}`}
              >
                {l}
              </button>
            ))}
          </div>

          {leaves.length === 0 ? (
            <p className="text-sm text-sand-500">
              Ainda não há categorias de {kind === 'INCOME' ? 'recebimento' : 'despesa'}. Crie uma em Configurações → Categorias.
            </p>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-sand-600 mb-1.5">Categoria</label>
              <select value={cat || leaves[0].key} onChange={e => setCat(e.target.value)} className={selectCls} autoFocus>
                {tree.map(({ category: c, children }) =>
                  c.is_group ? (
                    <optgroup key={c.key} label={c.name}>
                      {children.map(ch => <option key={ch.key} value={ch.key}>{ch.name}</option>)}
                    </optgroup>
                  ) : (
                    <option key={c.key} value={c.key}>{c.name}</option>
                  )
                )}
              </select>
              <p className="text-xs text-sand-400 mt-1.5">Em seguida abre o formulário completo, com parcelamento, conta/cartão e divisão.</p>
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="w-full sm:w-auto">Cancelar</Button>
            <Button type="submit" disabled={leaves.length === 0} className="w-full sm:w-auto">Continuar</Button>
          </div>
        </form>
      </Modal>
    </>
  );
};
