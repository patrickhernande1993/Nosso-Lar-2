import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Trash2, Edit2, Search, Loader2, Paperclip, ExternalLink, Eye, Layers, CalendarRange, UserRound, Landmark, CreditCard as CardIcon } from 'lucide-react';
import { ExpenseType, ExpenseItem, ExpenseStatus, ExpenseShare } from '../types';
import { StorageService } from '../services/storage';
import { ShareService } from '../services/payerStorage';
import { Button, Input, Modal, Card, PageHeader, StatusBadge } from './UI';
import { PeriodFilter, useCategoryPeriod, inPeriod } from './PeriodFilter';
import { SplitEditor, ShareRow, toRows, validateRows } from './SplitEditor';
import { Category, RECEIVERS, isIncome, formatBRL as formatCurrency } from '../lib/categories';
import { usePayers, initials } from '../lib/PayersContext';
import { useCategories } from '../lib/CategoriesContext';
import { useWallet, isInvestmentCategory, paymentInfo } from '../lib/WalletContext';

interface ExpenseModuleProps {
  category: Category;
  /** Em um grupo (ex.: Moradia): as subcategorias cujos lançamentos aparecem juntos. */
  subcategories?: Category[];
}

export const ExpenseModule: React.FC<ExpenseModuleProps> = ({ category, subcategories }) => {
  const { name: title, description } = category;
  const { categoryByKey, kindMissing, expenseTree, incomeTree } = useCategories();
  const isGroupPage = !!category.is_group;
  const leaves = useMemo(() => (isGroupPage ? subcategories ?? [] : [category]), [isGroupPage, subcategories, category]);
  const leafKeys = leaves.map(l => l.key).join('|');
  const parent = category.parent_key ? categoryByKey.get(category.parent_key) : undefined;
  // Subcategoria filtrada na página do grupo ('ALL' = todas)
  const [subFilter, setSubFilter] = useState('ALL');
  const [period, setPeriod] = useCategoryPeriod();
  // Subcategoria em que o lançamento do formulário será gravado
  const [formType, setFormType] = useState(leaves[0]?.key ?? category.key);
  const type = formType;
  const income = isIncome(category);
  const [receiver, setReceiver] = useState('');
  const [batchReceiver, setBatchReceiver] = useState('');
  // Conta/cartão: '' | 'acc:<id>' | 'card:<id>'
  const { accounts, cards, accountById, cardById, tableMissing: walletMissing, reserveMissing } = useWallet();
  const [payMethod, setPayMethod] = useState('');
  const [batchPayMethod, setBatchPayMethod] = useState('');
  const [isReserve, setIsReserve] = useState(false);
  // Conta cuja reserva recebe (aporte) ou cede (resgate) o valor
  const [reserveAcc, setReserveAcc] = useState('');
  const [batchReserveAcc, setBatchReserveAcc] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const methodOf = (i: ExpenseItem) => (i.cardId ? `card:${i.cardId}` : i.accountId ? `acc:${i.accountId}` : '');
  const walletFields = (method: string, reserve: boolean, reserveAccId = '') => {
    if (walletMissing) return {};
    const accountId = method.startsWith('acc:') ? method.slice(4) : null;
    const invest = isInvestmentCategory(categoryByKey.get(formType));
    return {
      accountId,
      cardId: method.startsWith('card:') ? method.slice(5) : null,
      // Em aporte/resgate a reserva é escolhida explicitamente; "pago com a reserva" não se aplica
      isReserve: method.startsWith('acc:') && !invest ? reserve : false,
      ...(reserveMissing ? {} : { reserveAccountId: invest ? reserveAccId || accountId : null }),
    };
  };
  const defaultFormType = () => (subFilter !== 'ALL' ? subFilter : leaves[0]?.key ?? category.key);
  const [items, setItems] = useState<ExpenseItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false); // Modal de Lote
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'PAID'>('ALL');
  // Parcelamento automático no "Novo lançamento": nº de meses e modo (ratear o valor ou repetir o valor cheio)
  const [installments, setInstallments] = useState('1');
  const [installMode, setInstallMode] = useState<'SPLIT' | 'REPEAT'>('SPLIT');
  
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
      const keys = new Set(leaves.map(l => l.key));
      const [data, shares] = await Promise.all([
        isGroupPage
          ? StorageService.getAll().then(all => all.filter(i => keys.has(i.type)))
          : StorageService.getByType(category.key),
        ShareService.getAll(),
      ]);
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
  }, [category.key, leafKeys]);

  // Vindo do "Novo lançamento" da visão geral (?novo=1): abre o formulário direto
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    if (searchParams.get('novo') && leaves.length > 0) {
      setSearchParams({}, { replace: true });
      handleOpenModal();
    }
  }, [searchParams]);

  const handleOpenModal = (item?: ExpenseItem) => {
    setSelectedFile(undefined); // Reset file input
    setFormType(item ? item.type : defaultFormType());
    if (item) {
      setEditingId(item.id);
      setDesc(item.description);
      setAmount(item.amount.toString());
      setDate(item.date);
      setMonthYear(item.monthYear || '');
      setStatus(item.status);
      setReceiver(item.receiver ?? '');
      setPayMethod(methodOf(item));
      setIsReserve(!!item.isReserve);
      setReserveAcc(item.reserveAccountId ?? '');
      setPaymentDate(item.paymentDate ?? '');
      setExistingReceiptUrl(item.receiptUrl);
      const existing = sharesByExpense.get(String(item.id)) ?? [];
      setSplitEnabled(existing.length > 0);
      setShareRows(toRows(existing));
    } else {
      setSplitEnabled(false);
      setShareRows([]);
      setReceiver('');
      setPayMethod('');
      setIsReserve(false);
      setReserveAcc('');
      setPaymentDate('');
      setEditingId(null);
      setInstallments('1');
      setInstallMode('SPLIT');
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
    const target = defaultFormType();
    setFormType(target);
    let defaultDesc = '';
    if (target === ExpenseType.FEE) defaultDesc = 'Taxa de Condomínio';
    else if (target === ExpenseType.INSTALLMENT) defaultDesc = 'Parcela';
    
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
    setBatchReceiver('');
    setBatchPayMethod('');
    setBatchReserveAcc('');
    setIsBatchModalOpen(true);
  };

  /** Gera as parcelas mensais a partir do lançamento base. Ratear: divide o valor (centavos na última); Repetir: valor cheio todo mês. */
  const buildInstallments = (base: ExpenseItem, rawDesc: string, n: number, mode: 'SPLIT' | 'REPEAT', withMonthPrefix: boolean): ExpenseItem[] => {
    const [y0, m0, d0] = base.date.split('-').map(Number);
    const totalCents = Math.round(base.amount * 100);
    const partCents = mode === 'SPLIT' ? Math.floor(totalCents / n) : totalCents;
    return Array.from({ length: n }, (_, i) => {
      const mIndex = m0 - 1 + i;
      const y = y0 + Math.floor(mIndex / 12);
      const m = (mIndex % 12) + 1;
      const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
      const d = Math.min(d0, lastDay);
      const mm = String(m).padStart(2, '0');
      const monthYearStr = `${mm}/${y}`;
      const cents = mode === 'SPLIT' && i === n - 1 ? totalCents - partCents * (n - 1) : partCents;
      const label = `${rawDesc} (${i + 1}/${n})`;
      return {
        ...base,
        id: i === 0 ? base.id : crypto.randomUUID(),
        description: withMonthPrefix ? `${monthYearStr} - ${label}` : label,
        monthYear: withMonthPrefix ? monthYearStr : base.monthYear,
        amount: cents / 100,
        date: `${y}-${mm}-${String(d).padStart(2, '0')}`,
        receiptUrl: undefined,
        // Só a 1ª parcela herda o status escolhido; as seguintes ficam em aberto
        ...(i === 0 ? {} : { status: 'PENDING' as const, ...(base.paymentDate !== undefined ? { paymentDate: null } : {}) }),
      };
    });
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
        status: status,
        ...(income ? { receiver: receiver || null } : {}),
        ...walletFields(payMethod, isReserve, reserveAcc),
        ...(walletMissing ? {} : { paymentDate: status === 'PAID' ? paymentDate || new Date().toISOString().slice(0, 10) : null }),
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

      const n = editingId ? 1 : Math.max(1, Math.min(120, parseInt(installments) || 1));
      if (n > 1) {
        const plan = buildInstallments(itemPayload, desc, n, installMode, !!finalMonthYear);
        // 1ª parcela com o comprovante (se houver); as demais em lote
        await StorageService.add(plan[0], selectedFile);
        if (plan.length > 1) await StorageService.addBatch(plan.slice(1));
        if (!sharesUnavailable && 'shares' in shares && shares.shares.length > 0) {
          // Cada pagante paga a mesma proporção em cada parcela
          for (const it of plan) {
            const ratio = it.amount / itemPayload.amount;
            const scaled = shares.shares.map(sh => ({ ...sh, amount: Math.round(sh.amount * ratio * 100) / 100, reimbursed: false }));
            await ShareService.replaceForExpense(String(it.id), scaled);
          }
        }
      } else {
        if (editingId) {
          await StorageService.update(itemPayload, selectedFile);
        } else {
          await StorageService.add(itemPayload, selectedFile);
        }

        const hadShares = (sharesByExpense.get(String(itemPayload.id)) ?? []).length > 0;
        if (!sharesUnavailable && 'shares' in shares && (shares.shares.length > 0 || hadShares)) {
          await ShareService.replaceForExpense(String(itemPayload.id), shares.shares);
        }
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
                status: 'PENDING',
                ...(income ? { receiver: batchReceiver || null } : {}),
                ...walletFields(batchPayMethod, false, batchReserveAcc)
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

  // No grupo, o filtro de subcategoria vale para a lista e para os totais
  // Filtro de período (mês/ano): vale para os totais, as abas e a lista
  const periodItems = useMemo(() => items.filter(i => inPeriod(i.date, period)), [items, period]);
  const years = useMemo(() => Array.from(new Set(items.map(i => i.date.split('-')[0]))), [items]);
  const scopedItems = useMemo(() => (subFilter === 'ALL' ? periodItems : periodItems.filter(i => i.type === subFilter)), [periodItems, subFilter]);

  const filteredItems = useMemo(() => {
    return scopedItems
        .filter(i => statusFilter === 'ALL' || i.status === statusFilter)
        .filter(i => i.description.toLowerCase().includes(searchQuery.toLowerCase()))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [scopedItems, searchQuery, statusFilter]);

  const statusCounts = useMemo(() => ({
    ALL: scopedItems.length,
    PENDING: scopedItems.filter(i => i.status === 'PENDING').length,
    PAID: scopedItems.filter(i => i.status === 'PAID').length,
  }), [scopedItems]);

  const totals = useMemo(() => {
    const paid = scopedItems.filter(i => i.status === 'PAID').reduce((a, i) => a + i.amount, 0);
    const total = scopedItems.reduce((a, i) => a + i.amount, 0);
    const allShares = scopedItems.flatMap(i => sharesByExpense.get(String(i.id)) ?? []);
    const others = allShares.reduce((a, s) => a + s.amount, 0);
    const toReceive = allShares.filter(s => !s.reimbursed).reduce((a, s) => a + s.amount, 0);
    return { total, paid, pending: total - paid, mine: total - others, toReceive, hasShares: allShares.length > 0 };
  }, [scopedItems, sharesByExpense]);

  // Selo da subcategoria em cada linha da página do grupo
  const SubTag = ({ item }: { item: ExpenseItem }) => {
    if (!isGroupPage) return null;
    const sub = categoryByKey.get(item.type);
    if (!sub) return null;
    return (
      <span className="inline-flex items-center gap-1.5 mt-1 text-[11px] font-medium text-sand-500">
        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: sub.color }} /> {sub.name}
      </span>
    );
  };

  // Categoria do lançamento: permite corrigir um lançamento feito na categoria errada.
  // Lista todas as categorias do mesmo tipo (despesa ou recebimento), agrupadas como no menu.
  const sameKindTree = (income ? incomeTree : expenseTree);
  const SubcategorySelect = ({ disabled }: { disabled?: boolean }) => (
    <div>
      <label className="block text-xs font-semibold text-sand-600 mb-1.5">Categoria</label>
      <select
        value={formType}
        onChange={e => setFormType(e.target.value)}
        disabled={disabled}
        className="select-clean w-full pl-3.5 pr-9 py-2.5 rounded-xl border border-sand-200 bg-sand-50/60 text-sm text-sand-900 focus:bg-white focus:border-brand-500 focus:outline-none"
      >
        {sameKindTree.map(({ category: c, children }) =>
          c.is_group ? (
            <optgroup key={c.key} label={c.name}>
              {children.map(ch => <option key={ch.key} value={ch.key}>{ch.name}</option>)}
            </optgroup>
          ) : (
            <option key={c.key} value={c.key}>{c.name}</option>
          )
        )}
      </select>
      {editingId && !leaves.some(l => l.key === formType) && (
        <p className="text-xs text-sand-500 mt-1">Ao salvar, o lançamento sai desta tela e vai para "{categoryByKey.get(formType)?.name}".</p>
      )}
    </div>
  );

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

  // Quem recebeu (só em recebimentos)
  const ReceiverTag = ({ item }: { item: ExpenseItem }) =>
    income && item.receiver ? (
      <span className="inline-flex items-center gap-1 mt-1 text-[11px] font-medium text-sand-500">
        <UserRound className="w-3 h-3" /> {item.receiver}
      </span>
    ) : null;

  const ReceiverSelect = ({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) =>
    income && !kindMissing ? (
      <div>
        <span className="block text-xs font-semibold text-sand-600 mb-1.5">Quem recebeu</span>
        <div className="grid grid-cols-3 gap-1 p-1 bg-sand-100 rounded-xl" role="radiogroup" aria-label="Quem recebeu">
          {RECEIVERS.map(r => (
            <button
              key={r}
              type="button"
              role="radio"
              aria-checked={value === r}
              onClick={() => onChange(value === r ? '' : r)}
              disabled={disabled}
              className={`py-2 rounded-lg text-sm font-semibold transition-all ${value === r ? 'bg-white shadow-sm text-brand-700' : 'text-sand-500 hover:text-sand-800'}`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>
    ) : null;

  const PayMethodSelect = ({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) =>
    walletMissing || (accounts.length === 0 && cards.length === 0) ? null : (
      <div>
        <label className="block text-xs font-semibold text-sand-600 mb-1.5">{income ? 'Recebido em' : 'Pago com'}</label>
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          disabled={disabled}
          className="select-clean w-full pl-3.5 pr-9 py-2.5 rounded-xl border border-sand-200 bg-sand-50/60 text-sm text-sand-900 focus:bg-white focus:border-brand-500 focus:outline-none"
        >
          <option value="">Não informado</option>
          {accounts.length > 0 && (
            <optgroup label="Contas">
              {accounts.map(a => <option key={a.id} value={`acc:${a.id}`}>{a.name}{a.owner ? ` (${a.owner})` : ''}</option>)}
            </optgroup>
          )}
          {!income && cards.length > 0 && (
            <optgroup label="Cartões de crédito">
              {cards.map(c => <option key={c.id} value={`card:${c.id}`}>{c.name}{c.owner ? ` (${c.owner})` : ''}</option>)}
            </optgroup>
          )}
        </select>
      </div>
    );

  const investForm = !walletMissing && accounts.length > 0 && isInvestmentCategory(categoryByKey.get(formType));
  const accountOptions = accounts.map(a => <option key={a.id} value={a.id}>{a.name}{a.owner ? ` (${a.owner})` : ''}</option>);
  const fieldCls = 'select-clean w-full pl-3.5 pr-9 py-2.5 rounded-xl border border-sand-200 bg-sand-50/60 text-sm text-sand-900 focus:bg-white focus:border-brand-500 focus:outline-none';

  /** Aporte (despesa): sai do corrente -> vai para a reserva. Resgate (recebimento): sai da reserva -> entra no corrente. */
  const ReserveTransfer = ({ method, onMethod, reserve, onReserve, disabled }: {
    method: string; onMethod: (v: string) => void; reserve: string; onReserve: (v: string) => void; disabled?: boolean;
  }) => {
    const accountId = method.startsWith('acc:') ? method.slice(4) : '';
    const checking = (
      <div>
        <label className="block text-xs font-semibold text-sand-600 mb-1.5">{income ? 'Entra na conta (corrente)' : 'Sai da conta (corrente)'}</label>
        <select value={accountId} onChange={e => { onMethod(e.target.value ? `acc:${e.target.value}` : ''); if (!reserve) onReserve(e.target.value); }} disabled={disabled} className={fieldCls}>
          <option value="">Escolha a conta</option>
          {accountOptions}
        </select>
      </div>
    );
    const reserveSel = (
      <div>
        <label className="block text-xs font-semibold text-sand-600 mb-1.5">{income ? 'Sai da reserva de' : 'Vai para a reserva de'}</label>
        <select value={reserve || accountId} onChange={e => onReserve(e.target.value)} disabled={disabled || reserveMissing} className={fieldCls}>
          <option value="">Escolha a conta</option>
          {accountOptions}
        </select>
      </div>
    );
    return (
      <div className="rounded-2xl border border-brand-200 bg-brand-50/40 p-4 space-y-3">
        <p className="text-xs font-semibold text-brand-800">{income ? 'Resgate da reserva' : 'Aporte na reserva'}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {income ? <>{reserveSel}{checking}</> : <>{checking}{reserveSel}</>}
        </div>
        {reserveMissing && <p className="text-xs text-sand-500">Para escolher outra conta como reserva, rode o script supabase_reserva.sql. Por enquanto vale a mesma conta.</p>}
      </div>
    );
  };

  // Conta/cartão usado, abaixo da descrição
  const MethodTag = ({ item }: { item: ExpenseItem }) => {
    const card = item.cardId ? cardById.get(item.cardId) : undefined;
    const acc = !card && item.accountId ? accountById.get(item.accountId) : undefined;
    if (!card && !acc) return null;
    const Icon = card ? CardIcon : Landmark;
    const itemCat = categoryByKey.get(item.type);
    if (acc && isInvestmentCategory(itemCat) && !item.isReserve) {
      const res = accountById.get(item.reserveAccountId ?? acc.id) ?? acc;
      return (
        <span className="inline-flex items-center gap-1 mt-1 text-[11px] font-medium text-sand-500">
          <Landmark className="w-3 h-3" style={{ color: acc.color }} />
          {isIncome(itemCat) ? `reserva ${res.name} → ${acc.name}` : `${acc.name} → reserva ${res.name}`}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 mt-1 text-[11px] font-medium text-sand-500">
        <Icon className="w-3 h-3" style={{ color: (card ?? acc)!.color }} /> {(card ?? acc)!.name}
        {item.isReserve && <span className="text-sand-400">· reserva</span>}
      </span>
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
        eyebrow={isGroupPage ? 'Grupo de categorias' : parent ? parent.name : income ? 'Recebimentos' : 'Categoria'}
        title={title}
        description={description}
        actions={
          leaves.length > 0 ? (
            <>
              <Button onClick={handleOpenBatchModal} variant="secondary" className="w-full sm:w-auto">
                <Layers className="w-4 h-4" /> Gerar em lote
              </Button>
              <Button onClick={() => handleOpenModal()} className="w-full sm:w-auto">
                <Plus className="w-4 h-4" /> {income ? 'Novo recebimento' : 'Novo lançamento'}
              </Button>
            </>
          ) : undefined
        }
      />

      {isGroupPage && leaves.length === 0 && (
        <Card className="mb-6 text-center py-10">
          <p className="text-sand-700 font-medium">Este grupo ainda não tem subcategorias</p>
          <p className="text-sm text-sand-400 mt-1">Em Configurações → Categorias, crie uma categoria e escolha "{title}" no campo "Dentro de".</p>
        </Card>
      )}

      {leaves.length > 0 && (
        <div className="mb-4">
          <PeriodFilter value={period} onChange={setPeriod} years={years} />
        </div>
      )}

      {isGroupPage && leaves.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 mb-4 -mx-1 px-1" role="tablist" aria-label="Filtrar por subcategoria">
          {[{ key: 'ALL', name: 'Todas', color: undefined as string | undefined }, ...leaves].map(l => {
            const count = l.key === 'ALL' ? periodItems.length : periodItems.filter(i => i.type === l.key).length;
            const active = subFilter === l.key;
            return (
              <button
                key={l.key}
                role="tab"
                aria-selected={active}
                onClick={() => setSubFilter(l.key)}
                className={`flex items-center gap-2 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold border transition ${
                  active ? 'bg-brand-800 border-brand-800 text-white' : 'bg-white border-sand-200 text-sand-600 hover:border-sand-300'
                }`}
              >
                {l.color && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: l.color }} />}
                {l.name}
                <span className={active ? 'text-white/60' : 'text-sand-400'}>{count}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Resumo */}
      <div className={`grid grid-cols-1 gap-3 mb-6 ${totals.hasShares ? 'sm:grid-cols-2 lg:grid-cols-4' : 'sm:grid-cols-3'}`}>
        {[
          { label: 'Total', value: totals.total, cls: 'text-sand-900', dot: category.color, sub: totals.hasShares ? `Sua parte ${formatCurrency(totals.mine)}` : undefined },
          { label: income ? 'Recebido' : 'Pago', value: totals.paid, cls: 'text-brand-700', dot: '#3a7d61' },
          { label: income ? 'A receber' : 'Em aberto', value: totals.pending, cls: 'text-clay-600', dot: '#d6824f' },
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
        <div className="px-4 sm:px-5 py-3 border-b border-sand-100 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Search className="w-4 h-4 text-sand-400 flex-shrink-0" />
            <input
              type="text"
              placeholder="Buscar por descrição..."
              className="bg-transparent text-sm w-full outline-none placeholder-sand-400"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <span className="text-xs text-sand-400 whitespace-nowrap">{filteredItems.length} {filteredItems.length === 1 ? 'item' : 'itens'}</span>
          </div>
          <div className="grid grid-cols-3 gap-1 p-1 bg-sand-100 rounded-xl flex-shrink-0" role="tablist" aria-label="Filtrar por status">
            {([['ALL', 'Todos'], ['PENDING', income ? 'A receber' : 'Em aberto'], ['PAID', income ? 'Recebidos' : 'Pagos']] as const).map(([value, label]) => (
              <button
                key={value}
                role="tab"
                aria-selected={statusFilter === value}
                onClick={() => setStatusFilter(value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                  statusFilter === value ? 'bg-white shadow-sm text-sand-900' : 'text-sand-500 hover:text-sand-800'
                }`}
              >
                {label} <span className="text-sand-400 font-medium">{statusCounts[value]}</span>
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="py-16 flex justify-center items-center gap-2 text-sand-500 text-sm">
            <Loader2 className="w-5 h-5 animate-spin text-brand-600" /> Carregando...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sand-600 font-medium">{scopedItems.length > 0 ? 'Nenhum lançamento com esse filtro' : items.length > 0 ? 'Nenhum lançamento neste período' : 'Nenhum lançamento encontrado'}</p>
            <p className="text-sm text-sand-400 mt-1">
              {scopedItems.length > 0 ? 'Troque o status ou limpe a busca.' : items.length > 0 ? 'Troque o mês ou escolha "Todos os meses" para ver o histórico.' : <>Use "{income ? 'Novo recebimento' : 'Novo lançamento'}" para adicionar o primeiro.</>}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-sand-400 bg-sand-50/70">
                    <th className="px-5 py-3">{income ? 'Data' : 'Vencimento'}</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Descrição</th>
                    <th className="px-5 py-3 hidden lg:table-cell">Conta</th>
                    <th className="px-5 py-3 hidden lg:table-cell">Método</th>
                    <th className="px-5 py-3 text-right">Valor</th>
                    <th className="px-5 py-3 text-center">Comprovante</th>
                    <th className="px-5 py-3 text-right"><span className="sr-only">Ações</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sand-100">
                  {filteredItems.map((item) => {
                    const overdue = item.status === 'PENDING' && item.date < today;
                    const pay = paymentInfo(item, categoryByKey.get(item.type), accountById, cardById);
                    return (
                      <tr key={item.id} className="hover:bg-sand-50/60 transition-colors">
                        <td className={`px-5 py-3.5 text-sm tabular whitespace-nowrap ${overdue ? 'text-clay-600 font-semibold' : 'text-sand-500'}`}>
                          {formatDate(item.date)}{overdue && <span className="block text-[10px] uppercase tracking-wider">{income ? 'atrasado' : 'vencido'}</span>}
                        </td>
                        <td className="px-5 py-3.5"><StatusBadge status={item.status} income={income} /></td>
                        <td className="px-5 py-3.5 text-sm font-medium text-sand-900">{item.description}<div className="flex flex-wrap items-center gap-x-3"><SubTag item={item} /><span className="lg:hidden"><MethodTag item={item} /></span><ReceiverTag item={item} /><SplitInfo item={item} /></div></td>
                        <td className="px-5 py-3.5 hidden lg:table-cell text-xs text-sand-600 max-w-[11rem]" title={pay?.conta}>
                          {pay ? <span className="flex items-center gap-1.5 min-w-0"><span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: pay.color }} /><span className="truncate">{pay.conta}</span></span> : <span className="text-sand-300">—</span>}
                        </td>
                        <td className="px-5 py-3.5 hidden lg:table-cell text-xs text-sand-600 whitespace-nowrap">{pay ? pay.metodo : <span className="text-sand-300">—</span>}</td>
                        <td className={`px-5 py-3.5 text-sm text-right font-semibold tabular whitespace-nowrap ${income ? 'text-emerald-700' : 'text-red-600'}`}>{income ? '+ ' : '− '}{formatCurrency(item.amount)}</td>
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
                        <div className="flex flex-wrap items-center gap-x-3"><SubTag item={item} /><MethodTag item={item} /><ReceiverTag item={item} /><SplitInfo item={item} /></div>
                        <p className={`text-xs mt-1 tabular ${overdue ? 'text-clay-600 font-semibold' : 'text-sand-400'}`}>
                          {income ? 'Previsto para' : 'Vence em'} {formatDate(item.date)}{overdue && (income ? ' · atrasado' : ' · vencido')}
                        </p>
                      </div>
                      <span className={`font-bold tabular whitespace-nowrap ${income ? 'text-emerald-700' : 'text-red-600'}`}>{income ? '+ ' : '− '}{formatCurrency(item.amount)}</span>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <StatusBadge status={item.status} income={income} />
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
          
          {SubcategorySelect({ disabled: isSaving })}
          {ReceiverSelect({ value: receiver, onChange: setReceiver, disabled: isSaving })}
          {/* Status Selection */}
          <div>
            <span className="block text-xs font-semibold text-sand-600 mb-1.5">Status</span>
            <div className="grid grid-cols-2 gap-1 p-1 bg-sand-100 rounded-xl" role="radiogroup">
              {([['PENDING', income ? 'A receber' : 'Em aberto', 'text-clay-700'], ['PAID', income ? 'Recebido' : 'Pago', 'text-brand-700']] as const).map(([value, label, cls]) => (
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

          {/* Forma de pagamento só aparece quando marcado como pago/recebido */}
          {status === 'PAID' && (
            <>
          {investForm
            ? ReserveTransfer({ method: payMethod, onMethod: setPayMethod, reserve: reserveAcc, onReserve: setReserveAcc, disabled: isSaving })
            : PayMethodSelect({ value: payMethod, onChange: setPayMethod, disabled: isSaving })}
          {!walletMissing && !investForm && payMethod.startsWith('acc:') && (
            <label className="flex items-center gap-2 text-sm text-sand-700 -mt-1 cursor-pointer select-none">
              <input type="checkbox" checked={isReserve} onChange={e => setIsReserve(e.target.checked)} disabled={isSaving} className="w-4 h-4 accent-brand-700" />
              {income ? 'Guardar na reserva (investimentos)' : 'Pago com a reserva (investimentos)'}
            </label>
          )}

            </>
          )}

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
                label={income ? 'Data do recebimento' : 'Data de Vencimento'}
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                disabled={isSaving}
            />
          </div>

          {!editingId && (() => {
            const n = Math.max(1, Math.min(120, parseInt(installments) || 1));
            const value = parseFloat(amount) || 0;
            const per = installMode === 'SPLIT' ? value / n : value;
            return (
              <div className="rounded-xl border border-sand-200 bg-sand-50/60 p-3.5 space-y-3">
                <div className="flex flex-wrap items-end gap-3">
                  <div className="w-24">
                    <label className="block text-xs font-semibold text-sand-600 mb-1.5">Nº de meses</label>
                    <input
                      type="number" min={1} max={120} value={installments}
                      onChange={e => setInstallments(e.target.value)} disabled={isSaving}
                      className="w-full px-3 py-2.5 rounded-xl border border-sand-200 bg-white text-sm text-sand-900 focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-1 p-1 bg-sand-100 rounded-xl" role="radiogroup" aria-label="Como gerar as parcelas">
                    {([['SPLIT', 'Ratear'], ['REPEAT', 'Repetir']] as const).map(([v, l]) => (
                      <button key={v} type="button" role="radio" aria-checked={installMode === v} onClick={() => setInstallMode(v)} disabled={isSaving || n === 1}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition disabled:opacity-50 ${installMode === v ? 'bg-white shadow-sm text-sand-900' : 'text-sand-500 hover:text-sand-800'}`}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-sand-500">
                  {n === 1
                    ? 'Lançamento único. Para parcelar, informe mais de 1 mês.'
                    : <>Plano: <strong className="text-sand-800">{n}x de {formatCurrency(per)}</strong>{installMode === 'SPLIT' ? ` (total ${formatCurrency(value)})` : ` (total ${formatCurrency(value * n)})`} · uma por mês a partir da data acima, com "(1/{n})" na descrição.</>}
                </p>
              </div>
            );
          })()}

          {!income && <SplitEditor
            enabled={splitEnabled}
            onToggle={setSplitEnabled}
            rows={shareRows}
            onChange={setShareRows}
            total={parseFloat(amount) || 0}
            disabled={isSaving}
          />}

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
            {SubcategorySelect({ disabled: isSaving })}
            {ReceiverSelect({ value: batchReceiver, onChange: setBatchReceiver, disabled: isSaving })}
            {investForm
              ? ReserveTransfer({ method: batchPayMethod, onMethod: setBatchPayMethod, reserve: batchReserveAcc, onReserve: setBatchReserveAcc, disabled: isSaving })
              : PayMethodSelect({ value: batchPayMethod, onChange: setBatchPayMethod, disabled: isSaving })}
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
                    label={income ? 'Dia do recebimento' : 'Dia Vencimento'}
                    type="number"
                    min="1"
                    max="31"
                    value={batchDueDay}
                    onChange={(e) => setBatchDueDay(e.target.value)}
                    required
                    disabled={isSaving}
                />
            </div>

            {!income && <SplitEditor
                enabled={batchSplitEnabled}
                onToggle={setBatchSplitEnabled}
                rows={batchShareRows}
                onChange={setBatchShareRows}
                total={parseFloat(batchAmount) || 0}
                disabled={isSaving}
                showReimbursed={false}
            />}

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