import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, Edit2, Search, Loader2, Paperclip, ExternalLink, Eye, Layers, CalendarRange } from 'lucide-react';
import { ExpenseType, ExpenseItem, ExpenseStatus, ExpenseShare } from '../types';
import { StorageService } from '../services/storage';
import { ShareService } from '../services/payerStorage';
import { Button, Input, Modal, Card, PageHeader, StatusBadge } from './UI';
import { SplitEditor, ShareRow, toRows, validateRows } from './SplitEditor';
import { Category, formatBRL as formatCurrency } from '../lib/categories';
import { usePayers, initials } from '../lib/PayersContext';

interface ExpenseModuleProps {
  category: Category;
}

export const ExpenseModule: React.FC<ExpenseModuleProps> = ({ category }) => {
  const { key: type, name: title, description } = category;
  const [items, setItems] = useState<ExpenseItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false); // Modal de Lote
  const [searchQuery, setSearchQuery] = useState('');
  
  // Single Item Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [monthYear, setMonthYear] = useState('');
  const [status, setStatus] = useState<ExpenseStatus>('PENDING');
  const [selectedFile, setSelectedFile] = useState<File | undefined>(undefined);
  const [existingReceiptUrl, setExistingReceiptUrl] = useState<string | undefined>(undefined);

  // Batch Form State
  const [batchDesc, setBatchDesc] = useState('');
  const [batchAmount, setBatchAmount] = useState('');
  const [batchStartMonth, setBatchStartMonth] = useState(''); // MM/YYYY
  const [batchCount, setBatchCount] = useState('12'); // Quantidade de meses
  const [batchDueDay, setBatchDueDay] = useState('10'); // Dia do vencimento padrão

  // Divisão com pagantes (lançamento único e lote)
  const { tableMissing: sharesUnavailable, payerById } = usePayers();
  const [sharesByExpense, setSharesByExpense] = useState<Map<string, ExpenseShare[]>>(new Map());
  const [splitEnabled, setSplitEnabled] = useState(false);
  const [shareRows, setShareRows] = useState<ShareRow[]>([]);
  const [batchSplitEnabled, setBatchSplitEnabled] = useState(false);
  const [batchShareRows, setBatchShareRows] = useState<ShareRow[]>([]);

  // Load data
  const loadItems = async () => {
    setIsLoading(true);
    try {
      const [data, shares] = await Promise.all([StorageService.getByType(type), ShareService.getAll()]);
      const ids = new Set(data.map(i => String(i.id)));
      const map = new Map<string, ExpenseShare[]>();
      shares.filter(s => ids.has(s.expenseId)).forEach(s => map.set(s.expenseId, [...(map.get(s.expenseId) ?? []), s]));
      setSharesByExpense(map);
      setItems(data);
    } catch (error) {
      console.error("Failed to load items", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, [type]);

  const handleOpenModal = (item?: ExpenseItem) => {
    setSelectedFile(undefined); // Reset file input
    if (item) {
      setEditingId(item.id);
      setDesc(item.description);
      setAmount(item.amount.toString());
      setDate(item.date);
      setMonthYear(item.monthYear || '');
      setStatus(item.status);
      setExistingReceiptUrl(item.receiptUrl);
      const existing = sharesByExpense.get(String(item.id)) ?? [];
      setSplitEnabled(existing.length > 0);
      setShareRows(toRows(existing));
    } else {
      setSplitEnabled(false);
      setShareRows([]);
      setEditingId(null);
      setDesc('');
      setAmount('');
      setDate(new Date().toISOString().split('T')[0]);
      setStatus('PENDING');
      setExistingReceiptUrl(undefined);
      
      // Auto-fill month/year if needed
      const now = new Date();
      const m = (now.getMonth() + 1).toString().padStart(2, '0');
      const y = now.getFullYear();
      setMonthYear(`${m}/${y}`);
    }
    setIsModalOpen(true);
  };

  const handleOpenBatchModal = () => {
    let defaultDesc = '';
    if (type === ExpenseType.FEE) defaultDesc = 'Taxa de Condomínio';
    else if (type === ExpenseType.INSTALLMENT) defaultDesc = 'Parcela';
    
    setBatchDesc(defaultDesc);
    setBatchAmount('');
    
    const now = new Date();
    const m = (now.getMonth() + 1).toString().padStart(2, '0');
    const y = now.getFullYear();
    setBatchStartMonth(`${m}/${y}`);
    
    setBatchCount('12');
    setBatchDueDay('10');
    setBatchSplitEnabled(false);
    setBatchShareRows([]);
    setIsBatchModalOpen(true);
  };

  // Salvar Item Único
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      // Naming convention logic
      let finalDescription = desc;
      let finalMonthYear = undefined;

      // Validação: Mês/Ano é obrigatório apenas para Parcelas e Taxas
      if ((type === ExpenseType.INSTALLMENT || type === ExpenseType.FEE) && !monthYear) {
          alert('Mês/Ano é obrigatório para este tipo de despesa.');
          setIsSaving(false);
          return;
      }

      // Se houver Mês/Ano preenchido (seja obrigatório ou opcional), aplica formatação
      if (monthYear) {
          if (!monthYear.match(/^\d{2}\/\d{4}$/)) {
              alert('Formato de Mês/Ano inválido. Use MM/AAAA.');
              setIsSaving(false);
              return;
          }
          if (!desc.startsWith(monthYear)) {
             finalDescription = `${monthYear} - ${desc}`;
          }
          finalMonthYear = monthYear;
      }

      const itemPayload: ExpenseItem = {
        id: editingId || crypto.randomUUID(),
        type,
        description: finalDescription,
        amount: parseFloat(amount),
        date,
        monthYear: finalMonthYear,
        createdAt: Date.now(),
        receiptUrl: existingReceiptUrl,
        status: status
      };

      // Valida a divisão antes de gravar qualquer coisa
      let shares: ReturnType<typeof validateRows> = { shares: [] };
      if (splitEnabled && !sharesUnavailable) {
        shares = validateRows(shareRows, itemPayload.amount);
        if ('error' in shares) {
          alert(shares.error);
          setIsSaving(false);
          return;
        }
      }

      if (editingId) {
        await StorageService.update(itemPayload, selectedFile);
      } else {
        await StorageService.add(itemPayload, selectedFile);
      }

      const hadShares = (sharesByExpense.get(String(itemPayload.id)) ?? []).length > 0;
      if (!sharesUnavailable && 'shares' in shares && (shares.shares.length > 0 || hadShares)) {
        await ShareService.replaceForExpense(String(itemPayload.id), shares.shares);
      }

      await loadItems();
      setIsModalOpen(false);
    } catch (error: any) {
      handleError(error);
    } finally {
      setIsSaving(false);
    }
  };

  // Salvar Lote
  const handleBatchSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
        if (!batchStartMonth.match(/^\d{2}\/\d{4}$/)) {
            alert('Mês inicial inválido. Use MM/AAAA');
            setIsSaving(false);
            return;
        }

        const count = parseInt(batchCount);
        if (count < 2 || count > 60) {
            alert('A quantidade deve ser entre 2 e 60 parcelas.');
            setIsSaving(false);
            return;
        }

        const dueDay = parseInt(batchDueDay);
        if (dueDay < 1 || dueDay > 31) {
            alert('Dia de vencimento inválido.');
            setIsSaving(false);
            return;
        }

        const [startM, startY] = batchStartMonth.split('/').map(Number);
        const itemsToCreate: ExpenseItem[] = [];
        const baseAmount = parseFloat(batchAmount);

        let batchShares: ReturnType<typeof validateRows> = { shares: [] };
        if (batchSplitEnabled && !sharesUnavailable) {
            batchShares = validateRows(batchShareRows, baseAmount);
            if ('error' in batchShares) {
                alert(batchShares.error);
                setIsSaving(false);
                return;
            }
        }

        for (let i = 0; i < count; i++) {
            let currentMonth = startM + i;
            let currentYear = startY;
            
            while (currentMonth > 12) {
                currentMonth -= 12;
                currentYear++;
            }
            
            const monthStr = currentMonth.toString().padStart(2, '0');
            const monthYearStr = `${monthStr}/${currentYear}`;
            const dayStr = batchDueDay.padStart(2, '0');
            const isoDate = `${currentYear}-${monthStr}-${dayStr}`;

            itemsToCreate.push({
                id: crypto.randomUUID(),
                type,
                description: `${monthYearStr} - ${batchDesc}`,
                amount: baseAmount,
                date: isoDate,
                monthYear: monthYearStr,
                createdAt: Date.now(),
                status: 'PENDING'
            });
        }

        await StorageService.addBatch(itemsToCreate);
        if ('shares' in batchShares && batchShares.shares.length > 0) {
            await ShareService.addForExpenses(itemsToCreate.map(i => i.id), batchShares.shares);
        }
        await loadItems();
        setIsBatchModalOpen(false);
        alert(`${count} parcelas geradas com sucesso!`);

    } catch (error: any) {
        handleError(error);
    } finally {
        setIsSaving(false);
    }
  };

  const handleError = (error: any) => {
    console.error(error);
    const isBucketError = error?.message?.includes('Bucket not found');
    const isPolicyError = error?.message?.includes('policy') || error?.message?.includes('permission') || error?.code === '42501';

    if (isBucketError || isPolicyError) {
        const detail = isBucketError ? 'O Bucket "receipts" não foi encontrado.' : 'Permissão de upload negada.';
        alert(`⚠️ ERRO DE CONFIGURAÇÃO NO SUPABASE ⚠️\n\n${detail}\n\nSOLUÇÃO:\n1. Vá ao SQL Editor do Supabase.\n2. Copie e execute o conteúdo do arquivo "supabase_setup.sql" (incluído no projeto).`);
    } else {
        alert('Erro ao salvar: ' + (error?.message || 'Verifique o console.'));
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este item?')) {
      try {
        await StorageService.delete(id);
        setItems(prev => prev.filter(i => i.id !== id));
      } catch (error) {
        alert('Erro ao excluir item.');
      }
    }
  };

  const filteredItems = useMemo(() => {
    return items
        .filter(i => i.description.toLowerCase().includes(searchQuery.toLowerCase()))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [items, searchQuery]);

  const totals = useMemo(() => {
    const paid = items.filter(i => i.status === 'PAID').reduce((a, i) => a + i.amount, 0);
    const total = items.reduce((a, i) => a + i.amount, 0);
    const allShares = Array.from(sharesByExpense.values()).flat();
    const others = allShares.reduce((a, s) => a + s.amount, 0);
    const toReceive = allShares.filter(s => !s.reimbursed).reduce((a, s) => a + s.amount, 0);
    return { total, paid, pending: total - paid, mine: total - others, toReceive, hasShares: allShares.length > 0 };
  }, [items, sharesByExpense]);

  // Avatares dos pagantes e a parte que fica com vocês, abaixo da descrição
  const SplitInfo = ({ item }: { item: ExpenseItem }) => {
    const shares = sharesByExpense.get(String(item.id));
    if (!shares?.length) return null;
    const mine = item.amount - shares.reduce((a, s) => a + s.amount, 0);
    return (
      <div className="flex items-center gap-2 mt-1">
        <div className="flex -space-x-1.5">
          {shares.map(s => {
            const p = payerById.get(s.payerId);
            return (
              <span
                key={s.id}
                title={`${p?.name ?? 'Pagante'}: ${formatCurrency(s.amount)} · ${s.reimbursed ? 'reembolsado' : 'a receber'}`}
                className={`grid place-items-center w-5 h-5 rounded-full text-[9px] font-bold text-white ring-2 ring-white ${s.reimbursed ? '' : 'opacity-60'}`}
                style={{ backgroundColor: p?.color ?? '#b3a68f' }}
              >
                {p ? initials(p.name) : '?'}
              </span>
            );
          })}
        </div>
        <span className="text-xs text-sand-400">Sua parte {formatCurrency(mine)}</span>
      </div>
    );
  };

  const today = new Date().toISOString().slice(0, 10);
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('pt-BR', { timeZone: 'UTC' });

  const ReceiptLink = ({ url, compact }: { url?: string; compact?: boolean }) =>
    url ? (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        title="Ver comprovante"
        className={`inline-flex items-center gap-1.5 rounded-lg text-xs font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 transition ${compact ? 'p-2' : 'px-2.5 py-1.5'}`}
      >
        {compact ? <Paperclip className="w-4 h-4" /> : <><Eye className="w-3.5 h-3.5" /> Ver</>}
      </a>
    ) : compact ? null : (
      <span className="text-sand-300 text-xs">—</span>
    );

  const RowActions = ({ item }: { item: ExpenseItem }) => (
    <div className="flex items-center justify-end gap-1">
      <button onClick={() => handleOpenModal(item)} aria-label="Editar" className="p-2 rounded-lg text-sand-400 hover:text-brand-700 hover:bg-brand-50 transition">
        <Edit2 className="w-4 h-4" />
      </button>
      <button onClick={() => handleDelete(item.id)} aria-label="Excluir" className="p-2 rounded-lg text-sand-400 hover:text-clay-600 hover:bg-clay-50 transition">
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );

  return (
    <div>
      <PageHeader
        eyebrow="Categoria"
        title={title}
        description={description}
        actions={
          <>
            <Button onClick={handleOpenBatchModal} variant="secondary" className="w-full sm:w-auto">
              <Layers className="w-4 h-4" /> Gerar em lote
            </Button>
            <Button onClick={() => handleOpenModal()} className="w-full sm:w-auto">
              <Plus className="w-4 h-4" /> Novo lançamento
            </Button>
          </>
        }
      />

      {/* Resumo */}
      <div className={`grid grid-cols-1 gap-3 mb-6 ${totals.hasShares ? 'sm:grid-cols-2 lg:grid-cols-4' : 'sm:grid-cols-3'}`}>
        {[
          { label: 'Total', value: totals.total, cls: 'text-sand-900', dot: category.color, sub: totals.hasShares ? `Sua parte ${formatCurrency(totals.mine)}` : undefined },
          { label: 'Pago', value: totals.paid, cls: 'text-brand-700', dot: '#3a7d61' },
          { label: 'Em aberto', value: totals.pending, cls: 'text-clay-600', dot: '#d6824f' },
          ...(totals.hasShares ? [{ label: 'A receber', value: totals.toReceive, cls: 'text-[#5279a3]', dot: '#5279a3', sub: 'Reembolsos pendentes' }] : []),
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-sand-200 shadow-soft px-5 py-4">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-sand-400">
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.dot }} /> {s.label}
            </p>
            <p className={`text-xl font-bold mt-1 tabular ${s.cls}`}>{formatCurrency(s.value)}</p>
            {'sub' in s && s.sub && <p className="text-xs text-sand-400 mt-0.5">{s.sub}</p>}
          </div>
        ))}
      </div>

      <Card className="overflow-hidden p-0">
        <div className="px-5 py-3.5 border-b border-sand-100 flex items-center gap-3">
          <Search className="w-4 h-4 text-sand-400" />
          <input
            type="text"
            placeholder="Buscar por descrição..."
            className="bg-transparent text-sm w-full outline-none placeholder-sand-400"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <span className="text-xs text-sand-400 whitespace-nowrap">{filteredItems.length} itens</span>
        </div>

        {isLoading ? (
          <div className="py-16 flex justify-center items-center gap-2 text-sand-500 text-sm">
            <Loader2 className="w-5 h-5 animate-spin text-brand-600" /> Carregando...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sand-600 font-medium">Nenhum lançamento encontrado</p>
            <p className="text-sm text-sand-400 mt-1">Use "Novo lançamento" para adicionar o primeiro.</p>
          </div>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-sand-400 bg-sand-50/70">
                    <th className="px-5 py-3">Descrição</th>
                    <th className="px-5 py-3">Vencimento</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Valor</th>
                    <th className="px-5 py-3 text-center">Comprovante</th>
                    <th className="px-5 py-3 text-right"><span className="sr-only">Ações</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sand-100">
                  {filteredItems.map((item) => {
                    const overdue = item.status === 'PENDING' && item.date < today;
                    return (
                      <tr key={item.id} className="hover:bg-sand-50/60 transition-colors">
                        <td className="px-5 py-3.5 text-sm font-medium text-sand-900">{item.description}<SplitInfo item={item} /></td>
                        <td className={`px-5 py-3.5 text-sm tabular whitespace-nowrap ${overdue ? 'text-clay-600 font-semibold' : 'text-sand-500'}`}>
                          {formatDate(item.date)}{overdue && <span className="ml-1.5 text-[10px] uppercase tracking-wider">vencido</span>}
                        </td>
                        <td className="px-5 py-3.5"><StatusBadge status={item.status} /></td>
                        <td className="px-5 py-3.5 text-sm text-right font-semibold text-sand-900 tabular whitespace-nowrap">{formatCurrency(item.amount)}</td>
                        <td className="px-5 py-3.5 text-center"><ReceiptLink url={item.receiptUrl} /></td>
                        <td className="px-5 py-3.5"><RowActions item={item} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <ul className="md:hidden divide-y divide-sand-100">
              {filteredItems.map((item) => {
                const overdue = item.status === 'PENDING' && item.date < today;
                return (
                  <li key={item.id} className="px-4 py-4">
                    <div className="flex justify-between items-start gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-sand-900 text-sm line-clamp-2">{item.description}</p>
                        <SplitInfo item={item} />
                        <p className={`text-xs mt-1 tabular ${overdue ? 'text-clay-600 font-semibold' : 'text-sand-400'}`}>
                          Vence em {formatDate(item.date)}{overdue && ' · vencido'}
                        </p>
                      </div>
                      <span className="font-bold text-sand-900 tabular whitespace-nowrap">{formatCurrency(item.amount)}</span>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <StatusBadge status={item.status} />
                      <div className="flex items-center gap-1">
                        <ReceiptLink url={item.receiptUrl} compact />
                        <RowActions item={item} />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </Card>

      {/* SINGLE ITEM Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !isSaving && setIsModalOpen(false)}
        title={editingId ? 'Editar Item' : 'Adicionar Novo Item'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          
          {/* Status Selection */}
          <div>
            <span className="block text-xs font-semibold text-sand-600 mb-1.5">Status</span>
            <div className="grid grid-cols-2 gap-1 p-1 bg-sand-100 rounded-xl" role="radiogroup">
              {([['PENDING', 'Em aberto', 'text-clay-700'], ['PAID', 'Pago', 'text-brand-700']] as const).map(([value, label, cls]) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={status === value}
                  onClick={() => setStatus(value)}
                  className={`py-2 rounded-lg text-sm font-semibold transition-all ${
                    status === value ? `bg-white shadow-sm ${cls}` : 'text-sand-500 hover:text-sand-800'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <Input
            label="Mês/Ano Referência (MM/AAAA)"
            value={monthYear}
            onChange={(e) => setMonthYear(e.target.value)}
            placeholder="Ex: 01/2024"
            pattern="\d{2}/\d{4}"
            required={type === ExpenseType.INSTALLMENT || type === ExpenseType.FEE}
            className="font-mono"
            disabled={isSaving}
          />

          <Input
            label="Descrição"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder={type === ExpenseType.NOTE ? "Ex: Conserto do portão" : "Ex: Limpeza, Manutenção"}
            required
            disabled={isSaving}
          />
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
                label="Valor (R$)"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                disabled={isSaving}
            />
            <Input
                label="Data de Vencimento"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                disabled={isSaving}
            />
          </div>

          <SplitEditor
            enabled={splitEnabled}
            onToggle={setSplitEnabled}
            rows={shareRows}
            onChange={setShareRows}
            total={parseFloat(amount) || 0}
            disabled={isSaving}
          />

          <div className="bg-sand-50 p-4 rounded-lg border border-sand-100">
             <label className="block text-sm font-medium text-sand-700 mb-2">
                Comprovante (Imagem/PDF)
             </label>
             
             {existingReceiptUrl && (
                 <div className="mb-3 flex items-center justify-between bg-white p-2 rounded border border-sand-200">
                     <span className="text-xs text-sand-500 flex items-center gap-1 truncate max-w-[150px]">
                         <Paperclip className="w-3 h-3 flex-shrink-0" /> Anexo atual
                     </span>
                     <a 
                        href={existingReceiptUrl} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-xs font-medium text-brand-600 hover:text-brand-800 flex items-center gap-1 bg-brand-50 px-2 py-1 rounded flex-shrink-0"
                    >
                        <ExternalLink className="w-3 h-3" /> Abrir Atual
                    </a>
                 </div>
             )}

             <div className="mt-1">
                <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => setSelectedFile(e.target.files?.[0])}
                    className="block w-full text-sm text-sand-500
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-full file:border-0
                        file:text-xs file:font-semibold
                        file:bg-brand-100 file:text-brand-700
                        hover:file:bg-brand-200"
                    disabled={isSaving}
                />
             </div>
             <p className="text-xs text-sand-400 mt-2">
                 {existingReceiptUrl 
                    ? "Substitui o arquivo atual." 
                    : "JPG, PNG ou PDF."}
             </p>
          </div>

          <div className="pt-4 flex flex-col-reverse sm:flex-row justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} disabled={isSaving} className="w-full sm:w-auto">
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving} className="w-full sm:w-auto">
              {isSaving ? (
                  <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Salvando...
                  </span>
              ) : (editingId ? 'Salvar Alterações' : 'Adicionar')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* BATCH GENERATOR Modal */}
      <Modal
        isOpen={isBatchModalOpen}
        onClose={() => !isSaving && setIsBatchModalOpen(false)}
        title="Gerar Parcelas em Lote"
      >
        <form onSubmit={handleBatchSave} className="space-y-4">
            <div className="bg-brand-50 p-4 rounded-lg border border-brand-100 text-sm text-brand-800 mb-4 flex items-start gap-2">
                <CalendarRange className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                    <p className="font-semibold">Gerador Automático</p>
                    <p className="opacity-90 mt-1 text-xs">
                        Cria várias parcelas sequenciais incrementando o mês automaticamente.
                    </p>
                </div>
            </div>

            <Input
                label="Descrição Base"
                value={batchDesc}
                onChange={(e) => setBatchDesc(e.target.value)}
                placeholder="Ex: Taxa de Condomínio"
                required
                disabled={isSaving}
            />

            <div className="grid grid-cols-2 gap-4">
                <Input
                    label="Valor Mensal (R$)"
                    type="number"
                    step="0.01"
                    min="0"
                    value={batchAmount}
                    onChange={(e) => setBatchAmount(e.target.value)}
                    required
                    disabled={isSaving}
                />
                <Input
                    label="Qtd. Meses"
                    type="number"
                    min="2"
                    max="60"
                    value={batchCount}
                    onChange={(e) => setBatchCount(e.target.value)}
                    required
                    disabled={isSaving}
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <Input
                    label="Mês Inicial"
                    value={batchStartMonth}
                    onChange={(e) => setBatchStartMonth(e.target.value)}
                    placeholder="Ex: 01/2024"
                    pattern="\d{2}/\d{4}"
                    required
                    className="font-mono"
                    disabled={isSaving}
                />
                <Input
                    label="Dia Vencimento"
                    type="number"
                    min="1"
                    max="31"
                    value={batchDueDay}
                    onChange={(e) => setBatchDueDay(e.target.value)}
                    required
                    disabled={isSaving}
                />
            </div>

            <SplitEditor
                enabled={batchSplitEnabled}
                onToggle={setBatchSplitEnabled}
                rows={batchShareRows}
                onChange={setBatchShareRows}
                total={parseFloat(batchAmount) || 0}
                disabled={isSaving}
                showReimbursed={false}
            />

            <div className="pt-4 flex flex-col-reverse sm:flex-row justify-end gap-3">
                <Button type="button" variant="ghost" onClick={() => setIsBatchModalOpen(false)} disabled={isSaving} className="w-full sm:w-auto">
                    Cancelar
                </Button>
                <Button type="submit" disabled={isSaving} className="w-full sm:w-auto">
                    {isSaving ? (
                        <span className="flex items-center justify-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" /> Gerando...
                        </span>
                    ) : 'Gerar Lote'}
                </Button>
            </div>
        </form>
      </Modal>
    </div>
  );
};