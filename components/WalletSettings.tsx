import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Loader2, Landmark, CreditCard as CardIcon } from 'lucide-react';
import { Button, Card, Input, Modal } from './UI';
import { useWallet, ACCOUNT_TYPE_LABEL } from '../lib/WalletContext';
import { WalletService } from '../services/walletStorage';
import { Account, AccountType, CreditCard } from '../types';
import { CATEGORY_COLORS, RECEIVERS, formatBRL } from '../lib/categories';

type AccountDraft = Omit<Account, 'id'> & { id?: string };
type CardDraft = Omit<CreditCard, 'id'> & { id?: string };

const selectCls =
  'select-clean w-full pl-3.5 pr-9 py-2.5 rounded-xl border border-sand-200 bg-sand-50/60 text-sm text-sand-900 focus:bg-white focus:border-brand-500 focus:outline-none';

const ColorPicker: React.FC<{ value: string; onChange: (c: string) => void }> = ({ value, onChange }) => (
  <div>
    <span className="block text-xs font-semibold text-sand-600 mb-1.5">Cor</span>
    <div className="flex flex-wrap gap-2">
      {CATEGORY_COLORS.map(color => (
        <button
          key={color}
          type="button"
          onClick={() => onChange(color)}
          aria-label={`Cor ${color}`}
          aria-pressed={value === color}
          className={`w-8 h-8 rounded-full transition ${value === color ? 'ring-2 ring-offset-2 ring-sand-800' : 'hover:scale-110'}`}
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  </div>
);

const OwnerSelect: React.FC<{ value: string | null; onChange: (v: string | null) => void }> = ({ value, onChange }) => (
  <div>
    <label className="block text-xs font-semibold text-sand-600 mb-1.5">De quem é</label>
    <select value={value ?? ''} onChange={e => onChange(e.target.value || null)} className={selectCls}>
      <option value="">Não informado</option>
      {RECEIVERS.map(r => <option key={r} value={r}>{r}</option>)}
    </select>
  </div>
);

export const WalletSettings: React.FC = () => {
  const { accounts, cards, accountById, tableMissing, reload } = useWallet();
  const [accountDraft, setAccountDraft] = useState<AccountDraft | null>(null);
  const [cardDraft, setCardDraft] = useState<CardDraft | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const run = async (fn: () => Promise<void>) => {
    setIsSaving(true);
    try {
      await fn();
      await reload();
      setAccountDraft(null);
      setCardDraft(null);
    } catch (e: any) {
      alert('Erro ao salvar: ' + (e?.message || 'verifique o console.'));
    } finally {
      setIsSaving(false);
    }
  };

  const remove = async (kind: 'account' | 'card', id: string, name: string) => {
    setBusyId(id);
    try {
      const count = await WalletService.countUsage(kind === 'account' ? 'account_id' : 'card_id', id);
      const msg = count > 0
        ? `"${name}" está em ${count} lançamento(s). Eles continuam existindo, mas ficam sem ${kind === 'account' ? 'conta' : 'cartão'}. Excluir mesmo assim?`
        : `Excluir "${name}"?`;
      if (!window.confirm(msg)) return;
      if (kind === 'account') await WalletService.removeAccount(id);
      else await WalletService.removeCard(id);
      await reload();
    } catch (e: any) {
      alert('Erro ao excluir: ' + (e?.message || 'verifique o console.'));
    } finally {
      setBusyId(null);
    }
  };

  const RowActions: React.FC<{ onEdit: () => void; onDelete: () => void; busy: boolean }> = ({ onEdit, onDelete, busy }) =>
    busy ? (
      <Loader2 className="w-4 h-4 animate-spin text-sand-400 mx-3" />
    ) : (
      <div className="flex items-center gap-0.5">
        <button onClick={onEdit} aria-label="Editar" className="p-2 rounded-lg text-sand-400 hover:text-brand-700 hover:bg-brand-50"><Edit2 className="w-4 h-4" /></button>
        <button onClick={onDelete} aria-label="Excluir" className="p-2 rounded-lg text-sand-400 hover:text-clay-600 hover:bg-clay-50"><Trash2 className="w-4 h-4" /></button>
      </div>
    );

  if (tableMissing) {
    return (
      <Card className="text-center py-10">
        <p className="text-sand-700 font-medium">Falta rodar o script de contas e cartões no Supabase</p>
        <p className="text-sm text-sand-400 mt-1">Arquivo supabase_contas_cartoes.sql, no SQL Editor do Supabase.</p>
        <Button variant="secondary" size="sm" className="mt-4" onClick={() => reload()}>Já rodei, verificar</Button>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {/* Contas */}
      <section>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <p className="text-sm text-sand-500 max-w-xl">Contas bancárias e reservas. O saldo é calculado a partir do saldo inicial e dos lançamentos pagos ligados à conta.</p>
          <Button onClick={() => setAccountDraft({ name: '', type: 'checking', owner: null, initialBalance: 0, initialInvested: 0, color: CATEGORY_COLORS[0] })} className="w-full sm:w-auto flex-shrink-0">
            <Plus className="w-4 h-4" /> Nova conta
          </Button>
        </div>
        <Card className="p-0 overflow-hidden">
          {accounts.length === 0 ? (
            <p className="py-10 text-center text-sm text-sand-400">Nenhuma conta cadastrada.</p>
          ) : (
            <ul className="divide-y divide-sand-100">
              {accounts.map(a => (
                <li key={a.id} className="flex items-center gap-4 px-5 py-3.5">
                  <div className="grid place-items-center w-10 h-10 rounded-xl flex-shrink-0" style={{ backgroundColor: `${a.color}1a`, color: a.color }}>
                    <Landmark className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sand-900 text-sm truncate">{a.name}</p>
                    <p className="text-xs text-sand-400">{ACCOUNT_TYPE_LABEL[a.type]}{a.owner ? ` · ${a.owner}` : ''} · inicial {formatBRL(a.initialBalance)}{a.initialInvested ? ` + ${formatBRL(a.initialInvested)} investido` : ''}</p>
                  </div>
                  <RowActions busy={busyId === a.id} onEdit={() => setAccountDraft({ ...a })} onDelete={() => remove('account', a.id, a.name)} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      {/* Cartões */}
      <section>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <p className="text-sm text-sand-500 max-w-xl">Cartões de crédito, com limite e os dias de fechamento e vencimento da fatura.</p>
          <Button onClick={() => setCardDraft({ name: '', owner: null, color: CATEGORY_COLORS[3], creditLimit: 0, closingDay: 1, dueDay: 10, accountId: null })} className="w-full sm:w-auto flex-shrink-0">
            <Plus className="w-4 h-4" /> Novo cartão
          </Button>
        </div>
        <Card className="p-0 overflow-hidden">
          {cards.length === 0 ? (
            <p className="py-10 text-center text-sm text-sand-400">Nenhum cartão cadastrado.</p>
          ) : (
            <ul className="divide-y divide-sand-100">
              {cards.map(c => (
                <li key={c.id} className="flex items-center gap-4 px-5 py-3.5">
                  <div className="grid place-items-center w-10 h-10 rounded-xl flex-shrink-0" style={{ backgroundColor: `${c.color}1a`, color: c.color }}>
                    <CardIcon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sand-900 text-sm truncate">{c.name}</p>
                    <p className="text-xs text-sand-400">
                      {c.owner ? `${c.owner} · ` : ''}limite {formatBRL(c.creditLimit)} · fecha dia {c.closingDay} · vence dia {c.dueDay}
                      {c.accountId && accountById.get(c.accountId) ? ` · paga pela ${accountById.get(c.accountId)!.name}` : ''}
                    </p>
                  </div>
                  <RowActions busy={busyId === c.id} onEdit={() => setCardDraft({ ...c })} onDelete={() => remove('card', c.id, c.name)} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      <Modal isOpen={!!accountDraft} onClose={() => !isSaving && setAccountDraft(null)} title={accountDraft?.id ? 'Editar conta' : 'Nova conta'}>
        {accountDraft && (
          <form onSubmit={e => { e.preventDefault(); if (accountDraft.name.trim()) run(() => WalletService.saveAccount({ ...accountDraft, name: accountDraft.name.trim() })); }} className="space-y-4">
            <Input label="Nome" value={accountDraft.name} onChange={e => setAccountDraft({ ...accountDraft, name: e.target.value })} placeholder="Ex: Itaú, Nubank, Carteira" required maxLength={40} autoFocus disabled={isSaving} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-sand-600 mb-1.5">Tipo</label>
                <select value={accountDraft.type} onChange={e => setAccountDraft({ ...accountDraft, type: e.target.value as AccountType })} className={selectCls}>
                  {Object.entries(ACCOUNT_TYPE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <OwnerSelect value={accountDraft.owner} onChange={owner => setAccountDraft({ ...accountDraft, owner })} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Saldo inicial (R$)" type="number" step="0.01" value={String(accountDraft.initialBalance)} onChange={e => setAccountDraft({ ...accountDraft, initialBalance: parseFloat(e.target.value) || 0 })} disabled={isSaving} />
              <Input label="Reserva / investido inicial (R$)" type="number" step="0.01" value={String(accountDraft.initialInvested)} onChange={e => setAccountDraft({ ...accountDraft, initialInvested: parseFloat(e.target.value) || 0 })} disabled={isSaving} />
            </div>
            <ColorPicker value={accountDraft.color} onChange={color => setAccountDraft({ ...accountDraft, color })} />
            <div className="pt-2 flex flex-col-reverse sm:flex-row justify-end gap-3">
              <Button type="button" variant="ghost" onClick={() => setAccountDraft(null)} disabled={isSaving} className="w-full sm:w-auto">Cancelar</Button>
              <Button type="submit" disabled={isSaving || !accountDraft.name.trim()} className="w-full sm:w-auto">{isSaving ? 'Salvando...' : 'Salvar'}</Button>
            </div>
          </form>
        )}
      </Modal>

      <Modal isOpen={!!cardDraft} onClose={() => !isSaving && setCardDraft(null)} title={cardDraft?.id ? 'Editar cartão' : 'Novo cartão'}>
        {cardDraft && (
          <form onSubmit={e => { e.preventDefault(); if (cardDraft.name.trim()) run(() => WalletService.saveCard({ ...cardDraft, name: cardDraft.name.trim() })); }} className="space-y-4">
            <Input label="Nome" value={cardDraft.name} onChange={e => setCardDraft({ ...cardDraft, name: e.target.value })} placeholder="Ex: Nubank, Itaú Platinum" required maxLength={40} autoFocus disabled={isSaving} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <OwnerSelect value={cardDraft.owner} onChange={owner => setCardDraft({ ...cardDraft, owner })} />
              <Input label="Limite (R$)" type="number" step="0.01" min="0" value={String(cardDraft.creditLimit)} onChange={e => setCardDraft({ ...cardDraft, creditLimit: parseFloat(e.target.value) || 0 })} disabled={isSaving} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Dia de fechamento" type="number" min="1" max="31" value={String(cardDraft.closingDay)} onChange={e => setCardDraft({ ...cardDraft, closingDay: parseInt(e.target.value) || 1 })} disabled={isSaving} />
              <Input label="Dia de vencimento" type="number" min="1" max="31" value={String(cardDraft.dueDay)} onChange={e => setCardDraft({ ...cardDraft, dueDay: parseInt(e.target.value) || 1 })} disabled={isSaving} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-sand-600 mb-1.5">Conta que paga a fatura</label>
              <select value={cardDraft.accountId ?? ''} onChange={e => setCardDraft({ ...cardDraft, accountId: e.target.value || null })} className={selectCls}>
                <option value="">Nenhuma</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <ColorPicker value={cardDraft.color} onChange={color => setCardDraft({ ...cardDraft, color })} />
            <div className="pt-2 flex flex-col-reverse sm:flex-row justify-end gap-3">
              <Button type="button" variant="ghost" onClick={() => setCardDraft(null)} disabled={isSaving} className="w-full sm:w-auto">Cancelar</Button>
              <Button type="submit" disabled={isSaving || !cardDraft.name.trim()} className="w-full sm:w-auto">{isSaving ? 'Salvando...' : 'Salvar'}</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
