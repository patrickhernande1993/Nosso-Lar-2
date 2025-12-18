import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Search, Loader2, FileText, FileImage, Download, ExternalLink, CalendarDays, X, Files } from 'lucide-react';
import { ExpenseType, ExpenseItem } from '../types';
import { StorageService } from '../services/storage';
import { Button, Input, Modal, Card } from './UI';

export const DocumentModule: React.FC = () => {
  const [items, setItems] = useState<ExpenseItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Form State
  const [title, setTitle] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const loadDocuments = async () => {
    setIsLoading(true);
    try {
      const data = await StorageService.getByType(ExpenseType.DOCUMENT);
      setItems(data);
    } catch (error) {
      console.error("Failed to load documents", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const handleOpenModal = () => {
    setTitle('');
    setSelectedFiles([]);
    setUploadProgress({ current: 0, total: 0 });
    setIsModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || selectedFiles.length === 0) {
        alert("Por favor, preencha o título e selecione pelo menos um arquivo.");
        return;
    }

    setIsSaving(true);
    setUploadProgress({ current: 0, total: selectedFiles.length });
    
    try {
      // Faz o upload de cada arquivo individualmente
      for (let i = 0; i < selectedFiles.length; i++) {
        setUploadProgress(prev => ({ ...prev, current: i + 1 }));
        
        const file = selectedFiles[i];
        // Se for mais de um arquivo, adicionamos um sufixo ao título para diferenciar
        const displayTitle = selectedFiles.length > 1 
          ? `${title} (${i + 1}/${selectedFiles.length})` 
          : title;

        const itemPayload: ExpenseItem = {
          id: crypto.randomUUID(),
          type: ExpenseType.DOCUMENT,
          description: displayTitle,
          amount: 0,
          date: new Date().toISOString().split('T')[0],
          createdAt: Date.now(),
          status: 'PAID'
        };

        await StorageService.add(itemPayload, file);
      }

      await loadDocuments();
      setIsModalOpen(false);
    } catch (error: any) {
      alert('Erro ao salvar documentos: ' + (error?.message || 'Verifique o console.'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este documento?')) {
      try {
        await StorageService.delete(id);
        setItems(prev => prev.filter(i => i.id !== id));
      } catch (error) {
        alert('Erro ao excluir documento.');
      }
    }
  };

  const filteredItems = items.filter(i => 
    i.description.toLowerCase().includes(searchQuery.toLowerCase())
  ).sort((a, b) => b.createdAt - a.createdAt);

  const getFileIcon = (url?: string) => {
    if (url?.toLowerCase().endsWith('.pdf')) {
        return <FileText className="w-8 h-8 text-red-500" />;
    }
    return <FileImage className="w-8 h-8 text-indigo-500" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-900">Gestão de Documentos</h2>
          <p className="text-sm text-gray-500">Centralize contratos, regulamentos e arquivos importantes do apartamento.</p>
        </div>
        <Button onClick={handleOpenModal} className="shadow-lg shadow-indigo-200 w-full md:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            Novo Documento
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input 
              type="text" 
              placeholder="Buscar documento por nome..." 
              className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
          />
      </div>

      {/* Grid de Documentos */}
      {isLoading ? (
          <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
      ) : filteredItems.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
              <Files className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Nenhum documento encontrado.</p>
              <p className="text-sm text-gray-400">Clique em "Novo Documento" para começar.</p>
          </div>
      ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredItems.map(item => (
                  <Card key={item.id} className="group hover:shadow-md transition-all duration-200 flex flex-col h-full border-gray-100">
                      <div className="flex items-start justify-between mb-4">
                          <div className="bg-gray-50 p-3 rounded-lg group-hover:bg-indigo-50 transition-colors">
                              {getFileIcon(item.receiptUrl)}
                          </div>
                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                  onClick={() => handleDelete(item.id)}
                                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Excluir"
                              >
                                  <Trash2 className="w-4 h-4" />
                              </button>
                          </div>
                      </div>
                      
                      <div className="flex-1">
                          <h3 className="font-semibold text-gray-800 line-clamp-2 mb-1" title={item.description}>
                              {item.description}
                          </h3>
                          <div className="flex items-center gap-1 text-xs text-gray-400 mb-4">
                              <CalendarDays className="w-3 h-3" />
                              {new Date(item.date).toLocaleDateString('pt-BR')}
                          </div>
                      </div>

                      <div className="pt-4 border-t border-gray-50 mt-auto">
                          {item.receiptUrl ? (
                              <a 
                                  href={item.receiptUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="flex items-center justify-center gap-2 w-full py-2 bg-indigo-50 text-indigo-600 rounded-lg text-sm font-medium hover:bg-indigo-100 transition-colors"
                              >
                                  <ExternalLink className="w-4 h-4" /> Visualizar Arquivo
                              </a>
                          ) : (
                              <button disabled className="w-full py-2 bg-gray-100 text-gray-400 rounded-lg text-sm cursor-not-allowed">
                                  Arquivo Indisponível
                              </button>
                          )}
                      </div>
                  </Card>
              ))}
          </div>
      )}

      {/* Modal de Upload */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !isSaving && setIsModalOpen(false)}
        title="Adicionar Documentos"
      >
        <form onSubmit={handleSave} className="space-y-6">
          <Input
            label="Título do Documento"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Contrato de Compra e Venda"
            required
            disabled={isSaving}
          />

          <div className={`bg-gray-50 p-6 rounded-xl border-2 border-dashed transition-colors text-center ${selectedFiles.length > 0 ? 'border-indigo-400 bg-indigo-50/30' : 'border-gray-200 hover:border-indigo-300'}`}>
             <div className="mb-4 flex justify-center">
                 <div className="p-3 bg-white rounded-full shadow-sm">
                     <Download className="w-6 h-6 text-indigo-500" />
                 </div>
             </div>
             
             <label htmlFor="file-upload" className="cursor-pointer">
                 <span className="block font-medium text-indigo-600 hover:text-indigo-800 mb-1">
                     Clique para selecionar arquivos
                 </span>
                 <span className="block text-xs text-gray-400">
                     PDF, JPG ou PNG (Você pode selecionar vários)
                 </span>
                 <input
                    id="file-upload"
                    type="file"
                    accept="image/*,.pdf"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                    disabled={isSaving}
                 />
             </label>
          </div>

          {/* Lista de Arquivos Selecionados */}
          {selectedFiles.length > 0 && (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Arquivos selecionados ({selectedFiles.length})</p>
                  {selectedFiles.map((file, index) => (
                      <div key={index} className="p-3 bg-white rounded-lg border border-gray-200 flex items-center gap-3 text-left group">
                          {file.type.includes('pdf') ? (
                              <FileText className="w-6 h-6 text-red-500 flex-shrink-0" />
                          ) : (
                              <FileImage className="w-6 h-6 text-indigo-500 flex-shrink-0" />
                          )}
                          <div className="flex-1 overflow-hidden">
                              <p className="text-sm font-medium text-gray-700 truncate">{file.name}</p>
                              <p className="text-[10px] text-gray-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                          </div>
                          {!isSaving && (
                              <button 
                                type="button"
                                onClick={() => removeFile(index)}
                                className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                              >
                                  <X className="w-4 h-4" />
                              </button>
                          )}
                      </div>
                  ))}
              </div>
          )}

          {/* Barra de Progresso durante salvamento */}
          {isSaving && (
              <div className="space-y-2">
                  <div className="flex justify-between text-xs font-medium text-indigo-600">
                      <span>Enviando arquivos...</span>
                      <span>{uploadProgress.current} de {uploadProgress.total}</span>
                  </div>
                  <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-indigo-500 h-full transition-all duration-300"
                        style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                      ></div>
                  </div>
              </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} disabled={isSaving} className="w-full sm:w-auto">
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving || selectedFiles.length === 0} className="w-full sm:w-auto">
              {isSaving ? (
                  <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Processando...
                  </span>
              ) : `Salvar ${selectedFiles.length > 1 ? selectedFiles.length + ' Arquivos' : 'Documento'}`}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};