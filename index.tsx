import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

try {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  console.log("App mounted successfully");
} catch (error) {
  console.error("Failed to mount app:", error);
  rootElement.innerHTML = '<div style="padding: 20px; color: red; font-family: sans-serif;"><h1>Erro ao iniciar aplicação</h1><p>Verifique o console do navegador para mais detalhes.</p></div>';
}