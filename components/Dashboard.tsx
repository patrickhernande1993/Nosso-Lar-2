import React, { useEffect, useState, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Loader2, Building2, HeartHandshake, Filter, Calendar, XCircle, ChevronDown, CheckCircle2, Clock } from 'lucide-react';
import { StorageService } from '../services/storage';
import { ExpenseType, ExpenseItem } from '../types';
import { Card } from './UI';

// Paleta de Cores Apartamento (Tons Frios/Neutros)
const APT_COLORS = [
  '#6366f1', // Indigo (Parcelas)
  '#10b981', // Emerald (Notas)
  '#f59e0b', // Amber (Taxas)
  '#ec4899', // Pink (Móveis)
  '#3b82f6', // Blue (Energia)
];

// Paleta de Cores Casamento (Tons Quentes/Vibrantes)
const WED_COLORS = [
  '#ef4444', // Red (Espaço)
  '#f97316', // Orange (Buffet)
  '#eab308', // Yellow (Cerimonialista)
  '#14b8a6', // Teal (Fotógrafo)
  '#8b5cf6', // Violet (Decoração)
  '#06b6d4', // Cyan (Bar)
];

const MONTHS = [
  { value: '01', label: 'Janeiro' },
  { value: '02', label: 'Fevereiro' },
  { value: '03', label: 'Março' },
  { value: '04', label: 'Abril' },
  { value: '05', label: 'Maio' },
  { value: '06', label: 'Junho' },
  { value: '07', label: 'Julho' },
  { value: '08', label: 'Agosto' },
  { value: '09', label: 'Setembro' },
  { value: '10', label: 'Outubro' },
  { value: '11', label: 'Novembro' },
  { value: '12', label: 'Dezembro' },
];

const APT_TYPES = [ExpenseType.INSTALLMENT, ExpenseType.NOTE, ExpenseType.FEE, ExpenseType.FURNITURE, ExpenseType.UTILITIES];
const WED_TYPES = [ExpenseType.EVENT_SPACE, ExpenseType.BUFFET, ExpenseType.CEREMONIALIST, ExpenseType.PHOTOGRAPHER, ExpenseType.DECORATION, ExpenseType.NON_ALCOHOLIC_BAR];

interface ChartData {
  name: string;
  value: number;
  type: ExpenseType;
}

interface FinancialSummary {
  total: number;
  paid: number;
  pending: number;
}

