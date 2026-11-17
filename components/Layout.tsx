import React, { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Menu, X, LayoutDashboard, FolderOpen, Settings, LogOut, ChevronDown, Wallet, Users, type LucideIcon } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { Button, Input, Modal } from './UI';
import { Category, categoryPath, getCategoryIcon } from '../lib/categories';
import { useCategories } from '../lib/CategoriesContext';
import logoLight from '../assets/logo-light.png';
import markLight from '../assets/mark-light.png';

interface NavEntry {
  label: string;
  path: string;
  icon: LucideIcon;
  dot?: string;
}

const navLinkCls = (isActive: boolean, nested = false) =>
  `group flex items-center gap-3 ${nested ? 'pl-3 pr-3 py-2' : 'px-3 py-2.5'} rounded-xl text-sm font-medium transition-colors ${
    isActive ? 'bg-white/10 text-white' : 'text-brand-100/70 hover:bg-white/5 hover:text-white'
  }`;

const NavItem: React.FC<{ item: NavEntry; nested?: boolean }> = ({ item, nested }) => {
  const Icon = item.icon;
  return (
    <NavLink to={item.path} end={item.path === '/'} className={({ isActive }) => navLinkCls(isActive, nested)}>
      {({ isActive }) => (
        <>
          <Icon className={`${nested ? 'w-4 h-4' : 'w-[18px] h-[18px]'} ${isActive ? 'text-brand-200' : 'text-brand-200/50 group-hover:text-brand-200/80'}`} />
          <span className="flex-1 truncate">{item.label}</span>
          {item.dot && (
            <span className={`w-1.5 h-1.5 rounded-full transition-opacity ${isActive ? 'opacity-100' : 'opacity-40'}`} style={{ backgroundColor: item.dot }} />
          )}
        </>
      )}
    </NavLink>
  );
};

// Lembra quais grupos o usuário recolheu (só neste aparelho)
const COLLAPSED_KEY = 'nosso-lar:grupos-recolhidos';
const readCollapsed = (): string[] => {
  try { return JSON.parse(localStorage.getItem(COLLAPSED_KEY) || '[]'); } catch { return []; }
};

