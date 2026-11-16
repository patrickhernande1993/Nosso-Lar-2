import React, { useState } from 'react';
import { Plus, Edit2, Trash2, ChevronUp, ChevronDown, Loader2, Database, Copy, Check, RefreshCw, Tags, Users, FolderPlus } from 'lucide-react';
import { Button, Card, Input, Modal, PageHeader } from './UI';
import { useCategories } from '../lib/CategoriesContext';
import { usePayers, initials } from '../lib/PayersContext';
import { CategoryService } from '../services/categoryStorage';
import { PayerService } from '../services/payerStorage';
import { Category, CATEGORY_COLORS, CATEGORY_ICONS, getCategoryIcon, makeCategoryKey } from '../lib/categories';
import { Payer } from '../types';
import categoriesSql from '../supabase_categories.sql?raw';
import payersSql from '../supabase_pagantes.sql?raw';
import subcategoriesSql from '../supabase_subcategorias.sql?raw';

type Draft = { id?: string; name: string; description: string; icon: string; color: string; isGroup: boolean; parentKey: string };

const emptyDraft = (): Draft => ({ name: '', description: '', icon: 'Wallet', color: CATEGORY_COLORS[0], isGroup: false, parentKey: '' });

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
  const { categories, tree, tableMissing, groupsMissing, reload } = useCategories();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const groups = categories.filter(c => c.is_group);
  const siblingsOf = (parentKey: string | null | undefined) =>
    parentKey ? tree.find(n => n.category.key === parentKey)?.children ?? [] : tree.map(n => n.category);
  const nextOrder = (parentKey: string | null | undefined) => Math.max(0, ...siblingsOf(parentKey).map(c => c.sort_order)) + 1;

  const openNew = (isGroup: boolean) => setDraft({ ...emptyDraft(), isGroup, icon: isGroup ? 'Home' : 'Wallet' });
  const openEdit = (c: Category) =>
    setDraft({ id: c.id, name: c.name, description: c.description, icon: c.icon, color: c.color, isGroup: !!c.is_group, parentKey: c.parent_key ?? '' });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft || !draft.name.trim()) return;
    setIsSaving(true);
    try {
      const data = { name: draft.name.trim(), description: draft.description.trim(), icon: draft.icon, color: draft.color };
      const parentKey = !draft.isGroup && draft.parentKey ? draft.parentKey : null;
      if (draft.id) {
        const current = categories.find(c => c.id === draft.id);
        const parentChanged = !groupsMissing && !draft.isGroup && (current?.parent_key ?? null) !== parentKey;
        await CategoryService.update(draft.id, {
          ...data,
          ...(parentChanged ? { parent_key: parentKey, sort_order: nextOrder(parentKey) } : {}),
        });
      } else {
        const key = makeCategoryKey(data.name, categories.map(c => c.key));
        await CategoryService.create({
          ...data,
          key,
          sort_order: nextOrder(parentKey),
          ...(groupsMissing ? {} : { is_group: draft.isGroup, parent_key: parentKey }),
        });
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
      if (c.is_group) {
        const children = siblingsOf(c.key);
        if (children.length > 0) {
          alert(`O grupo "${c.name}" tem ${children.length} subcategoria(s).\n\nMova-as para fora do grupo ou exclua-as antes de remover o grupo.`);
          return;
        }
      } else {
        const count = await CategoryService.countExpenses(c.key);
        if (count > 0) {
          alert(`A categoria "${c.name}" tem ${count} lançamento(s).\n\nExclua os lançamentos dela antes de remover a categoria.`);
          return;
        }
      }
      if (!window.confirm(`Excluir ${c.is_group ? 'o grupo' : 'a categoria'} "${c.name}"? Ele(a) sairá do menu.`)) return;
      await CategoryService.remove(c.id!);
      await reload();
    } catch (error: any) {
      alert('Erro ao excluir: ' + (error?.message || 'verifique o console.'));
    } finally {
      setBusyId(null);
    }
  };

  /** Move dentro do mesmo nível (topo do menu ou dentro do mesmo grupo). */
  const move = async (c: Category, delta: number) => {
    const siblings = [...siblingsOf(c.parent_key && categories.some(g => g.key === c.parent_key) ? c.parent_key : null)];
    const index = siblings.findIndex(s => s.key === c.key);
    const target = index + delta;
    if (index < 0 || target < 0 || target >= siblings.length) return;
    [siblings[index], siblings[target]] = [siblings[target], siblings[index]];
    setBusyId(c.id!);
    try {
      await CategoryService.updateOrder(siblings);
      await reload();
    } catch (error: any) {
      alert('Erro ao reordenar: ' + (error?.message || 'verifique o console.'));
    } finally {
      setBusyId(null);
    }
  };

  const PreviewIcon = draft ? getCategoryIcon(draft.icon) : null;

  const Row: React.FC<{ c: Category; index: number; count: number; nested?: boolean; childCount?: number }> = ({ c, index, count, nested, childCount }) => {
    const Icon = getCategoryIcon(c.icon);
    const busy = busyId === c.id;
    return (
      <li className={`flex items-center gap-4 py-3.5 pr-5 ${nested ? 'pl-12 bg-sand-50/50' : 'pl-5'}`}>
        {nested && <span className="-ml-6 w-4 h-px bg-sand-300 flex-shrink-0" aria-hidden />}
        <div
          className={`grid place-items-center ${nested ? 'w-9 h-9' : 'w-11 h-11'} rounded-xl flex-shrink-0`}
          style={{ backgroundColor: `${c.color}1a`, color: c.color }}
        >
          <Icon className={nested ? 'w-4 h-4' : 'w-5 h-5'} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sand-900 text-sm flex items-center gap-2">
            {c.name}
            {c.is_group && (
              <span className="text-[10px] font-semibold uppercase tracking-wider text-brand-700 bg-brand-50 rounded-full px-2 py-0.5">
                Grupo · {childCount ?? 0}
              </span>
            )}
          </p>
          <p className="text-xs text-sand-400 truncate">{c.description || 'Sem descrição'}</p>
        </div>
        {!tableMissing && (
          <div className="flex items-center gap-0.5">
            {busy ? (
              <Loader2 className="w-4 h-4 animate-spin text-sand-400 mx-3" />
            ) : (
              <>
                <button onClick={() => move(c, -1)} disabled={index === 0} aria-label="Mover para cima" className="p-2 rounded-lg text-sand-400 hover:text-sand-800 hover:bg-sand-100 disabled:opacity-30 disabled:hover:bg-transparent">
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button onClick={() => move(c, 1)} disabled={index === count - 1} aria-label="Mover para baixo" className="p-2 rounded-lg text-sand-400 hover:text-sand-800 hover:bg-sand-100 disabled:opacity-30 disabled:hover:bg-transparent">
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
  };

  return (
    <div>
      {tableMissing && <SetupBanner sql={categoriesSql} what="as categorias" onReload={reload} />}
      {!tableMissing && groupsMissing && <SetupBanner sql={subcategoriesSql} what="as subcategorias" onReload={reload} />}
      <TabToolbar
        text="Categorias recebem lançamentos e viram itens do menu. Grupos (ex.: Moradia) juntam várias categorias e mostram o total de todas elas."
        action={
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto flex-shrink-0">
            {!groupsMissing && (
              <Button variant="secondary" onClick={() => openNew(true)} disabled={tableMissing} className="w-full sm:w-auto">
                <FolderPlus className="w-4 h-4" /> Novo grupo
              </Button>
            )}
            <Button onClick={() => openNew(false)} disabled={tableMissing} className="w-full sm:w-auto">
              <Plus className="w-4 h-4" /> Nova categoria
            </Button>
          </div>
        }
      />

      <Card className="p-0 overflow-hidden">
        <ul className="divide-y divide-sand-100">
          {tree.map(({ category, children }, i) => (
            <React.Fragment key={category.key}>
              <Row c={category} index={i} count={tree.length} childCount={children.length} />
              {children.map((child, j) => (
                <Row key={child.key} c={child} index={j} count={children.length} nested />
              ))}
            </React.Fragment>
          ))}
        </ul>
      </Card>

      <Modal
        isOpen={!!draft}
        onClose={() => !isSaving && setDraft(null)}
        title={draft?.id ? (draft.isGroup ? 'Editar grupo' : 'Editar categoria') : draft?.isGroup ? 'Novo grupo' : 'Nova categoria'}
      >
        {draft && PreviewIcon && (
          <form onSubmit={handleSave} className="space-y-5">
            <div className="flex items-center gap-3 rounded-2xl bg-sand-50 border border-sand-200 p-3">
              <div className="grid place-items-center w-11 h-11 rounded-xl" style={{ backgroundColor: `${draft.color}1a`, color: draft.color }}>
                <PreviewIcon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sand-900 text-sm truncate">{draft.name || (draft.isGroup ? 'Nome do grupo' : 'Nome da categoria')}</p>
                <p className="text-xs text-sand-400 truncate">
                  {draft.isGroup
                    ? 'Grupo: junta outras categorias'
                    : draft.parentKey
                      ? `Dentro de ${groups.find(g => g.key === draft.parentKey)?.name ?? ''}`
                      : draft.description || 'Assim ela aparece no menu'}
                </p>
              </div>
            </div>

            <Input
              label="Nome"
              value={draft.name}
              onChange={e => setDraft({ ...draft, name: e.target.value })}
              placeholder={draft.isGroup ? 'Ex: Moradia, Carro, Lazer' : 'Ex: Internet, Água, Reforma'}
              required
              maxLength={40}
              autoFocus
              disabled={isSaving}
            />

            {!draft.isGroup && !groupsMissing && (
              <div>
                <label className="block text-xs font-semibold text-sand-600 mb-1.5">Dentro de</label>
                <select
                  value={draft.parentKey}
                  onChange={e => setDraft({ ...draft, parentKey: e.target.value })}
                  disabled={isSaving}
                  className="select-clean w-full pl-3.5 pr-9 py-2.5 rounded-xl border border-sand-200 bg-sand-50/60 text-sm text-sand-900 focus:bg-white focus:border-brand-500 focus:outline-none"
                >
                  <option value="">Nenhum grupo (aparece solta no menu)</option>
                  {groups.map(g => <option key={g.key} value={g.key}>{g.name}</option>)}
                </select>
                {groups.length === 0 && <p className="text-xs text-sand-400 mt-1">Crie um grupo primeiro para poder colocar categorias dentro dele.</p>}
              </div>
            )}

            <Input
              label="Descrição (opcional)"
              value={draft.description}
              onChange={e => setDraft({ ...draft, description: e.target.value })}
              placeholder={draft.isGroup ? 'Ex: Tudo do apartamento' : 'Ex: Plano de internet do apartamento'}
              maxLength={90}
              disabled={isSaving}
            />

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
                {isSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</> : draft.id ? 'Salvar alterações' : draft.isGroup ? 'Criar grupo' : 'Criar categoria'}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
