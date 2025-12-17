import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Menu, X, Home, FileText, CreditCard, DollarSign, Building2, Sofa, Zap, ChevronDown, ChevronRight, HeartHandshake, MapPin, Utensils, Camera, Flower2, GlassWater, ClipboardList, Heart, Users, FolderOpen, Landmark } from 'lucide-react';
import { ExpenseType, NavigationItem } from '../types';

const NAV_ITEMS: NavigationItem[] = [
  { 
    label: 'Visão Geral', 
    path: '/', 
    icon: <Home className="w-5 h-5" /> 
  },
  {
    label: 'Apartamento',
    icon: <Building2 className="w-5 h-5" />,
    children: [
      { label: 'Financiamento Ap.', path: '/installments', icon: <CreditCard className="w-4 h-4" />, type: ExpenseType.INSTALLMENT },
      { label: 'Notas Promissórias', path: '/notes', icon: <FileText className="w-4 h-4" />, type: ExpenseType.NOTE },
      { label: 'Taxas de Condomínio', path: '/fees', icon: <DollarSign className="w-4 h-4" />, type: ExpenseType.FEE },
      { label: 'IPTU', path: '/iptu', icon: <Landmark className="w-4 h-4" />, type: ExpenseType.IPTU },
      { label: 'Móveis Planejados', path: '/furniture', icon: <Sofa className="w-4 h-4" />, type: ExpenseType.FURNITURE },
      { label: 'Energia Elétrica', path: '/utilities', icon: <Zap className="w-4 h-4" />, type: ExpenseType.UTILITIES },
      { label: 'Gestão de Documentos', path: '/documents', icon: <FolderOpen className="w-4 h-4" />, type: ExpenseType.DOCUMENT },
    ]
  },
  {
    label: 'Casamento',
    icon: <HeartHandshake className="w-5 h-5" />,
    children: [
      { label: 'Lista de Convidados', path: '/guests', icon: <Users className="w-4 h-4" /> },
      { label: 'Espaço Evento', path: '/event-space', icon: <MapPin className="w-4 h-4" />, type: ExpenseType.EVENT_SPACE },
      { label: 'Buffet', path: '/buffet', icon: <Utensils className="w-4 h-4" />, type: ExpenseType.BUFFET },
      { label: 'Cerimonialista', path: '/ceremonialist', icon: <ClipboardList className="w-4 h-4" />, type: ExpenseType.CEREMONIALIST },
      { label: 'Fotógrafo', path: '/photographer', icon: <Camera className="w-4 h-4" />, type: ExpenseType.PHOTOGRAPHER },
      { label: 'Decoração', path: '/decoration', icon: <Flower2 className="w-4 h-4" />, type: ExpenseType.DECORATION },
      { label: 'Bar sem álcool', path: '/bar', icon: <GlassWater className="w-4 h-4" />, type: ExpenseType.NON_ALCOHOLIC_BAR },
    ]
  }
];

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({ 'Apartamento': true, 'Casamento': true });
  const location = useLocation();

  const toggleMenu = (label: string) => {
    setExpandedMenus(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const getPageTitle = () => {
    for (const item of NAV_ITEMS) {
      if (item.path === location.pathname) return item.label;
      if (item.children) {
        const child = item.children.find(c => c.path === location.pathname);
        if (child) return child.label;
      }
    }
    return '❤️ Nosso Lar';
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans text-slate-800 overflow-hidden">
      {/* Mobile Header */}
      <div className="md:hidden bg-white border-b border-gray-100 p-4 flex justify-between items-center sticky top-0 z-40 shadow-sm h-16 flex-shrink-0">
        <h1 className="font-bold text-indigo-900 text-lg flex items-center gap-2">
            <Heart className="w-5 h-5 text-red-500 fill-red-500" /> Nosso Lar
        </h1>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-gray-500 hover:bg-gray-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-100">
          {isSidebarOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Sidebar */}
      <aside 
        className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-100 
          transform transition-transform duration-300 ease-in-out 
          md:translate-x-0 md:relative md:h-screen
          flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.02)]
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Header da Sidebar (Fixo no Topo) */}
        <div className="p-6 border-b border-dashed border-gray-100 flex items-center gap-3 h-20 flex-shrink-0">
            <div className="bg-indigo-50 rounded-xl p-2">
                <Heart className="text-red-500 fill-red-500 w-6 h-6" />
            </div>
            <div>
                <h2 className="text-lg font-bold text-gray-900 leading-tight">Nosso Lar</h2>
                <p className="text-xs text-gray-400 font-medium">Gestão Financeira</p>
            </div>
            {/* Close button inside sidebar for mobile */}
            <button onClick={() => setIsSidebarOpen(false)} className="md:hidden ml-auto text-gray-400">
                <X className="w-5 h-5" />
            </button>
        </div>

        {/* Navegação (Flexível com Scroll) */}
        <nav className="p-4 space-y-1 flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200">
          {NAV_ITEMS.map((item) => {
            if (item.children) {
              const isExpanded = expandedMenus[item.label];
              const isChildActive = item.children.some(child => child.path === location.pathname);

              return (
                <div key={item.label} className="mb-2">
                  <button
                    onClick={() => toggleMenu(item.label)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 group ${
                      isChildActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-gray-50 hover:text-indigo-600'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`${isChildActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-indigo-500'}`}>
                        {item.icon}
                      </span>
                      <span className="font-medium">{item.label}</span>
                    </div>
                    {isExpanded ? <ChevronDown className="w-4 h-4 opacity-50" /> : <ChevronRight className="w-4 h-4 opacity-50" />}
                  </button>
                  
                  {isExpanded && (
                    <div className="mt-1 ml-4 pl-4 border-l border-gray-100 space-y-1">
                      {item.children.map(child => (
                        <NavLink
                          key={child.path}
                          to={child.path!}
                          onClick={() => setIsSidebarOpen(false)}
                          className={({ isActive }) =>
                            `flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition-all duration-200 group ${
                              isActive 
                                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' 
                                : 'text-slate-500 hover:bg-indigo-50 hover:text-indigo-600'
                            }`
                          }
                        >
                          {({ isActive }) => (
                              <>
                                <span className={`transition-colors ${isActive ? 'text-indigo-100' : 'text-slate-300 group-hover:text-indigo-400'}`}>
                                    {child.icon}
                                </span>
                                <span className="font-medium">{child.label}</span>
                              </>
                          )}
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              );
            } else {
              return (
                <NavLink
                  key={item.path}
                  to={item.path!}
                  onClick={() => setIsSidebarOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group mb-2 ${
                      isActive 
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' 
                        : 'text-slate-500 hover:bg-gray-50 hover:text-indigo-600'
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
              );
            }
          })}
          
          {/* Espaçamento extra no final para garantir scroll confortável */}
          <div className="h-4"></div>
        </nav>
        
        {/* Rodapé da Sidebar (Fixo no Fundo do Flex) */}
        <div className="p-6 border-t border-gray-50 bg-white flex-shrink-0 z-30">
            <div className="bg-indigo-50 rounded-lg p-4 text-center">
                <p className="text-xs text-indigo-400 font-medium">Patrick & Isabelly ❤️</p>
                <p className="text-[10px] text-indigo-300 mt-1">Feito com carinho</p>
            </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto h-[calc(100vh-64px)] md:h-screen w-full">
        <div className="max-w-6xl mx-auto pb-20 md:pb-0">
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
             
             {/* Mobile Page Title */}
             <div className="md:hidden mb-6">
                <h1 className="text-xl font-bold text-slate-800">{getPageTitle()}</h1>
             </div>

             {children}
        </div>
      </main>
    </div>
  );
};