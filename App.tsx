import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Layout } from './components/Layout';
import { ExpenseModule } from './components/ExpenseModule';
import { DocumentModule } from './components/DocumentModule';
import { Dashboard } from './components/Dashboard';
import { SettingsModule } from './components/SettingsModule';
import { WalletPage } from './components/WalletPage';
import { CategoriesProvider, useCategories } from './lib/CategoriesContext';
import { PayersProvider } from './lib/PayersContext';
import { WalletProvider } from './lib/WalletContext';
import { AuthProvider, useAuth } from './lib/AuthContext';
import { LoginPage } from './components/LoginPage';
import logoLight from './assets/logo-light.png';

// Endereços antigos (antes das categorias dinâmicas) continuam funcionando.
const LEGACY_PATHS: Record<string, string> = {
  installments: 'INSTALLMENT', notes: 'NOTE', fees: 'FEE', iptu: 'IPTU', furniture: 'FURNITURE', utilities: 'UTILITIES',
};

const CategoryPage: React.FC = () => {
  const { key = '' } = useParams();
  const { categories, tree, isLoading } = useCategories();
  if (isLoading) {
    return <div className="flex h-[60vh] items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-brand-600" /></div>;
  }
  const category = categories.find(c => c.key === key);
  if (!category) return <Navigate to="/" replace />;
  const subcategories = category.is_group ? tree.find(n => n.category.key === category.key)?.children ?? [] : undefined;
  return <ExpenseModule key={category.key} category={category} subcategories={subcategories} />;
};

const Splash: React.FC = () => (
  <div className="min-h-screen grid place-items-center bg-brand-950">
    <img src={logoLight} alt="Nosso Lar" className="w-24 h-auto animate-pulse" />
  </div>
);

// Só monta o app (e busca dados) depois que houver uma sessão válida.
const AuthGate: React.FC = () => {
  const { session, isLoading } = useAuth();
  if (isLoading) return <Splash />;
  if (!session) return <LoginPage />;
  return <AppShell key={session.user.id} />;
};

const App: React.FC = () => (
  <AuthProvider>
    <AuthGate />
  </AuthProvider>
);

const AppShell: React.FC = () => {
  return (
    <CategoriesProvider>
     <PayersProvider>
     <WalletProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/categoria/:key" element={<CategoryPage />} />
            <Route path="/documents" element={<DocumentModule />} />
            <Route path="/configuracoes" element={<SettingsModule />} />
            <Route path="/carteira" element={<WalletPage />} />
            {Object.entries(LEGACY_PATHS).map(([path, key]) => (
              <Route key={path} path={`/${path}`} element={<Navigate to={`/categoria/${key}`} replace />} />
            ))}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </Router>
     </WalletProvider>
     </PayersProvider>
    </CategoriesProvider>
  );
};

export default App;
