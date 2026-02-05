
import React, { useState } from 'react';
import { Lock, Eye, EyeOff, ShieldCheck, AlertCircle, WifiOff } from 'lucide-react';

interface LoginViewProps {
  onLogin: (password: string) => Promise<{ success: boolean; errorType?: 'INVALID_PASSWORD' | 'SYSTEM_ERROR' }>;
}

const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorType, setErrorType] = useState<'INVALID_PASSWORD' | 'SYSTEM_ERROR' | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorType(null);
    setIsLoading(true);

    try {
      const result = await onLogin(password);
      if (!result.success) {
        setErrorType(result.errorType || 'SYSTEM_ERROR');
        setIsLoading(false);
      }
    } catch (err) {
      console.error(err);
      setErrorType('SYSTEM_ERROR');
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black flex items-center justify-center p-6">
      <div className="w-full max-w-sm flex flex-col items-center">
        {/* Logo Section */}
        <div className="mb-10 text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="w-24 h-24 flex items-center justify-center mx-auto mb-4">
            <img
              src="/logo.png"
              alt="Logo MVP"
              className="w-full h-full object-contain drop-shadow-2xl"
            />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Controle de Frequência</h1>
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.3em] mt-2">
            Ministério Visão e Propósito
          </p>
        </div>

        {/* Login Card */}
        <div className="w-full bg-zinc-900/50 border border-zinc-800/50 p-8 rounded-[2.5rem] backdrop-blur-xl animate-in fade-in zoom-in-95 duration-500 delay-200">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">
                Senha de Acesso
              </label>
              <div className="relative group">
                <div className={`absolute inset-y-0 left-4 flex items-center transition-colors ${errorType ? 'text-rose-500' : 'text-zinc-500 group-focus-within:text-purple-500'}`}>
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorType) setErrorType(null);
                  }}
                  placeholder="Digite a senha..."
                  className={`w-full bg-zinc-950 border ${errorType ? 'border-rose-500/50 focus:ring-rose-500/20' : 'border-zinc-800 focus:border-purple-600 focus:ring-purple-600/20'} rounded-2xl py-4 pl-12 pr-12 text-sm text-white outline-none ring-4 ring-transparent transition-all placeholder:text-zinc-700`}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-4 flex items-center text-zinc-600 hover:text-zinc-400 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {errorType === 'INVALID_PASSWORD' && (
                <div className="flex items-center gap-2 text-rose-500 text-[10px] font-bold uppercase tracking-wide mt-2 ml-1 animate-in fade-in slide-in-from-top-1">
                  <AlertCircle className="w-3 h-3" />
                  Senha incorreta. Tente novamente.
                </div>
              )}

              {errorType === 'SYSTEM_ERROR' && (
                <div className="flex items-center gap-2 text-amber-500 text-[10px] font-bold uppercase tracking-wide mt-2 ml-1 animate-in fade-in slide-in-from-top-1">
                  <WifiOff className="w-3 h-3" />
                  Sistema indisponível. Tente mais tarde.
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading || !password}
              className={`w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:hover:bg-purple-600 text-white rounded-2xl py-4 font-black text-sm uppercase tracking-widest shadow-lg shadow-purple-600/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2`}
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" /> Entrar no App
                </>
              )}
            </button>
          </form>
        </div>

        <p className="mt-10 text-[9px] text-zinc-700 font-bold uppercase tracking-widest text-center">
          Desenvolvido para uso interno exclusivo
        </p>
      </div>
    </div>
  );
};

export default LoginView;
