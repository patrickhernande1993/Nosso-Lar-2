import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, Edit2, Search, Loader2, Paperclip, ExternalLink, Eye, CheckCircle2, Clock, Layers, CalendarRange, MoreVertical } from 'lucide-react';
import { ExpenseType, ExpenseItem, ExpenseStatus } from '../types';
import { StorageService } from '../services/storage';
import { Button, Input, Modal, Card, Badge } from './UI';

interface ExpenseModuleProps {
  type: ExpenseType;
  title: string;
  description: string;
}

export const ExpenseModule: React.FC<ExpenseModuleProps> = ({ type, title, description }) => {
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

  // Load data
  const loadItems = async () => {
    setIsLoading(true);
    try {
      const data = await StorageService.getByType(type);
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
    } else {
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
    setBatchDesc(type === ExpenseType.FEE ? 'Taxa de Condomínio' : 'Parcela');
    setBatchAmount('');
    
    const now = new Date();
    const m = (now.getMonth() + 1).toString().padStart(2, '0');
    const y = now.getFullYear();
    setBatchStartMonth(`${m}/${y}`);
    
    setBatchCount('12');
    setBatchDueDay('10');
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

      if (type === ExpenseType.INSTALLMENT || type === ExpenseType.FEE) {
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

      if (editingId) {
        await StorageService.update(itemPayload, selectedFile);
      } else {
        await StorageService.add(itemPayload, selectedFile);
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

  const StatusBadge = ({ status }: { status: ExpenseStatus }) => {
      if (status === 'PAID') {
          return (
              <Badge color="bg-green-100 text-green-700 ring-1 ring-green-600/20">
                  <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Pago
                  </span>
              </Badge>
          );
      }
      return (
          <Badge color="bg-amber-100 text-amber-700 ring-1 ring-amber-600/20">
              <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Em Aberto
              </span>
          </Badge>
      );
  };

  // Helper for formatting currency
  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  // Helper for date
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('pt-BR', { timeZone: 'UTC' });

  return (
    <div className="space-y-6">
      {/* Header Responsivo */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-900">{title}</h2>
          <p className="text-sm text-gray-500">{description}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
            {(type === ExpenseType.INSTALLMENT || type === ExpenseType.FEE) && (
                <Button onClick={handleOpenBatchModal} variant="secondary" className="shadow-sm w-full sm:w-auto justify-center">
                    <Layers className="w-4 h-4 mr-2" />
                    Gerar em Lote
                </Button>
            )}
            <Button onClick={() => handleOpenModal()} className="shadow-lg shadow-indigo-200 w-full sm:w-auto justify-center">
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Novo
            </Button>
        </div>
      </div>

      {/* Filter & Data Display */}
      <Card className="overflow-hidden p-0 border border-gray-200 shadow-sm">
        <div className="p-4 border-b border-gray-100 bg-white flex items-center gap-2">
            <Search className="w-4 h-4 text-gray-400" />
            <input 
                type="text" 
                placeholder="Buscar por descrição..." 
                className="bg-transparent border-none focus:ring-0 text-sm w-full outline-none"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
            />
        </div>
        
        {/* DESKTOP TABLE VIEW (Hidden on Mobile) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descrição</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vencimento</th>
                <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Valor</th>
                <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Comprovante</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                 <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                        <div className="flex justify-center items-center gap-2">
                             <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
                             Carregando dados...
                        </div>
                    </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                        Nenhum registro encontrado.
                    </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{item.description}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(item.date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                        <StatusBadge status={item.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                        {formatCurrency(item.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                        {item.receiptUrl ? (
                            <a 
                                href={item.receiptUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="inline-block text-decoration-none"
                                title="Ver Comprovante"
                            >
                                <Button variant="secondary" size="sm" className="flex items-center gap-2 text-indigo-600 border-indigo-200 hover:bg-indigo-50">
                                    <Eye className="w-3 h-3" /> Ver Anexo
                                </Button>
                            </a>
                        ) : (
                            <span className="text-gray-300 text-xs">-</span>
                        )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button onClick={() => handleOpenModal(item)} className="text-indigo-600 hover:text-indigo-900 mr-4">
                        <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-900">
                        <Trash2 className="w-4 h-4" />
                        </button>
                    </td>
                    </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* MOBILE CARD VIEW (Visible only on Mobile) */}
        <div className="md:hidden bg-gray-50">
            {isLoading ? (
                <div className="p-8 flex justify-center text-gray-500">
                    <Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando...
                </div>
            ) : filteredItems.length === 0 ? (
                <div className="p-8 text-center text-gray-500 text-sm">Nenhum registro encontrado.</div>
            ) : (
                <div className="flex flex-col gap-2 p-2">
                    {filteredItems.map((item) => (
                        <div key={item.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex flex-col gap-3">
                            <div className="flex justify-between items-start">
                                <div className="flex-1 pr-2">
                                    <span className="font-semibold text-gray-900 line-clamp-2">{item.description}</span>
                                    <span className="text-xs text-gray-400 block mt-1">Venc: {formatDate(item.date)}</span>
                                </div>
                                <span className="font-bold text-gray-900">{formatCurrency(item.amount)}</span>
                            </div>
                            
                            <div className="flex items-center justify-between mt-1">
                                <StatusBadge status={item.status} />
                                
                                <div className="flex items-center gap-2">
                                    {item.receiptUrl && (
                                        <a href={item.receiptUrl} target="_blank" rel="noopener noreferrer" className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100">
                                            <Paperclip className="w-4 h-4" />
                                        </a>
                                    )}
                                    <button onClick={() => handleOpenModal(item)} className="p-2 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 border border-gray-200">
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleDelete(item.id)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 border border-red-100">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
      </Card>

      {/* SINGLE ITEM Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !isSaving && setIsModalOpen(false)}
        title={editingId ? 'Editar Item' : 'Adicionar Novo Item'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          
          {/* Status Selection */}
          <div className="bg-gray-50 p-2 rounded-lg flex flex-col sm:flex-row items-center justify-center gap-2">
            <span className="text-sm text-gray-600 font-medium sm:mr-2">Status:</span>
            <div className="flex gap-2 w-full sm:w-auto justify-center">
                <button
                    type="button"
                    onClick={() => setStatus('PENDING')}
                    className={`flex-1 sm:flex-none px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        status === 'PENDING' 
                        ? 'bg-amber-100 text-amber-700 ring-2 ring-amber-500' 
                        : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'
                    }`}
                >
                    Em Aberto
                </button>
                <button
                    type="button"
                    onClick={() => setStatus('PAID')}
                    className={`flex-1 sm:flex-none px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        status === 'PAID' 
                        ? 'bg-green-100 text-green-700 ring-2 ring-green-500' 
                        : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'
                    }`}
                >
                    Pago
                </button>
            </div>
          </div>

          {(type === ExpenseType.INSTALLMENT || type === ExpenseType.FEE) && (
             <Input
                label="Mês/Ano Referência (MM/AAAA)"
                value={monthYear}
                onChange={(e) => setMonthYear(e.target.value)}
                placeholder="Ex: 01/2024"
                pattern="\d{2}/\d{4}"
                required
                className="font-mono"
                disabled={isSaving}
            />
          )}

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

          <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
             <label className="block text-sm font-medium text-gray-700 mb-2">
                Comprovante (Imagem/PDF)
             </label>
             
             {existingReceiptUrl && (
                 <div className="mb-3 flex items-center justify-between bg-white p-2 rounded border border-gray-200">
                     <span className="text-xs text-gray-500 flex items-center gap-1 truncate max-w-[150px]">
                         <Paperclip className="w-3 h-3 flex-shrink-0" /> Anexo atual
                     </span>
                     <a 
                        href={existingReceiptUrl} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1 bg-indigo-50 px-2 py-1 rounded flex-shrink-0"
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
                    className="block w-full text-sm text-slate-500
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-full file:border-0
                        file:text-xs file:font-semibold
                        file:bg-indigo-100 file:text-indigo-700
                        hover:file:bg-indigo-200"
                    disabled={isSaving}
                />
             </div>
             <p className="text-xs text-gray-400 mt-2">
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
            <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100 text-sm text-indigo-800 mb-4 flex items-start gap-2">
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