import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Menu, X, Home, FileText, CreditCard, DollarSign } from 'lucide-react';
import { ExpenseType } from '../types';

const NAV_ITEMS = [
  { label: 'Visão Geral', path: '/', icon: <Home className="w-5 h-5" /> },
  { label: 'Parcelas', path: '/installments', icon: <CreditCard className="w-5 h-5" />, type: ExpenseType.INSTALLMENT },
  { label: 'Notas Promissórias', path: '/notes', icon: <FileText className="w-5 h-5" />, type: ExpenseType.NOTE },
  { label: 'Taxas de Condomínio', path: '/fees', icon: <DollarSign className="w-5 h-5" />, type: ExpenseType.FEE },
];

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();

  const getPageTitle = () => {
    const item = NAV_ITEMS.find(i => i.path === location.pathname);
    return item ? item.label : 'Gestão de Condomínio';
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden bg-white border-b border-gray-200 p-4 flex justify-between items-center sticky top-0 z-20">
        <h1 className="font-semibold text-gray-800">{getPageTitle()}</h1>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-gray-600">
          {isSidebarOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Sidebar */}
      <aside 
        className={`
          fixed inset-y-0 left-0 z-30 w-64 bg-slate-900 text-white transform transition-transform duration-200 ease-in-out md:translate-x-0 md:static md:flex-shrink-0
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="p-6 border-b border-slate-800 flex items-center gap-2">
            <div className="bg-indigo-500 rounded-lg p-1">
                <Home className="text-white w-6 h-6" />
            </div>
            <div>
                <h2 className="text-lg font-bold">CondoManager</h2>
                <p className="text-xs text-slate-400">Gestão Simples</p>
            </div>
        </div>

        <nav className="p-4 space-y-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setIsSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive 
                    ? 'bg-indigo-600 text-white' 
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              {item.icon}
              <span className="font-medium">{item.label}</span>
            </NavLink>
          ))}
        </nav>
        
        <div className="absolute bottom-0 w-full p-4 border-t border-slate-800">
            <p className="text-xs text-center text-slate-500">v1.0.0 - Dados Locais</p>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto h-[calc(100vh-64px)] md:h-screen">
        <div className="max-w-6xl mx-auto">
             {children}
        </div>
      </main>
    </div>
  );
};
