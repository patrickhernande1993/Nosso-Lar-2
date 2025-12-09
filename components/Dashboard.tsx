import React, { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Loader2, Building2, HeartHandshake } from 'lucide-react';
import { StorageService } from '../services/storage';
import { ExpenseType } from '../types';
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

interface ChartData {
  name: string;
  value: number;
  type: ExpenseType;
}

export const Dashboard: React.FC = () => {
  // Estados para Apartamento
  const [aptData, setAptData] = useState<ChartData[]>([]);
  const [aptTotal, setAptTotal] = useState(0);

  // Estados para Casamento
  const [wedData, setWedData] = useState<ChartData[]>([]);
  const [wedTotal, setWedTotal] = useState(0);

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const items = await StorageService.getAll();
        
        // --- CÁLCULOS APARTAMENTO ---
        const installments = items.filter(i => i.type === ExpenseType.INSTALLMENT).reduce((acc, c) => acc + c.amount, 0);
        const notes = items.filter(i => i.type === ExpenseType.NOTE).reduce((acc, c) => acc + c.amount, 0);
        const fees = items.filter(i => i.type === ExpenseType.FEE).reduce((acc, c) => acc + c.amount, 0);
        const furniture = items.filter(i => i.type === ExpenseType.FURNITURE).reduce((acc, c) => acc + c.amount, 0);
        const utilities = items.filter(i => i.type === ExpenseType.UTILITIES).reduce((acc, c) => acc + c.amount, 0);

        const aptTotalCalc = installments + notes + fees + furniture + utilities;
        setAptTotal(aptTotalCalc);

        setAptData([
          { name: 'Parcelas', value: installments, type: ExpenseType.INSTALLMENT },
          { name: 'Notas Promissórias', value: notes, type: ExpenseType.NOTE },
          { name: 'Taxas de Condomínio', value: fees, type: ExpenseType.FEE },
          { name: 'Móveis Planejados', value: furniture, type: ExpenseType.FURNITURE },
          { name: 'Energia Elétrica', value: utilities, type: ExpenseType.UTILITIES },
        ].filter(item => item.value > 0));

        // --- CÁLCULOS CASAMENTO ---
        const eventSpace = items.filter(i => i.type === ExpenseType.EVENT_SPACE).reduce((acc, c) => acc + c.amount, 0);
        const buffet = items.filter(i => i.type === ExpenseType.BUFFET).reduce((acc, c) => acc + c.amount, 0);
        const ceremonialist = items.filter(i => i.type === ExpenseType.CEREMONIALIST).reduce((acc, c) => acc + c.amount, 0);
        const photographer = items.filter(i => i.type === ExpenseType.PHOTOGRAPHER).reduce((acc, c) => acc + c.amount, 0);
        const decoration = items.filter(i => i.type === ExpenseType.DECORATION).reduce((acc, c) => acc + c.amount, 0);
        const bar = items.filter(i => i.type === ExpenseType.NON_ALCOHOLIC_BAR).reduce((acc, c) => acc + c.amount, 0);

        const wedTotalCalc = eventSpace + buffet + ceremonialist + photographer + decoration + bar;
        setWedTotal(wedTotalCalc);

        setWedData([
          { name: 'Espaço Evento', value: eventSpace, type: ExpenseType.EVENT_SPACE },
          { name: 'Buffet', value: buffet, type: ExpenseType.BUFFET },
          { name: 'Cerimonialista', value: ceremonialist, type: ExpenseType.CEREMONIALIST },
          { name: 'Fotógrafo', value: photographer, type: ExpenseType.PHOTOGRAPHER },
          { name: 'Decoração', value: decoration, type: ExpenseType.DECORATION },
          { name: 'Bar sem álcool', value: bar, type: ExpenseType.NON_ALCOHOLIC_BAR },
        ].filter(item => item.value > 0));

      } catch (e) {
        console.error("Error loading dashboard", e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const renderSection = (title: string, icon: React.ReactNode, data: ChartData[], total: number, colors: string[]) => (
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
            <p className="text-sm text-slate-400 mb-6">Visualização por categoria</p>
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
                    <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                        Nenhum registro nesta seção.
                    </div>
                )}
            </div>
        </Card>

        {/* GRÁFICO DE PIZZA (TOTAL) */}
        <Card className="border-indigo-50 shadow-indigo-100">
            <h3 className="text-lg font-bold text-slate-800 mb-1">Total Consolidado</h3>
            <p className="text-sm text-slate-400 mb-6">{title}</p>
            <div className="h-48 w-full flex items-center justify-center relative">
                {total > 0 ? (
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
                
                {total > 0 && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none flex-col">
                        <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Total</span>
                        <span className="font-bold text-2xl text-slate-800">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format(total)}
                        </span>
                    </div>
                )}
            </div>
            <div className="space-y-4 mt-6">
                {data.map((item, idx) => (
                    <div key={item.name} className="flex items-center justify-between text-sm group">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full ring-2 ring-offset-1 ring-white" style={{ backgroundColor: colors[idx % colors.length] }}></div>
                            <span className="text-slate-500 group-hover:text-slate-700 transition-colors truncate max-w-[150px]">{item.name}</span>
                        </div>
                        <span className="font-semibold text-slate-700 bg-slate-50 px-2 py-1 rounded-md text-xs">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.value)}
                        </span>
                    </div>
                ))}
            </div>
        </Card>
      </div>
    </div>
  );

  if (isLoading) {
      return (
          <div className="flex h-64 w-full items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
      );
  }

  return (
    <div className="pb-10">
      {/* Seção Apartamento */}
      {renderSection(
        "Apartamento", 
        <Building2 className="w-6 h-6" />, 
        aptData, 
        aptTotal, 
        APT_COLORS
      )}

      {/* Divisor Visual */}
      <div className="border-t border-dashed border-gray-200 my-8"></div>

      {/* Seção Casamento */}
      {renderSection(
        "Casamento", 
        <HeartHandshake className="w-6 h-6" />, 
        wedData, 
        wedTotal, 
        WED_COLORS
      )}
    </div>
  );
};