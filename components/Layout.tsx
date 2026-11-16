import React, { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Menu, X, LayoutDashboard, FolderOpen, Settings, type LucideIcon } from 'lucide-react';
import { categoryPath, getCategoryIcon } from '../lib/categories';
import { useCategories } from '../lib/CategoriesContext';
import logoLight from '../assets/logo-light.png';
import markLight from '../assets/mark-light.png';

interface NavEntry {
  label: string;
  path: string;
  icon: LucideIcon;
  dot?: string;
}

// Versão compacta para a barra do celular: marca (casa + I&P) + nome
const BrandCompact: React.FC = () => (
  <div className="flex items-center gap-3">
    <img src={markLight} alt="" className="h-10 w-auto" />
    <div className="border-l border-white/15 pl-3">
      <p className="text-[11px] font-semibold tracking-[0.3em] text-brand-50">NOSSO LAR</p>
      <p className="text-[10px] text-brand-200/60 mt-0.5 tracking-wide">Gestão do apartamento</p>
    </div>
  </div>
);

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  const { categories } = useCategories();

  useEffect(() => setIsSidebarOpen(false), [location.pathname]);

  const NAV_SECTIONS: { title?: string; items: NavEntry[] }[] = [
    { items: [{ label: 'Visão geral', path: '/', icon: LayoutDashboard }] },
    {
      title: 'Categorias',
      items: categories.map(c => ({ label: c.name, path: categoryPath(c.key), icon: getCategoryIcon(c.icon), dot: c.color })),
    },
    {
      title: 'Geral',
      items: [
        { label: 'Documentos', path: '/documents', icon: FolderOpen },
        { label: 'Configurações', path: '/configuracoes', icon: Settings },
      ],
    },
  ];

  return (
    <div className="min-h-screen md:h-screen flex flex-col md:flex-row md:overflow-hidden">
      {/* Mobile top bar */}
      <header className="md:hidden sticky top-0 z-40 h-16 flex items-center justify-between px-4 bg-brand-950 text-white">
        <BrandCompact />
        <button
          onClick={() => setIsSidebarOpen(v => !v)}
          aria-label={isSidebarOpen ? 'Fechar menu' : 'Abrir menu'}
          className="p-2 rounded-lg text-brand-100 hover:bg-white/10"
        >
          {isSidebarOpen ? <X /> : <Menu />}
        </button>
      </header>

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-brand-950 text-brand-100 flex flex-col
          transform transition-transform duration-300 ease-out
          md:relative md:translate-x-0 md:w-64 md:h-screen
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="relative flex-shrink-0 px-6 pt-5 pb-3 flex justify-center">
          <NavLink to="/" aria-label="Nosso Lar – Visão geral">
            <img src={logoLight} alt="I&P · Nosso Lar" className="w-[76px] h-auto" />
          </NavLink>
          <button onClick={() => setIsSidebarOpen(false)} aria-label="Fechar menu" className="md:hidden absolute top-4 right-4 text-brand-200/70">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto scroll-thin px-3 pb-6 space-y-6">
          {NAV_SECTIONS.map((section, i) => (
            <div key={i}>
              {section.title && (
                <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-brand-200/40">{section.title}</p>
              )}
              <div className="space-y-0.5">
                {section.items.map(item => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      end={item.path === '/'}
                      className={({ isActive }) =>
                        `group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                          isActive ? 'bg-white/10 text-white' : 'text-brand-100/70 hover:bg-white/5 hover:text-white'
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <Icon className={`w-[18px] h-[18px] ${isActive ? 'text-brand-200' : 'text-brand-200/50 group-hover:text-brand-200/80'}`} />
                          <span className="flex-1">{item.label}</span>
                          {item.dot && (
                            <span
                              className={`w-1.5 h-1.5 rounded-full transition-opacity ${isActive ? 'opacity-100' : 'opacity-40'}`}
                              style={{ backgroundColor: item.dot }}
                            />
                          )}
                        </>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-4 flex-shrink-0">
          <div className="rounded-2xl bg-white/5 ring-1 ring-white/5 px-4 py-3">
            <p className="font-display text-sm text-brand-50">Isabelly &amp; Patrick</p>
            <p className="text-[11px] text-brand-200/50 mt-0.5">Construindo nosso lar ❤️</p>
          </div>
        </div>
      </aside>

      {isSidebarOpen && (
        <div className="fixed inset-0 z-40 bg-sand-900/50 backdrop-blur-sm md:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}

      <main className="flex-1 md:overflow-y-auto scroll-thin-light">
        <div key={location.pathname} className="animate-fade max-w-6xl mx-auto px-4 py-6 md:px-10 md:py-10 pb-16">
          {children}
        </div>
      </main>
    </div>
  );
};
