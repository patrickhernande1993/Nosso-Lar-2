import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Menu, X, Home, FileText, CreditCard, DollarSign, Heart } from 'lucide-react';
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
    return item ? item.label : '❤️ Nosso Lar';
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans text-slate-800">
      {/* Mobile Header */}
      <div className="md:hidden bg-white border-b border-gray-100 p-4 flex justify-between items-center sticky top-0 z-20 shadow-sm">
        <h1 className="font-bold text-indigo-900 text-lg flex items-center gap-2">
            <Heart className="w-5 h-5 text-red-500 fill-red-500" /> Nosso Lar
        </h1>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-gray-500 hover:bg-gray-50 rounded-lg">
          {isSidebarOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Sidebar */}
      <aside 
        className={`
          fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-100 transform transition-transform duration-200 ease-in-out md:translate-x-0 md:static md:flex-shrink-0 shadow-[4px_0_24px_rgba(0,0,0,0.02)]
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="p-6 border-b border-dashed border-gray-100 flex items-center gap-3">
            <div className="bg-indigo-50 rounded-xl p-2">
                <Heart className="text-red-500 fill-red-500 w-6 h-6" />
            </div>
            <div>
                <h2 className="text-lg font-bold text-gray-900 leading-tight">Nosso Lar</h2>
                <p className="text-xs text-gray-400 font-medium">Gestão Financeira</p>
            </div>
        </div>

        <nav className="p-4 space-y-2 mt-2">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setIsSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                  isActive 
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' 
                    : 'text-slate-500 hover:bg-indigo-50 hover:text-indigo-600'
                }`
              }
            >
              {({ isActive }) => (
                  <>
                    <span className={`transition-colors ${isActive ? 'text-indigo-100' : 'text-slate-400 group-hover:text-indigo-500'}`}>
                        {item.icon}
                    </span>
                    <span className="font-medium">{item.label}</span>
                  </>
              )}
            </NavLink>
          ))}
        </nav>
        
        <div className="absolute bottom-0 w-full p-6 border-t border-gray-50">
            <div className="bg-indigo-50 rounded-lg p-4 text-center">
                <p className="text-xs text-indigo-400 font-medium">Sistema v1.1</p>
                <p className="text-[10px] text-indigo-300 mt-1">Feito com carinho</p>
            </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/20 z-20 md:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto h-[calc(100vh-64px)] md:h-screen">
        <div className="max-w-6xl mx-auto">
             {/* Breadcrumb style header for Desktop */}
             <div className="hidden md:flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">{getPageTitle()}</h1>
                    <p className="text-sm text-slate-400">Bem-vindo de volta ao seu painel.</p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-green-500"></span>
                    <span className="text-xs font-medium text-slate-500">Sistema Online</span>
                </div>
             </div>
             {children}
        </div>
      </main>
    </div>
  );
};