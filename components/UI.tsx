import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

// --- Card ---
export const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`bg-white rounded-2xl border border-sand-200 shadow-soft p-6 ${className}`}>
    {children}
  </div>
);

// --- Page header ---
export const PageHeader: React.FC<{
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}> = ({ eyebrow, title, description, actions }) => (
  <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
    <div>
      {eyebrow && <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-600 mb-2">{eyebrow}</p>}
      <h1 className="font-display text-3xl md:text-4xl font-semibold text-sand-900 tracking-tight">{title}</h1>
      {description && <p className="text-sm text-sand-500 mt-2 max-w-xl">{description}</p>}
    </div>
    {actions && <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">{actions}</div>}
  </div>
);

// --- Button ---
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({ variant = 'primary', size = 'md', className = '', ...props }) => {
  const baseStyle =
    'inline-flex items-center justify-center gap-2 font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand-500 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]';

  const variants = {
    primary: 'bg-brand-700 text-white hover:bg-brand-800 shadow-sm',
    secondary: 'bg-white text-sand-800 border border-sand-200 hover:bg-sand-50 hover:border-sand-300',
    danger: 'bg-clay-600 text-white hover:bg-clay-700',
    ghost: 'bg-transparent text-sand-600 hover:bg-sand-100 hover:text-sand-900',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return <button className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`} {...props} />;
};

// --- Input ---
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, className = '', ...props }) => (
  <div className="w-full">
    {label && <label className="block text-xs font-semibold text-sand-600 mb-1.5">{label}</label>}
    <input
      className={`w-full rounded-xl border ${error ? 'border-clay-400' : 'border-sand-200'} bg-sand-50/60 px-3.5 py-2.5 text-sm text-sand-900 placeholder-sand-400 transition focus:bg-white focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10 disabled:opacity-60 ${className}`}
      {...props}
    />
    {error && <p className="mt-1 text-xs text-clay-600">{error}</p>}
  </div>
);

// --- Modal ---
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Portal no body: evita que transformações/animações dos contêineres da página prendam o modal.
  return createPortal(
    <div className="fixed inset-0 z-[60] overflow-y-auto" role="dialog" aria-modal="true" aria-label={title}>
      <div className="flex min-h-full items-end sm:items-center justify-center sm:p-4">
        <div className="fixed inset-0 bg-sand-900/40 backdrop-blur-[2px]" onClick={onClose} />
        <div className="animate-rise relative w-full sm:max-w-xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-sand-200">
          <div className="flex items-center justify-between px-6 pt-6 pb-4">
            <h3 className="font-display text-xl font-semibold text-sand-900">{title}</h3>
            <button onClick={onClose} aria-label="Fechar" className="p-2 -mr-2 rounded-full text-sand-400 hover:text-sand-800 hover:bg-sand-100 transition">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="px-6 pb-6">{children}</div>
        </div>
      </div>
    </div>,
    document.body
  );
};

// --- Badge ---
export const Badge: React.FC<{ children: React.ReactNode; color?: string }> = ({ children, color = 'bg-sand-100 text-sand-700' }) => (
  <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${color}`}>{children}</span>
);

export const StatusBadge: React.FC<{ status: 'PAID' | 'PENDING' }> = ({ status }) =>
  status === 'PAID' ? (
    <Badge color="bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-600/15">
      <span className="w-1.5 h-1.5 rounded-full bg-brand-500 mr-1.5" /> Pago
    </Badge>
  ) : (
    <Badge color="bg-clay-50 text-clay-700 ring-1 ring-inset ring-clay-600/15">
      <span className="w-1.5 h-1.5 rounded-full bg-clay-500 mr-1.5" /> Em aberto
    </Badge>
  );