export const Dashboard: React.FC = () => {
  const [allItems, setAllItems] = useState<ExpenseItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Novos estados para filtros separados
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');

  // Carregar dados brutos
  useEffect(() => {
    const fetchData = async () => {
      try {
        const items = await StorageService.getAll();
        setAllItems(items);
      } catch (e) {
        console.error("Error loading dashboard", e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Extrair anos disponíveis dos dados
  const availableYears = useMemo(() => {
    const years = new Set(allItems.map(item => item.date.split('-')[0]));
    return Array.from(years).sort().reverse();
  }, [allItems]);

  // Calcular totais e dados dos gráficos com base nos filtros
  const { 
    aptData, aptSummary, 
    wedData, wedSummary, 
    displayDate 
  } = useMemo(() => {
    // Lógica de filtragem
    const filteredItems = allItems.filter(item => {
      const [itemYear, itemMonth] = item.date.split('-');
      
      const matchYear = selectedYear ? itemYear === selectedYear : true;
      const matchMonth = selectedMonth ? itemMonth === selectedMonth : true;
      
      return matchYear && matchMonth;
    });

    // Texto descritivo para o gráfico
    let dateText = 'Visualização geral acumulada';
    if (selectedYear && selectedMonth) {
      const monthName = MONTHS.find(m => m.value === selectedMonth)?.label;
      dateText = `Visualização de ${monthName} de ${selectedYear}`;
    } else if (selectedYear) {
      dateText = `Visualização do ano de ${selectedYear}`;
    } else if (selectedMonth) {
      const monthName = MONTHS.find(m => m.value === selectedMonth)?.label;
      dateText = `Visualização de todos os meses de ${monthName}`;
    }

    // --- CÁLCULOS APARTAMENTO ---
    const aptItems = filteredItems.filter(i => APT_TYPES.includes(i.type));
    
    // Totais por categoria (Gráfico)
    const installments = aptItems.filter(i => i.type === ExpenseType.INSTALLMENT).reduce((acc, c) => acc + c.amount, 0);
    const notes = aptItems.filter(i => i.type === ExpenseType.NOTE).reduce((acc, c) => acc + c.amount, 0);
    const fees = aptItems.filter(i => i.type === ExpenseType.FEE).reduce((acc, c) => acc + c.amount, 0);
    const furniture = aptItems.filter(i => i.type === ExpenseType.FURNITURE).reduce((acc, c) => acc + c.amount, 0);
    const utilities = aptItems.filter(i => i.type === ExpenseType.UTILITIES).reduce((acc, c) => acc + c.amount, 0);

    // Resumo Financeiro (Pago vs Pendente)
    const aptPaid = aptItems.filter(i => i.status === 'PAID').reduce((acc, c) => acc + c.amount, 0);
    const aptPending = aptItems.filter(i => i.status === 'PENDING').reduce((acc, c) => acc + c.amount, 0);
    const aptTotalCalc = aptPaid + aptPending;

    const aptChartData = [
      { name: 'Financiamento Ap.', value: installments, type: ExpenseType.INSTALLMENT },
      { name: 'Notas Promissórias', value: notes, type: ExpenseType.NOTE },
      { name: 'Taxas de Condomínio', value: fees, type: ExpenseType.FEE },
      { name: 'Móveis Planejados', value: furniture, type: ExpenseType.FURNITURE },
      { name: 'Energia Elétrica', value: utilities, type: ExpenseType.UTILITIES },
    ].filter(item => item.value > 0);

    // --- CÁLCULOS CASAMENTO ---
    const wedItems = filteredItems.filter(i => WED_TYPES.includes(i.type));

    // Totais por categoria (Gráfico)
    const eventSpace = wedItems.filter(i => i.type === ExpenseType.EVENT_SPACE).reduce((acc, c) => acc + c.amount, 0);
    const buffet = wedItems.filter(i => i.type === ExpenseType.BUFFET).reduce((acc, c) => acc + c.amount, 0);
    const ceremonialist = wedItems.filter(i => i.type === ExpenseType.CEREMONIALIST).reduce((acc, c) => acc + c.amount, 0);
    const photographer = wedItems.filter(i => i.type === ExpenseType.PHOTOGRAPHER).reduce((acc, c) => acc + c.amount, 0);
    const decoration = wedItems.filter(i => i.type === ExpenseType.DECORATION).reduce((acc, c) => acc + c.amount, 0);
    const bar = wedItems.filter(i => i.type === ExpenseType.NON_ALCOHOLIC_BAR).reduce((acc, c) => acc + c.amount, 0);

    // Resumo Financeiro (Pago vs Pendente)
    const wedPaid = wedItems.filter(i => i.status === 'PAID').reduce((acc, c) => acc + c.amount, 0);
    const wedPending = wedItems.filter(i => i.status === 'PENDING').reduce((acc, c) => acc + c.amount, 0);
    const wedTotalCalc = wedPaid + wedPending;

    const wedChartData = [
      { name: 'Espaço Evento', value: eventSpace, type: ExpenseType.EVENT_SPACE },
      { name: 'Buffet', value: buffet, type: ExpenseType.BUFFET },
      { name: 'Cerimonialista', value: ceremonialist, type: ExpenseType.CEREMONIALIST },
      { name: 'Fotógrafo', value: photographer, type: ExpenseType.PHOTOGRAPHER },
      { name: 'Decoração', value: decoration, type: ExpenseType.DECORATION },
      { name: 'Bar sem álcool', value: bar, type: ExpenseType.NON_ALCOHOLIC_BAR },
    ].filter(item => item.value > 0);

    return {
      aptData: aptChartData,
      aptSummary: { total: aptTotalCalc, paid: aptPaid, pending: aptPending },
      wedData: wedChartData,
      wedSummary: { total: wedTotalCalc, paid: wedPaid, pending: wedPending },
      displayDate: dateText
    };
  }, [allItems, selectedYear, selectedMonth]);

  const renderSection = (title: string, icon: React.ReactNode, data: ChartData[], summary: FinancialSummary, colors: string[]) => {
    const paidPercentage = summary.total > 0 ? (summary.paid / summary.total) * 100 : 0;
    
    return (
    <div className="space-y-4 mb-10">
      <div className="flex items-center gap-2 mb-2">
        <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
          {icon}
        </div>
        <h2 className="text-xl font-bold text-gray-800">{title}</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* GRÁFICO DE BARRAS */}
        <Card className="lg:col-span-2 border-indigo-50 shadow-indigo-100">
            <h3 className="text-lg font-bold text-slate-800 mb-1">Distribuição de Despesas</h3>
            <p className="text-sm text-slate-400 mb-6">
               {displayDate}
            </p>
            <div className="h-60 md:h-72 w-full">
                {data.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} layout="vertical" margin={{ left: 0, right: 30 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                            <XAxis type="number" hide />
                            <YAxis 
                                dataKey="name" 
                                type="category" 
                                width={120} 
                                tick={{fontSize: 11, fill: '#64748b'}} 
                                axisLine={false} 
                                tickLine={false} 
                            />
                            <Tooltip 
                                cursor={{fill: '#f8fafc'}}
                                formatter={(value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)}
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                            />
                            <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={20}>
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex items-center justify-center text-gray-400 text-sm flex-col gap-2">
                        <Filter className="w-8 h-8 opacity-20" />
                        Nenhum registro encontrado para este período.
                    </div>
                )}
            </div>
        </Card>

        {/* GRÁFICO DE PIZZA (TOTAL) + RESUMO FINANCEIRO */}
        <Card className="border-indigo-50 shadow-indigo-100 flex flex-col">
            <div className="mb-4">
                <h3 className="text-lg font-bold text-slate-800 mb-1">Total Consolidado</h3>
                <p className="text-sm text-slate-400">{title}</p>
            </div>
            
            <div className="h-48 w-full flex items-center justify-center relative flex-shrink-0">
                {summary.total > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                                stroke="none"
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                                ))}
                            </Pie>
                            <Tooltip formatter={(value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)} />
                        </PieChart>
                    </ResponsiveContainer>
                ) : (
                     <div className="h-32 w-32 rounded-full border-4 border-gray-100 flex items-center justify-center">
                         <span className="text-gray-300">R$ 0</span>
                     </div>
                )}
                
                {summary.total > 0 && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none flex-col">
                        <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Total</span>
                        <span className="font-bold text-2xl text-slate-800">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format(summary.total)}
                        </span>
                    </div>
                )}
            </div>

            {/* SEÇÃO DE SALDO (NOVO) */}
            {summary.total > 0 && (
                <div className="mt-4 pt-4 border-t border-dashed border-gray-100">
                    <div className="flex justify-between items-center text-xs text-gray-500 mb-1.5">
                        <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-500"/> Pago ({Math.round(paidPercentage)}%)</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-amber-500"/> Falta Pagar</span>
                    </div>
                    
                    {/* Barra de Progresso */}
                    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden flex mb-3">
                        <div 
                            className="bg-green-500 h-full transition-all duration-500" 
                            style={{ width: `${paidPercentage}%` }}
                        />
                        <div 
                            className="bg-amber-400 h-full transition-all duration-500" 
                            style={{ width: `${100 - paidPercentage}%` }}
                        />
                    </div>

                    <div className="flex justify-between items-end">
                        <div>
                            <span className="block text-[10px] text-gray-400 uppercase font-semibold">Quitado</span>
                            <span className="text-sm font-bold text-green-600">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(summary.paid)}
                            </span>
                        </div>
                        <div className="text-right">
                             <span className="block text-[10px] text-gray-400 uppercase font-semibold">Saldo Devedor</span>
                            <span className="text-sm font-bold text-amber-600">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(summary.pending)}
                            </span>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Lista de Categorias (Scrollável se necessário) */}
            <div className="space-y-3 mt-4 pt-4 border-t border-gray-50 flex-1 overflow-y-auto max-h-40 scrollbar-thin scrollbar-thumb-gray-100">
                {data.map((item, idx) => (
                    <div key={item.name} className="flex items-center justify-between text-sm group">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full ring-2 ring-offset-1 ring-white" style={{ backgroundColor: colors[idx % colors.length] }}></div>
                            <span className="text-slate-500 text-xs truncate max-w-[120px]">{item.name}</span>
                        </div>
                        <span className="font-semibold text-slate-700 bg-slate-50 px-1.5 py-0.5 rounded text-xs">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.value)}
                        </span>
                    </div>
                ))}
            </div>
        </Card>
      </div>
    </div>
  );
  }

  if (isLoading) {
      return (
          <div className="flex h-64 w-full items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
      );
  }

  return (
    <div className="pb-10">
      {/* Barra de Filtro */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-gray-700 w-full md:w-auto">
            <div className="bg-indigo-50 p-2 rounded-lg">
                <Filter className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
                <span className="block font-medium text-sm">Filtrar Período</span>
                <span className="text-xs text-gray-400">Selecione ano e/ou mês</span>
            </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
            {/* Seletor de Mês */}
            <div className="relative w-full sm:w-40">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Calendar className="h-4 w-4 text-gray-400" />
                </div>
                <select 
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="appearance-none pl-10 pr-8 py-2 w-full bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
                >
                    <option value="">Todos os meses</option>
                    {MONTHS.map(m => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                </select>
                <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none">
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                </div>
            </div>

            {/* Seletor de Ano */}
            <div className="relative w-full sm:w-32">
                 <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Calendar className="h-4 w-4 text-gray-400" />
                </div>
                <select 
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="appearance-none pl-10 pr-8 py-2 w-full bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
                >
                    <option value="">Todos os anos</option>
                    {availableYears.map(year => (
                        <option key={year} value={year}>{year}</option>
                    ))}
                </select>
                <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none">
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                </div>
            </div>
            
            {(selectedYear || selectedMonth) && (
                <button 
                    onClick={() => { setSelectedYear(''); setSelectedMonth(''); }}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors w-full sm:w-auto flex justify-center"
                    title="Limpar Filtro"
                >
                    <XCircle className="w-5 h-5" />
                </button>
            )}
        </div>
      </div>

      {/* Seção Apartamento */}
      {renderSection(
        "Apartamento", 
        <Building2 className="w-6 h-6" />, 
        aptData, 
        aptSummary, 
        APT_COLORS
      )}

      {/* Divisor Visual */}
      <div className="border-t border-dashed border-gray-200 my-8"></div>

      {/* Seção Casamento */}
      {renderSection(
        "Casamento", 
        <HeartHandshake className="w-6 h-6" />, 
        wedData, 
        wedSummary, 
        WED_COLORS
      )}
    </div>
  );
};