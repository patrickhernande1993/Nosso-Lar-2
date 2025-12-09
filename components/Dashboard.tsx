import React, { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { StorageService } from '../services/storage';
import { ExpenseType } from '../types';
import { Card } from './UI';

const COLORS = ['#4F46E5', '#10B981', '#F59E0B'];

export const Dashboard: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const items = StorageService.getAll();
    
    const installments = items.filter(i => i.type === ExpenseType.INSTALLMENT).reduce((acc, c) => acc + c.amount, 0);
    const notes = items.filter(i => i.type === ExpenseType.NOTE).reduce((acc, c) => acc + c.amount, 0);
    const fees = items.filter(i => i.type === ExpenseType.FEE).reduce((acc, c) => acc + c.amount, 0);

    setTotal(installments + notes + fees);

    setData([
      { name: 'Parcelas', value: installments, type: ExpenseType.INSTALLMENT },
      { name: 'Notas Promissórias', value: notes, type: ExpenseType.NOTE },
      { name: 'Taxas de Condomínio', value: fees, type: ExpenseType.FEE },
    ]);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Visão Geral</h2>
        <p className="text-gray-500">Resumo financeiro do condomínio.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
            <h3 className="text-lg font-semibold mb-4">Distribuição de Despesas</h3>
            <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} layout="vertical" margin={{ left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" width={140} tick={{fontSize: 12}} />
                        <Tooltip 
                            formatter={(value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </Card>

        <Card>
            <h3 className="text-lg font-semibold mb-4">Total Consolidado</h3>
            <div className="h-48 w-full flex items-center justify-center relative">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)} />
                    </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="font-bold text-gray-700">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format(total)}
                    </span>
                </div>
            </div>
            <div className="space-y-3 mt-4">
                {data.map((item, idx) => (
                    <div key={item.name} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx] }}></div>
                            <span className="text-gray-600">{item.name}</span>
                        </div>
                        <span className="font-medium">
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
