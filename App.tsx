import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ExpenseModule } from './components/ExpenseModule';
import { GuestListModule } from './components/GuestListModule';
import { DocumentModule } from './components/DocumentModule';
import { Dashboard } from './components/Dashboard';
import { ExpenseType } from './types';

const App: React.FC = () => {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          
          {/* Rotas de Apartamento */}
          <Route 
            path="/installments" 
            element={
              <ExpenseModule 
                type={ExpenseType.INSTALLMENT} 
                title="Financiamento Apartamento" 
                description="Gerencie as parcelas do financiamento do imóvel."
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
          <Route 
            path="/furniture" 
            element={
              <ExpenseModule 
                type={ExpenseType.FURNITURE} 
                title="Móveis Planejados" 
                description="Gestão de custos com mobília e decoração."
              />
            } 
          />
          <Route 
            path="/utilities" 
            element={
              <ExpenseModule 
                type={ExpenseType.UTILITIES} 
                title="Energia Elétrica" 
                description="Histórico de contas de luz e utilidades."
              />
            } 
          />
          <Route 
            path="/documents" 
            element={<DocumentModule />} 
          />

          {/* Rotas de Casamento */}
          <Route 
            path="/guests" 
            element={<GuestListModule />} 
          />
          <Route 
            path="/event-space" 
            element={
              <ExpenseModule 
                type={ExpenseType.EVENT_SPACE} 
                title="Espaço Evento" 
                description="Custos relacionados ao local da cerimônia e festa."
              />
            } 
          />
          <Route 
            path="/buffet" 
            element={
              <ExpenseModule 
                type={ExpenseType.BUFFET} 
                title="Buffet" 
                description="Serviço de alimentação e bebidas."
              />
            } 
          />
          <Route 
            path="/ceremonialist" 
            element={
              <ExpenseModule 
                type={ExpenseType.CEREMONIALIST} 
                title="Cerimonialista" 
                description="Assessoria e cerimonial do evento."
              />
            } 
          />
          <Route 
            path="/photographer" 
            element={
              <ExpenseModule 
                type={ExpenseType.PHOTOGRAPHER} 
                title="Fotógrafo" 
                description="Equipe de fotografia e filmagem."
              />
            } 
          />
          <Route 
            path="/decoration" 
            element={
              <ExpenseModule 
                type={ExpenseType.DECORATION} 
                title="Decoração" 
                description="Flores, arranjos e ambientação."
              />
            } 
          />
          <Route 
            path="/bar" 
            element={
              <ExpenseModule 
                type={ExpenseType.NON_ALCOHOLIC_BAR} 
                title="Bar sem Álcool" 
                description="Serviço de drinks não alcoólicos, sucos e refrigerantes."
              />
            } 
          />
        </Routes>
      </Layout>
    </Router>
  );
};

export default App;