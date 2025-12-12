import React, { useState, useEffect, useMemo } from 'react';
import { Users, User, Trash2, Plus, Search, Loader2 } from 'lucide-react';
import { Guest, GuestSide } from '../types';
import { GuestService } from '../services/guestStorage';
import { Button, Input, Card, Badge } from './UI';

export const GuestListModule: React.FC = () => {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Inputs
  const [newName, setNewName] = useState('');
  const [selectedSide, setSelectedSide] = useState<GuestSide>('BRIDE');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSide, setFilterSide] = useState<'ALL' | GuestSide>('ALL');

  const loadGuests = async () => {
    setIsLoading(true);
    try {
      const data = await GuestService.getAll();
      setGuests(data);
    } catch (error) {
      console.error("Failed to load guests", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadGuests();
  }, []);

  const handleAddGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    setIsSaving(true);
    try {
      await GuestService.add(newName, selectedSide);
      setNewName('');
      // Recarrega para garantir sincronia
      await loadGuests(); 
    } catch (error: any) {
      alert('Erro ao adicionar convidado. Verifique se a tabela "guests" existe no Supabase.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Remover este convidado da lista?')) {
      try {
        await GuestService.delete(id);
        setGuests(prev => prev.filter(g => g.id !== id));
      } catch (error) {
        alert('Erro ao excluir.');
      }
    }
  };

  // Contadores
  const stats = useMemo(() => {
    const brideCount = guests.filter(g => g.side === 'BRIDE').length;
    const groomCount = guests.filter(g => g.side === 'GROOM').length;
    return {
      bride: brideCount,
      groom: groomCount,
      total: brideCount + groomCount
    };
  }, [guests]);

  // Filtragem da Lista
  const filteredGuests = useMemo(() => {
    return guests.filter(g => {
      const matchesSearch = g.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSide = filterSide === 'ALL' || g.side === filterSide;
      return matchesSearch && matchesSide;
    });
  }, [guests, searchQuery, filterSide]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Lista de Convidados</h2>
          <p className="text-sm text-gray-500">Gerencie a presença de familiares e amigos.</p>
        </div>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-none">
          <div className="flex items-center gap-3 mb-2 opacity-90">
            <Users className="w-5 h-5" />
            <span className="font-medium">Total Confirmado</span>
          </div>
          <div className="text-4xl font-bold">{stats.total}</div>
          <div className="text-xs mt-1 opacity-75">Convidados totais</div>
        </Card>

        <Card className="bg-white border-l-4 border-l-pink-500">
          <div className="flex items-center gap-2 mb-2 text-pink-600">
            <User className="w-4 h-4" />
            <span className="font-medium text-sm uppercase tracking-wide">Lista da Noiva</span>
          </div>
          <div className="flex items-end gap-2">
             <span className="text-3xl font-bold text-gray-800">{stats.bride}</span>
             <span className="text-xs text-gray-400 mb-1.5">pessoas</span>
          </div>
        </Card>

        <Card className="bg-white border-l-4 border-l-blue-500">
          <div className="flex items-center gap-2 mb-2 text-blue-600">
            <User className="w-4 h-4" />
            <span className="font-medium text-sm uppercase tracking-wide">Lista do Noivo</span>
          </div>
          <div className="flex items-end gap-2">
             <span className="text-3xl font-bold text-gray-800">{stats.groom}</span>
             <span className="text-xs text-gray-400 mb-1.5">pessoas</span>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Formulário de Adição */}
        <div className="lg:col-span-1">
            <Card className="sticky top-4">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <Plus className="w-4 h-4 text-indigo-500" /> Adicionar Convidado
                </h3>
                <form onSubmit={handleAddGuest} className="space-y-4">
                    <Input 
                        label="Nome Completo" 
                        placeholder="Ex: Tia Maria"
                        value={newName}
                        onChange={e => setNewName(e.target.value)}
                        required
                    />
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Pertence à lista de:</label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setSelectedSide('BRIDE')}
                                className={`flex items-center justify-center gap-2 p-3 rounded-lg border transition-all ${
                                    selectedSide === 'BRIDE' 
                                    ? 'bg-pink-50 border-pink-500 text-pink-700 ring-1 ring-pink-500' 
                                    : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                                }`}
                            >
                                <span className="w-2 h-2 rounded-full bg-pink-500" /> Noiva
                            </button>
                            <button
                                type="button"
                                onClick={() => setSelectedSide('GROOM')}
                                className={`flex items-center justify-center gap-2 p-3 rounded-lg border transition-all ${
                                    selectedSide === 'GROOM' 
                                    ? 'bg-blue-50 border-blue-500 text-blue-700 ring-1 ring-blue-500' 
                                    : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                                }`}
                            >
                                <span className="w-2 h-2 rounded-full bg-blue-500" /> Noivo
                            </button>
                        </div>
                    </div>

                    <Button 
                        type="submit" 
                        disabled={isSaving || !newName.trim()} 
                        className="w-full justify-center mt-2"
                    >
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Cadastrar Convidado'}
                    </Button>
                </form>
            </Card>
        </div>

        {/* Lista de Convidados */}
        <div className="lg:col-span-2">
            <Card className="min-h-[500px] flex flex-col">
                {/* Filtros da Lista */}
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6 border-b border-gray-100 pb-4">
                    <div className="flex bg-gray-100 p-1 rounded-lg w-full sm:w-auto">
                        {(['ALL', 'BRIDE', 'GROOM'] as const).map(side => (
                            <button
                                key={side}
                                onClick={() => setFilterSide(side)}
                                className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all flex-1 sm:flex-none ${
                                    filterSide === side 
                                    ? 'bg-white text-gray-900 shadow-sm' 
                                    : 'text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                {side === 'ALL' ? 'Todos' : side === 'BRIDE' ? 'Noiva' : 'Noivo'}
                            </button>
                        ))}
                    </div>
                    
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input 
                            type="text" 
                            placeholder="Buscar nome..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        />
                    </div>
                </div>

                {/* Tabela/Lista */}
                <div className="flex-1 overflow-y-auto max-h-[500px] pr-1">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                            <Loader2 className="w-6 h-6 animate-spin mb-2" />
                            <span className="text-sm">Carregando lista...</span>
                        </div>
                    ) : filteredGuests.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-40 text-gray-400 border-2 border-dashed border-gray-100 rounded-lg">
                            <Users className="w-8 h-8 mb-2 opacity-20" />
                            <span className="text-sm">Nenhum convidado encontrado.</span>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {filteredGuests.map((guest) => (
                                <div key={guest.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg border border-transparent hover:border-gray-100 transition-all group">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                                            guest.side === 'BRIDE' ? 'bg-pink-100 text-pink-600' : 'bg-blue-100 text-blue-600'
                                        }`}>
                                            {guest.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-800">{guest.name}</p>
                                            <span className={`text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded ${
                                                guest.side === 'BRIDE' ? 'bg-pink-50 text-pink-500' : 'bg-blue-50 text-blue-500'
                                            }`}>
                                                {guest.side === 'BRIDE' ? 'Noiva' : 'Noivo'}
                                            </span>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => handleDelete(guest.id)}
                                        className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                                        title="Remover"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </Card>
        </div>
      </div>
    </div>
  );
};