import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ExpenseModule } from './components/ExpenseModule';
import { Dashboard } from './components/Dashboard';
import { ExpenseType } from './types';

const App: React.FC = () => {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route 
            path="/installments" 
            element={
              <ExpenseModule 
                type={ExpenseType.INSTALLMENT} 
                title="Parcelas" 
                description="Gerencie as despesas recorrentes mensais do condomínio."
              />
            } 
          />
          <Route 
            path="/notes" 
            element={
              <ExpenseModule 
                type={ExpenseType.NOTE} 
                title="Notas Promissórias" 
                description="Controle de débitos avulsos e pagamentos únicos."
              />
            } 
          />
          <Route 
            path="/fees" 
            element={
              <ExpenseModule 
                type={ExpenseType.FEE} 
                title="Taxas de Condomínio" 
                description="Gerenciamento da arrecadação mensal fixa."
              />
            } 
          />
        </Routes>
      </Layout>
    </Router>
  );
};

export default App;