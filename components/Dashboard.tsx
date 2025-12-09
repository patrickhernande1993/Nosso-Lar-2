import React, { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Loader2 } from 'lucide-react';
import { StorageService } from '../services/storage';
import { ExpenseType } from '../types';
import { Card } from './UI';

const COLORS = ['#6366f1', '#10b981', '#f59e0b']; // Indigo-500, Emerald-500, Amber-500 (Cores mais vivas)

export const Dashboard: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const items = await StorageService.getAll();
        
        const installments = items.filter(i => i.type === ExpenseType.INSTALLMENT).reduce((acc, c) => acc + c.amount, 0);
        const notes = items.filter(i => i.type === ExpenseType.NOTE).reduce((acc, c) => acc + c.amount, 0);
        const fees = items.filter(i => i.type === ExpenseType.FEE).reduce((acc, c) => acc + c.amount, 0);

        setTotal(installments + notes + fees);

        setData([
          { name: 'Parcelas', value: installments, type: ExpenseType.INSTALLMENT },
          { name: 'Notas Promissórias', value: notes, type: ExpenseType.NOTE },
          { name: 'Taxas de Condomínio', value: fees, type: ExpenseType.FEE },
        ]);
      } catch (e) {
        console.error("Error loading dashboard", e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  if (isLoading) {
      return (
          <div className="flex h-64 w-full items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
      );
  }

  return (
    <div className="space-y-6">
      {/* Mobile Title (Duplicate of Layout but for flow, only visible on mobile inside content if needed, but Layout handles it. Keeping generic structure) */}
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-indigo-50 shadow-indigo-100">
            <h3 className="text-lg font-bold text-slate-800 mb-1">Distribuição de Despesas</h3>
            <p className="text-sm text-slate-400 mb-6">Visualização comparativa por categoria</p>
            <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} layout="vertical" margin={{ left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" width={140} tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false} />
                        <Tooltip 
                            cursor={{fill: '#f8fafc'}}
                            formatter={(value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)}
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        />
                        <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={32}>
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </Card>

        <Card className="border-indigo-50 shadow-indigo-100">
            <h3 className="text-lg font-bold text-slate-800 mb-1">Total Consolidado</h3>
            <p className="text-sm text-slate-400 mb-6">Soma de todas as categorias</p>
            <div className="h-48 w-full flex items-center justify-center relative">
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
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)} />
                    </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none flex-col">
                    <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Total</span>
                    <span className="font-bold text-2xl text-slate-800">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format(total)}
                    </span>
                </div>
            </div>
            <div className="space-y-4 mt-6">
                {data.map((item, idx) => (
                    <div key={item.name} className="flex items-center justify-between text-sm group">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full ring-2 ring-offset-1 ring-white" style={{ backgroundColor: COLORS[idx] }}></div>
                            <span className="text-slate-500 group-hover:text-slate-700 transition-colors">{item.name}</span>
                        </div>
                        <span className="font-semibold text-slate-700 bg-slate-50 px-2 py-1 rounded-md">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.value)}
                        </span>
                    </div>
                ))}
            </div>
        </Card>
      </div>
    </div>
  );
};