import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, Edit2, Search, Loader2, Paperclip, ExternalLink, Eye, CheckCircle2, Clock } from 'lucide-react';
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
  const [searchQuery, setSearchQuery] = useState('');
  
  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [monthYear, setMonthYear] = useState('');
  const [status, setStatus] = useState<ExpenseStatus>('PENDING');
  const [selectedFile, setSelectedFile] = useState<File | undefined>(undefined);
  const [existingReceiptUrl, setExistingReceiptUrl] = useState<string | undefined>(undefined);

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
          finalDescription = `${monthYear} - ${desc}`;
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
        receiptUrl: existingReceiptUrl, // Mantém a URL antiga se não houver novo arquivo
        status: status
      };

      if (editingId) {
        await StorageService.update(itemPayload, selectedFile);
      } else {
        await StorageService.add(itemPayload, selectedFile);
      }
      
      await loadItems(); // Refresh list from server
      setIsModalOpen(false);
    } catch (error: any) {
      console.error(error);
      const isBucketError = error?.message?.includes('Bucket not found');
      const isPolicyError = error?.message?.includes('policy') || error?.message?.includes('permission') || error?.code === '42501';

      if (isBucketError || isPolicyError) {
          const detail = isBucketError ? 'O Bucket "receipts" não foi encontrado.' : 'Permissão de upload negada.';
          alert(`⚠️ ERRO DE CONFIGURAÇÃO NO SUPABASE ⚠️\n\n${detail}\n\nSOLUÇÃO:\n1. Vá ao SQL Editor do Supabase.\n2. Copie e execute o conteúdo do arquivo "supabase_setup.sql" (incluído no projeto).`);
      } else {
          alert('Erro ao salvar: ' + (error?.message || 'Verifique o console.'));
      }
    } finally {
      setIsSaving(false);
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
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [items, searchQuery]);

  const total = useMemo(() => items.reduce((acc, curr) => acc + curr.amount, 0), [items]);

  // Status Badge Component Helper
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
          <p className="text-gray-500">{description}</p>
        </div>
        <Button onClick={() => handleOpenModal()} className="shadow-lg shadow-indigo-200">
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Novo
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white border-none">
          <p className="text-indigo-100 font-medium text-sm">Total Acumulado</p>
          <h3 className="text-3xl font-bold mt-1">
            {isLoading ? '...' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total)}
          </h3>
        </Card>
        <Card>
           <p className="text-gray-500 font-medium text-sm">Registros</p>
           <h3 className="text-3xl font-bold mt-1 text-gray-800">{isLoading ? '...' : items.length}</h3>
        </Card>
        <Card>
            <p className="text-gray-500 font-medium text-sm">Status (Pendentes)</p>
            <h3 className="text-3xl font-bold mt-1 text-amber-500">
                {isLoading ? '...' : items.filter(i => i.status === 'PENDING').length}
            </h3>
        </Card>
      </div>

      {/* Filter & Table */}
      <Card className="overflow-hidden p-0">
        <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
            <Search className="w-4 h-4 text-gray-400" />
            <input 
                type="text" 
                placeholder="Buscar por descrição..." 
                className="bg-transparent border-none focus:ring-0 text-sm w-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
            />
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descrição</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
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
                        {item.type !== ExpenseType.NOTE && (
                            <Badge color="bg-blue-100 text-blue-800 mt-1">Recorrente</Badge>
                        )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(item.date).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                        <StatusBadge status={item.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.amount)}
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
      </Card>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !isSaving && setIsModalOpen(false)}
        title={editingId ? 'Editar Item' : 'Adicionar Novo Item'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          
          {/* Status Selection */}
          <div className="bg-gray-50 p-2 rounded-lg flex items-center justify-center gap-2">
            <span className="text-sm text-gray-600 font-medium mr-2">Status:</span>
            <div className="flex gap-2">
                <button
                    type="button"
                    onClick={() => setStatus('PENDING')}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
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
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
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
          
          <div className="grid grid-cols-2 gap-4">
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
                label="Data do Registro"
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
                     <span className="text-xs text-gray-500 flex items-center gap-1">
                         <Paperclip className="w-3 h-3" /> Anexo atual disponível
                     </span>
                     <a 
                        href={existingReceiptUrl} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1 bg-indigo-50 px-2 py-1 rounded"
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
                        file:text-sm file:font-semibold
                        file:bg-indigo-100 file:text-indigo-700
                        hover:file:bg-indigo-200"
                    disabled={isSaving}
                />
             </div>
             <p className="text-xs text-gray-400 mt-2">
                 {existingReceiptUrl 
                    ? "Se selecionar um arquivo, o atual será substituído." 
                    : "Formatos aceitos: Imagens (JPG, PNG) e PDF."}
             </p>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} disabled={isSaving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                  <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Salvando...
                  </span>
              ) : (editingId ? 'Salvar Alterações' : 'Adicionar')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};