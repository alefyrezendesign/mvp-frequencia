
import React, { useState } from 'react';
import { LogOut, AlertTriangle } from 'lucide-react';
import { Unit, AppTab } from '../types';

interface TopBarProps {
  selectedUnitId: string;
  setSelectedUnitId: (id: string) => void;
  store: any;
  onLogout: () => void;
}

const TopBar: React.FC<TopBarProps> = ({
  selectedUnitId,
  setSelectedUnitId,
  store,
  onLogout
}) => {
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full bg-black/95 backdrop-blur-md border-b border-zinc-900 pt-4 pb-3">
      <div className="max-w-5xl mx-auto flex flex-col gap-4 items-center">

        {/* Row 1: Header Fixo */}
        <div className="flex items-center gap-3 justify-between w-full px-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-fit flex items-center justify-center shrink-0 overflow-hidden">
              <img src="/logo.png" alt="Logo" className="h-full object-contain" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-base font-black text-white leading-tight">Gestão de Frequência</h1>
              <p className="text-[10px] text-purple-400 font-bold uppercase tracking-widest">Visão e Propósito</p>
            </div>
          </div>

          <button
            onClick={() => setShowLogoutModal(true)}
            className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-500 hover:text-rose-500 transition-colors active:scale-95"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {/* Row 2: Seletor de Unidade Fixo */}
        <div className="flex bg-zinc-900/80 p-1 rounded-xl w-fit border border-zinc-800/50 mx-auto">
          {store.units.map((unit: Unit) => (
            <button
              key={unit.id}
              onClick={() => setSelectedUnitId(unit.id)}
              className={`px-5 py-1.5 rounded-lg text-xs font-black uppercase tracking-tighter transition-all ${selectedUnitId === unit.id
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20'
                  : 'text-zinc-500 hover:text-zinc-300'
                }`}
            >
              {unit.name}
            </button>
          ))}
        </div>
      </div>

      {showLogoutModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-sm rounded-[2rem] p-8 shadow-2xl">
            <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-8 h-8 text-rose-500" />
            </div>
            <div className="text-center mb-8">
              <h3 className="text-xl font-black text-white tracking-tight mb-2">Sair do Aplicativo?</h3>
              <p className="text-sm text-zinc-500 font-medium leading-relaxed">Você precisará digitar a senha de acesso novamente para entrar.</p>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => { setShowLogoutModal(false); onLogout(); }}
                className="w-full bg-rose-600 hover:bg-rose-500 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-rose-600/20"
              >
                Sim, Sair agora
              </button>
              <button onClick={() => setShowLogoutModal(false)} className="w-full bg-zinc-800 text-zinc-300 py-4 rounded-2xl font-black text-xs uppercase tracking-widest">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default TopBar;