const NavGroup: React.FC<{ group: Category; children: Category[]; collapsed: boolean; onToggle: () => void }> = ({ group, children, collapsed, onToggle }) => {
  const location = useLocation();
  const childActive = children.some(c => location.pathname === categoryPath(c.key));
  const open = !collapsed || childActive;
  const Icon = getCategoryIcon(group.icon);
  return (
    <div>
      <div className="flex items-center">
        <NavLink to={categoryPath(group.key)} className={({ isActive }) => `${navLinkCls(isActive)} flex-1 min-w-0`}>
          {({ isActive }) => (
            <>
              <Icon className={`w-[18px] h-[18px] ${isActive || childActive ? 'text-brand-200' : 'text-brand-200/50 group-hover:text-brand-200/80'}`} />
              <span className={`flex-1 truncate ${childActive && !isActive ? 'text-white' : ''}`}>{group.name}</span>
            </>
          )}
        </NavLink>
        <button
          onClick={onToggle}
          aria-label={open ? `Recolher ${group.name}` : `Expandir ${group.name}`}
          aria-expanded={open}
          className="p-2 ml-0.5 rounded-lg text-brand-200/50 hover:text-white hover:bg-white/5"
        >
          <ChevronDown className={`w-4 h-4 transition-transform ${open ? '' : '-rotate-90'}`} />
        </button>
      </div>
      {open && children.length > 0 && (
        <div className="ml-[22px] mt-0.5 pl-2 border-l border-white/10 space-y-0.5">
          {children.map(c => (
            <NavItem key={c.key} nested item={{ label: c.name, path: categoryPath(c.key), icon: getCategoryIcon(c.icon), dot: c.color }} />
          ))}
        </div>
      )}
    </div>
  );
};

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
  const { expenseTree, incomeTree } = useCategories();
  const { session, signOut, displayName, updateName } = useAuth();
  const [isNameOpen, setIsNameOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);

  const saveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameDraft.trim()) return;
    setIsSavingName(true);
    const error = await updateName(nameDraft);
    setIsSavingName(false);
    if (error) alert('Erro ao salvar o nome: ' + error);
    else setIsNameOpen(false);
  };

  useEffect(() => setIsSidebarOpen(false), [location.pathname]);

  const [collapsed, setCollapsed] = useState<string[]>(readCollapsed);
  const toggleGroup = (key: string) => {
    setCollapsed(prev => {
      const next = prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key];
      try { localStorage.setItem(COLLAPSED_KEY, JSON.stringify(next)); } catch { /* sem armazenamento local */ }
      return next;
    });
  };

  const sectionTitle = (title: string) => (
    <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-brand-200/40">{title}</p>
  );

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
          <div className="space-y-0.5">
            <NavItem item={{ label: 'Visão geral', path: '/', icon: LayoutDashboard }} />
          </div>

          {[
            { title: 'Despesas', nodes: expenseTree },
            { title: 'Recebimentos', nodes: incomeTree },
          ]
            .filter(s => s.nodes.length > 0)
            .map(section => (
              <div key={section.title}>
                {sectionTitle(section.title)}
                <div className="space-y-0.5">
                  {section.nodes.map(({ category, children }) =>
                    category.is_group ? (
                      <NavGroup
                        key={category.key}
                        group={category}
                        children={children}
                        collapsed={collapsed.includes(category.key)}
                        onToggle={() => toggleGroup(category.key)}
                      />
                    ) : (
                      <NavItem
                        key={category.key}
                        item={{ label: category.name, path: categoryPath(category.key), icon: getCategoryIcon(category.icon), dot: category.color }}
                      />
                    )
                  )}
                </div>
              </div>
            ))}

          <div>
            {sectionTitle('Geral')}
            <div className="space-y-0.5">
              <NavItem item={{ label: 'Contas e cartões', path: '/carteira', icon: Wallet }} />
              <NavItem item={{ label: 'Pagantes', path: '/pagantes', icon: Users }} />
              <NavItem item={{ label: 'Documentos', path: '/documents', icon: FolderOpen }} />
              <NavItem item={{ label: 'Configurações', path: '/configuracoes', icon: Settings }} />
            </div>
          </div>
        </nav>

        <div className="p-4 flex-shrink-0">
          <div className="rounded-2xl bg-white/5 ring-1 ring-white/5 px-4 py-3">
            <p className="font-display text-sm text-brand-50">Isabelly &amp; Patrick</p>
            <p className="text-[11px] text-brand-200/50 mt-0.5">Construindo nosso lar ❤️</p>
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/10">
              <button
                onClick={() => { setNameDraft(displayName ?? ''); setIsNameOpen(true); }}
                title={`${session?.user.email} · clique para ${displayName ? 'alterar' : 'definir'} seu nome`}
                className="group flex-1 min-w-0 flex items-center gap-2 text-left rounded-lg -ml-1 px-1 py-0.5 hover:bg-white/5"
              >
                <span className="grid place-items-center w-6 h-6 rounded-full bg-brand-500/30 text-[10px] font-bold text-brand-50 flex-shrink-0">
                  {(displayName ?? session?.user.email ?? '?').charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-semibold text-brand-50 truncate">{displayName ?? session?.user.email}</span>
                  {!displayName && <span className="block text-[10px] text-brand-200/50 group-hover:text-brand-200/80">Definir meu nome</span>}
                </span>
              </button>
              <button
                onClick={() => signOut()}
                title="Sair"
                aria-label="Sair"
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-brand-100/80 hover:text-white hover:bg-white/10 transition"
              >
                <LogOut className="w-3.5 h-3.5" /> Sair
              </button>
            </div>
          </div>
        </div>
      </aside>

      <Modal isOpen={isNameOpen} onClose={() => !isSavingName && setIsNameOpen(false)} title="Seu nome">
        <form onSubmit={saveName} className="space-y-4">
          <p className="text-sm text-sand-500">É assim que você aparece no app. Entrou com {session?.user.email}.</p>
          <Input label="Nome" value={nameDraft} onChange={e => setNameDraft(e.target.value)} placeholder="Ex: Isabelly" maxLength={40} required autoFocus disabled={isSavingName} />
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsNameOpen(false)} disabled={isSavingName} className="w-full sm:w-auto">Cancelar</Button>
            <Button type="submit" disabled={isSavingName || !nameDraft.trim()} className="w-full sm:w-auto">
              {isSavingName ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </Modal>

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
