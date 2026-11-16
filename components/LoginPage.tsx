import React, { useState } from 'react';
import { Eye, EyeOff, Loader2, Lock, Mail, AlertCircle } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import logoLight from '../assets/logo-light.png';

export const LoginPage: React.FC = () => {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    const message = await signIn(email, password);
    // Em caso de sucesso o AuthProvider troca a tela sozinho
    if (message) {
      setError(message);
      setIsSubmitting(false);
    }
  };

  const fieldCls =
    'w-full rounded-xl border border-sand-200 bg-white pl-11 pr-4 py-3 text-sm text-sand-900 placeholder-sand-400 transition focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10 disabled:opacity-60';

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-sand-100">
      {/* Painel da marca */}
      <aside className="relative overflow-hidden bg-brand-950 text-brand-100 lg:w-[44%] flex flex-col items-center justify-center px-8 py-10 lg:py-16">
        <div className="absolute -left-24 -top-24 w-80 h-80 rounded-full bg-brand-500/15 blur-3xl pointer-events-none" />
        <div className="absolute -right-20 bottom-0 w-72 h-72 rounded-full bg-brand-400/10 blur-3xl pointer-events-none" />
        <img src={logoLight} alt="I&P · Nosso Lar" className="relative w-24 lg:w-44 h-auto animate-rise" />
        <p className="relative hidden lg:block font-display text-2xl text-brand-50 text-center mt-12 max-w-xs leading-snug">
          Nosso lar, nossas contas, em um só lugar.
        </p>
        <p className="relative hidden lg:block text-sm text-brand-200/50 mt-3">Isabelly &amp; Patrick</p>
      </aside>

      {/* Formulário */}
      <main className="flex-1 flex items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-sm animate-rise">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-600 mb-2">Acesso restrito</p>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold text-sand-900 tracking-tight">Bem-vindos de volta</h1>
          <p className="text-sm text-sand-500 mt-2">Entre com seu e-mail e senha para acessar as finanças da casa.</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4" noValidate>
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-sand-600 mb-1.5">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-sand-400 pointer-events-none" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="voce@email.com"
                  required
                  autoFocus
                  disabled={isSubmitting}
                  className={fieldCls}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-sand-600 mb-1.5">Senha</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-sand-400 pointer-events-none" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  disabled={isSubmitting}
                  className={`${fieldCls} pr-12`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg text-sand-400 hover:text-sand-700"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div role="alert" className="flex items-start gap-2 rounded-xl bg-clay-50 border border-clay-200 px-3.5 py-3 text-sm text-clay-700">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || !email.trim() || !password}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-brand-700 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-800 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand-500"
            >
              {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Entrando...</> : 'Entrar'}
            </button>
          </form>

          <p className="text-xs text-sand-400 text-center mt-8">Esqueceu a senha? Fale com o administrador do app.</p>
        </div>
      </main>
    </div>
  );
};
