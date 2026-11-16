import React, { useState } from 'react';
import { Plus, Edit2, Trash2, ChevronUp, ChevronDown, Loader2, Database, Copy, Check, RefreshCw, Tags, Users } from 'lucide-react';
import { Button, Card, Input, Modal, PageHeader } from './UI';
import { useCategories } from '../lib/CategoriesContext';
import { usePayers, initials } from '../lib/PayersContext';
import { CategoryService } from '../services/categoryStorage';
import { PayerService } from '../services/payerStorage';
import { Category, CATEGORY_COLORS, CATEGORY_ICONS, getCategoryIcon, makeCategoryKey } from '../lib/categories';
import { Payer } from '../types';
import categoriesSql from '../supabase_categories.sql?raw';
import payersSql from '../supabase_pagantes.sql?raw';

type Draft = { id?: string; name: string; description: string; icon: string; color: string };

const emptyDraft = (): Draft => ({ name: '', description: '', icon: 'Wallet', color: CATEGORY_COLORS[0] });

const SetupBanner: React.FC<{ sql: string; what: string; onReload: () => void }> = ({ sql, what, onReload }) => {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(sql);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      alert('Não foi possível copiar. Abra o arquivo .sql na pasta do projeto.');
    }
  };
  return (
    <div className="mb-6 rounded-2xl border border-clay-200 bg-clay-50 p-5">
      <div className="flex items-start gap-3">
        <Database className="w-5 h-5 text-clay-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="font-semibold text-clay-700">Falta um passo no Supabase para liberar {what}</p>
          <p className="text-sm text-clay-700/80 mt-1">
            Abra o painel do Supabase, vá em <b>SQL Editor</b>, cole o script e clique em <b>Run</b>. Nenhuma despesa existente é alterada.
          </p>
          <div className="flex flex-wrap gap-2 mt-4">
            <Button variant="secondary" size="sm" onClick={copy}>
              {copied ? <><Check className="w-3.5 h-3.5" /> Copiado</> : <><Copy className="w-3.5 h-3.5" /> Copiar script SQL</>}
            </Button>
            <Button variant="ghost" size="sm" onClick={onReload}>
              <RefreshCw className="w-3.5 h-3.5" /> Já rodei, verificar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

const TabToolbar: React.FC<{ text: string; action: React.ReactNode }> = ({ text, action }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
    <p className="text-sm text-sand-500 max-w-xl">{text}</p>
    {action}
  </div>
);

type Tab = 'categorias' | 'pagantes';

export const SettingsModule: React.FC = () => {
  const [tab, setTab] = useState<Tab>('categorias');
  return (
    <div>
      <PageHeader eyebrow="Geral" title="Configurações" />
      <div className="inline-grid grid-cols-2 gap-1 p-1 bg-sand-200/60 rounded-xl mb-6" role="tablist">
        {([['categorias', 'Categorias', Tags], ['pagantes', 'Pagantes', Users]] as const).map(([value, label, Icon]) => (
          <button
            key={value}
            role="tab"
            aria-selected={tab === value}
            onClick={() => setTab(value)}
            className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${
              tab === value ? 'bg-white shadow-sm text-sand-900' : 'text-sand-500 hover:text-sand-800'
            }`}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>
      {tab === 'categorias' ? <CategoriesSettings /> : <PayersSettings />}
    </div>
  );
};

const PayersSettings: React.FC = () => {
  const { payers, tableMissing, reload } = usePayers();
  const [draft, setDraft] = useState<{ id?: string; name: string; color: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft || !draft.name.trim()) return;
    setIsSaving(true);
    try {
      const data = { name: draft.name.trim(), color: draft.color };
      if (draft.id) await PayerService.update(draft.id, data);
      else await PayerService.create(data);
      await reload();
      setDraft(null);
    } catch (error: any) {
      alert('Erro ao salvar pagante: ' + (error?.message || 'verifique o console.'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (p: Payer) => {
    setBusyId(p.id);
    try {
      const count = await PayerService.countShares(p.id);
      if (count > 0) {
        alert(`"${p.name}" está vinculado a ${count} despesa(s).\n\nRemova a divisão dessas despesas antes de excluir o pagante.`);
        return;
      }
      if (!window.confirm(`Excluir o pagante "${p.name}"?`)) return;
      await PayerService.remove(p.id);
      await reload();
    } catch (error: any) {
      alert('Erro ao excluir pagante: ' + (error?.message || 'verifique o console.'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      {tableMissing && <SetupBanner sql={payersSql} what="os pagantes" onReload={reload} />}
      <TabToolbar
        text="Pessoas que dividem despesas com vocês. Ao lançar uma despesa, você indica quanto cada uma vai pagar e acompanha o reembolso."
        action={
          <Button onClick={() => setDraft({ name: '', color: CATEGORY_COLORS[3] })} disabled={tableMissing} className="w-full sm:w-auto flex-shrink-0">
            <Plus className="w-4 h-4" /> Novo pagante
          </Button>
        }
      />
      <Card className="p-0 overflow-hidden">
        {payers.length === 0 ? (
          <div className="py-14 text-center">
            <Users className="w-10 h-10 text-sand-300 mx-auto mb-3" />
            <p className="text-sand-600 font-medium">Nenhum pagante cadastrado</p>
            <p className="text-sm text-sand-400 mt-1">Cadastre quem divide despesas com vocês.</p>
          </div>
        ) : (
          <ul className="divide-y divide-sand-100">
            {payers.map(p => (
              <li key={p.id} className="flex items-center gap-4 px-5 py-4">
                <div className="grid place-items-center w-11 h-11 rounded-full text-sm font-bold text-white flex-shrink-0" style={{ backgroundColor: p.color }}>
                  {initials(p.name)}
                </div>
                <p className="flex-1 min-w-0 font-semibold text-sand-900 text-sm truncate">{p.name}</p>
                {busyId === p.id ? (
                  <Loader2 className="w-4 h-4 animate-spin text-sand-400 mx-3" />
                ) : (
                  <div className="flex items-center gap-0.5">
                    <button onClick={() => setDraft({ id: p.id, name: p.name, color: p.color })} aria-label="Editar" className="p-2 rounded-lg text-sand-400 hover:text-brand-700 hover:bg-brand-50">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(p)} aria-label="Excluir" className="p-2 rounded-lg text-sand-400 hover:text-clay-600 hover:bg-clay-50">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal isOpen={!!draft} onClose={() => !isSaving && setDraft(null)} title={draft?.id ? 'Editar pagante' : 'Novo pagante'}>
        {draft && (
          <form onSubmit={handleSave} className="space-y-5">
            <div className="flex items-center gap-3 rounded-2xl bg-sand-50 border border-sand-200 p-3">
              <div className="grid place-items-center w-11 h-11 rounded-full text-sm font-bold text-white" style={{ backgroundColor: draft.color }}>
                {initials(draft.name) || '?'}
              </div>
              <p className="font-semibold text-sand-900 text-sm truncate">{draft.name || 'Nome do pagante'}</p>
            </div>
            <Input label="Nome" value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} placeholder="Ex: Maria, Mãe, Irmão" required maxLength={40} autoFocus disabled={isSaving} />
            <div>
              <span className="block text-xs font-semibold text-sand-600 mb-1.5">Cor</span>
              <div className="flex flex-wrap gap-2">
                {CATEGORY_COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setDraft({ ...draft, color })}
                    aria-label={`Cor ${color}`}
                    aria-pressed={draft.color === color}
                    className={`w-8 h-8 rounded-full transition ${draft.color === color ? 'ring-2 ring-offset-2 ring-sand-800' : 'hover:scale-110'}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
            <div className="pt-2 flex flex-col-reverse sm:flex-row justify-end gap-3">
              <Button type="button" variant="ghost" onClick={() => setDraft(null)} disabled={isSaving} className="w-full sm:w-auto">Cancelar</Button>
              <Button type="submit" disabled={isSaving || !draft.name.trim()} className="w-full sm:w-auto">
                {isSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</> : draft.id ? 'Salvar alterações' : 'Cadastrar pagante'}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

const CategoriesSettings: React.FC = () => {
  const { categories, tableMissing, reload } = useCategories();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const openNew = () => setDraft(emptyDraft());
  const openEdit = (c: Category) => setDraft({ id: c.id, name: c.name, description: c.description, icon: c.icon, color: c.color });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft || !draft.name.trim()) return;
    setIsSaving(true);
    try {
      const data = { name: draft.name.trim(), description: draft.description.trim(), icon: draft.icon, color: draft.color };
      if (draft.id) {
        await CategoryService.update(draft.id, data);
      } else {
        const key = makeCategoryKey(data.name, categories.map(c => c.key));
        const sort_order = Math.max(0, ...categories.map(c => c.sort_order)) + 1;
        await CategoryService.create({ ...data, key, sort_order });
      }
      await reload();
      setDraft(null);
    } catch (error: any) {
      alert('Erro ao salvar categoria: ' + (error?.message || 'verifique o console.'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (c: Category) => {
    setBusyId(c.id!);
    try {
      const count = await CategoryService.countExpenses(c.key);
      if (count > 0) {
        alert(`A categoria "${c.name}" tem ${count} lançamento(s).\n\nExclua os lançamentos dela antes de remover a categoria.`);
        return;
      }
      if (!window.confirm(`Excluir a categoria "${c.name}"? Ela sairá do menu.`)) return;
      await CategoryService.remove(c.id!);
      await reload();
    } catch (error: any) {
      alert('Erro ao excluir categoria: ' + (error?.message || 'verifique o console.'));
    } finally {
      setBusyId(null);
    }
  };

  const move = async (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= categories.length) return;
    const reordered = [...categories];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setBusyId(categories[index].id!);
    try {
      await CategoryService.updateOrder(reordered);
      await reload();
    } catch (error: any) {
      alert('Erro ao reordenar: ' + (error?.message || 'verifique o console.'));
    } finally {
      setBusyId(null);
    }
  };

  const PreviewIcon = draft ? getCategoryIcon(draft.icon) : null;

  return (
    <div>
      {tableMissing && <SetupBanner sql={categoriesSql} what="as categorias" onReload={reload} />}
      <TabToolbar
        text="Cada categoria vira um item do menu, com sua própria lista de lançamentos. A visão geral soma todas elas."
        action={
          <Button onClick={openNew} disabled={tableMissing} className="w-full sm:w-auto flex-shrink-0">
            <Plus className="w-4 h-4" /> Nova categoria
          </Button>
        }
      />

      <Card className="p-0 overflow-hidden">
        <ul className="divide-y divide-sand-100">
          {categories.map((c, i) => {
            const Icon = getCategoryIcon(c.icon);
            const busy = busyId === c.id;
            return (
              <li key={c.key} className="flex items-center gap-4 px-5 py-4">
                <div className="grid place-items-center w-11 h-11 rounded-xl flex-shrink-0" style={{ backgroundColor: `${c.color}1a`, color: c.color }}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sand-900 text-sm">{c.name}</p>
                  <p className="text-xs text-sand-400 truncate">{c.description || 'Sem descrição'}</p>
                </div>
                {!tableMissing && (
                  <div className="flex items-center gap-0.5">
                    {busy ? (
                      <Loader2 className="w-4 h-4 animate-spin text-sand-400 mx-3" />
                    ) : (
                      <>
                        <button onClick={() => move(i, -1)} disabled={i === 0} aria-label="Mover para cima" className="p-2 rounded-lg text-sand-400 hover:text-sand-800 hover:bg-sand-100 disabled:opacity-30 disabled:hover:bg-transparent">
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button onClick={() => move(i, 1)} disabled={i === categories.length - 1} aria-label="Mover para baixo" className="p-2 rounded-lg text-sand-400 hover:text-sand-800 hover:bg-sand-100 disabled:opacity-30 disabled:hover:bg-transparent">
                          <ChevronDown className="w-4 h-4" />
                        </button>
                        <button onClick={() => openEdit(c)} aria-label="Editar" className="p-2 rounded-lg text-sand-400 hover:text-brand-700 hover:bg-brand-50">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(c)} aria-label="Excluir" className="p-2 rounded-lg text-sand-400 hover:text-clay-600 hover:bg-clay-50">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </Card>

      <Modal isOpen={!!draft} onClose={() => !isSaving && setDraft(null)} title={draft?.id ? 'Editar categoria' : 'Nova categoria'}>
        {draft && PreviewIcon && (
          <form onSubmit={handleSave} className="space-y-5">
            <div className="flex items-center gap-3 rounded-2xl bg-sand-50 border border-sand-200 p-3">
              <div className="grid place-items-center w-11 h-11 rounded-xl" style={{ backgroundColor: `${draft.color}1a`, color: draft.color }}>
                <PreviewIcon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sand-900 text-sm truncate">{draft.name || 'Nome da categoria'}</p>
                <p className="text-xs text-sand-400 truncate">{draft.description || 'Assim ela aparece no menu'}</p>
              </div>
            </div>

            <Input label="Nome" value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} placeholder="Ex: Internet, Água, Reforma" required maxLength={40} autoFocus disabled={isSaving} />
            <Input label="Descrição (opcional)" value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })} placeholder="Ex: Plano de internet do apartamento" maxLength={90} disabled={isSaving} />

            <div>
              <span className="block text-xs font-semibold text-sand-600 mb-1.5">Ícone</span>
              <div className="grid grid-cols-8 gap-1.5">
                {Object.entries(CATEGORY_ICONS).map(([name, Icon]) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setDraft({ ...draft, icon: name })}
                    aria-label={name}
                    aria-pressed={draft.icon === name}
                    className={`aspect-square grid place-items-center rounded-lg border transition ${
                      draft.icon === name ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-sand-200 text-sand-500 hover:bg-sand-50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="block text-xs font-semibold text-sand-600 mb-1.5">Cor</span>
              <div className="flex flex-wrap gap-2">
                {CATEGORY_COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setDraft({ ...draft, color })}
                    aria-label={`Cor ${color}`}
                    aria-pressed={draft.color === color}
                    className={`w-8 h-8 rounded-full transition ${draft.color === color ? 'ring-2 ring-offset-2 ring-sand-800' : 'hover:scale-110'}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <div className="pt-2 flex flex-col-reverse sm:flex-row justify-end gap-3">
              <Button type="button" variant="ghost" onClick={() => setDraft(null)} disabled={isSaving} className="w-full sm:w-auto">Cancelar</Button>
              <Button type="submit" disabled={isSaving || !draft.name.trim()} className="w-full sm:w-auto">
                {isSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</> : draft.id ? 'Salvar alterações' : 'Criar categoria'}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
