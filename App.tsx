import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Layout } from './components/Layout';
import { ExpenseModule } from './components/ExpenseModule';
import { DocumentModule } from './components/DocumentModule';
import { Dashboard } from './components/Dashboard';
import { SettingsModule } from './components/SettingsModule';
import { CategoriesProvider, useCategories } from './lib/CategoriesContext';
import { PayersProvider } from './lib/PayersContext';

// Endereços antigos (antes das categorias dinâmicas) continuam funcionando.
const LEGACY_PATHS: Record<string, string> = {
  installments: 'INSTALLMENT', notes: 'NOTE', fees: 'FEE', iptu: 'IPTU', furniture: 'FURNITURE', utilities: 'UTILITIES',
};

const CategoryPage: React.FC = () => {
  const { key = '' } = useParams();
  const { categories, isLoading } = useCategories();
  if (isLoading) {
    return <div className="flex h-[60vh] items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-brand-600" /></div>;
  }
  const category = categories.find(c => c.key === key);
  if (!category) return <Navigate to="/" replace />;
  return <ExpenseModule key={category.key} category={category} />;
};

const App: React.FC = () => {
  return (
    <CategoriesProvider>
     <PayersProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/categoria/:key" element={<CategoryPage />} />
            <Route path="/documents" element={<DocumentModule />} />
            <Route path="/configuracoes" element={<SettingsModule />} />
            {Object.entries(LEGACY_PATHS).map(([path, key]) => (
              <Route key={path} path={`/${path}`} element={<Navigate to={`/categoria/${key}`} replace />} />
            ))}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </Router>
     </PayersProvider>
    </CategoriesProvider>
  );
};

export default App;
