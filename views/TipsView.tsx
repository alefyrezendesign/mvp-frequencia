
import React, { useState } from 'react';
import { Lightbulb, Info, Shield, Quote, MessageSquare, CheckCircle2, Lock, Key, Eye, EyeOff, Save, Check } from 'lucide-react';
import { MASTER_KEY } from '../constants';

const TipsView: React.FC<{ store: any }> = ({ store }) => {
  const { settings, setSettings } = store;
  
  // Estados para área de segurança do proprietário
  const [showAdminPrompt, setShowAdminPrompt] = useState(false);
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [masterCodeInput, setMasterCodeInput] = useState('');
  const [adminError, setAdminError] = useState(false);
  
  // Estados para nova senha - Fallback para 'mvp20152026#'
  const [newLoginPassword, setNewLoginPassword] = useState(settings.accessPassword || 'mvp20152026#');
  const [showPass, setShowPass] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleVerifyMaster = () => {
    if (masterCodeInput === MASTER_KEY) {
      setIsAdminUnlocked(true);
      setAdminError(false);
    } else {
      setAdminError(true);
      setTimeout(() => setAdminError(false), 2000);
    }
  };

  const handleSaveNewPassword = () => {
    setSettings({ ...settings, accessPassword: newLoginPassword });
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      setIsAdminUnlocked(false);
      setShowAdminPrompt(false);
      setMasterCodeInput('');
    }, 2500);
  };

  return (
    <div className="space-y-8 pb-32">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold">Dicas & Informações</h2>
        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Guia de Uso para Secretárias</p>
      </div>

      {/* Inspiring Verse */}
      <section className="relative overflow-hidden bg-purple-600/10 border border-purple-500/20 rounded-3xl p-6">
        <Quote className="absolute -top-4 -right-4 w-24 h-24 text-purple-600/10 rotate-12" />
        <div className="relative z-10 text-center">
          <p className="text-sm font-medium italic text-purple-200 leading-relaxed">
            "Tudo o que fizerem, façam de todo o coração, como para o Senhor, e não para os homens."
          </p>
          <p className="text-[10px] font-black uppercase text-purple-400 mt-3 tracking-widest">
            — Colossenses 3:23
          </p>
        </div>
      </section>

      {/* Rules Information */}
      <section className="space-y-4">
        <h3 className="text-[10px] font-black text-zinc-500 uppercase flex items-center gap-2 tracking-[0.2em]">
          <Shield className="w-3.5 h-3.5" /> Categorias Automáticas
        </h3>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
          <p className="text-[11px] text-zinc-400 font-medium leading-relaxed">
            O sistema classifica o engajamento dos membros automaticamente com base no número de <span className="text-white font-bold">faltas registradas no mês</span> selecionado:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <CategoryInfo label="Frequência Perfeita" rule="0 faltas" color="bg-emerald-500" />
            <CategoryInfo label="Frequência Boa" rule="1 a 2 faltas" color="bg-blue-500" />
            <CategoryInfo label="Frequência Baixa" rule="3 a 4 faltas" color="bg-amber-500" />
            <CategoryInfo label="Frequência Crítica" rule="+ de 4 faltas" color="bg-rose-500" />
          </div>
        </div>
      </section>

      {/* Quick Tips */}
      <section className="space-y-4">
        <h3 className="text-[10px] font-black text-zinc-500 uppercase flex items-center gap-2 tracking-[0.2em]">
          <Lightbulb className="w-3.5 h-3.5" /> Dicas Importantes
        </h3>
        <div className="space-y-3">
          <TipCard 
            icon={<CheckCircle2 className="w-4 h-4 text-emerald-500" />}
            title="Registro em Tempo Real"
            description="Tente realizar a chamada durante o culto. Os botões de presença e falta salvam os dados instantaneamente."
          />
          <TipCard 
            icon={<MessageSquare className="w-4 h-4 text-amber-500" />}
            title="Justificativas"
            description="Sempre anote o motivo de faltas comunicadas. Isso ajuda o pastor a entender a situação do membro antes do gabinete."
          />
          <TipCard 
            icon={<Info className="w-4 h-4 text-blue-500" />}
            title="Aba Pastoral"
            description="Membros que aparecem na aba Pastoral precisam de atenção. Use o botão de WhatsApp para informar o pastor rapidamente."
          />
        </div>
      </section>

      {/* Owner Area (Área do Proprietário) - PROTECTED PASSWORD CHANGE */}
      <section className="space-y-4 pt-4 border-t border-zinc-900">
        <h3 className="text-[10px] font-black text-zinc-700 uppercase flex items-center gap-2 tracking-[0.2em]">
          <Lock className="w-3.5 h-3.5" /> Área do Proprietário
        </h3>
        
        {!isAdminUnlocked ? (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6">
            {!showAdminPrompt ? (
              <button 
                onClick={() => setShowAdminPrompt(true)}
                className="w-full flex items-center justify-between group active:scale-[0.98] transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center group-hover:bg-zinc-700 transition-colors">
                    <Key className="w-4 h-4 text-zinc-500 group-hover:text-purple-500" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold text-zinc-400 group-hover:text-zinc-200">Alterar Senha de Login</p>
                    <p className="text-[9px] text-zinc-600 font-bold uppercase">Requer código de segurança</p>
                  </div>
                </div>
                <div className="text-[10px] font-black uppercase tracking-widest text-zinc-700 bg-zinc-800/50 px-3 py-1.5 rounded-lg border border-zinc-800">Abrir</div>
              </button>
            ) : (
              <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Digite o Código Mestre</p>
                <div className="flex gap-2">
                  <input 
                    type="password"
                    placeholder="Sua chave de acesso..."
                    className={`flex-1 bg-zinc-950 border rounded-2xl p-4 text-sm text-white outline-none transition-all ${adminError ? 'border-rose-500 shadow-lg shadow-rose-500/10' : 'border-zinc-800 focus:border-purple-600'}`}
                    value={masterCodeInput}
                    onChange={e => setMasterCodeInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleVerifyMaster()}
                  />
                  <button 
                    onClick={handleVerifyMaster}
                    className="bg-purple-600 px-6 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-600/20 active:scale-95 transition-all"
                  >
                    <Check className="w-5 h-5 text-white" />
                  </button>
                </div>
                {adminError && <p className="text-[10px] text-rose-500 font-bold uppercase text-center animate-pulse">Código Incorreto</p>}
                <button 
                  onClick={() => { setShowAdminPrompt(false); setAdminError(false); }}
                  className="w-full text-[9px] font-black uppercase tracking-widest text-zinc-600 pt-2"
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-zinc-900 border border-emerald-600/30 rounded-[2rem] p-8 space-y-5 animate-in zoom-in-95 duration-300 shadow-2xl shadow-emerald-600/5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Acesso Autorizado</p>
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Nova Senha de Login (Geral)</label>
              <div className="relative">
                <input 
                  autoFocus
                  type={showPass ? 'text' : 'password'}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-sm text-white focus:border-emerald-600 outline-none transition-all"
                  value={newLoginPassword}
                  onChange={e => setNewLoginPassword(e.target.value)}
                />
                <button 
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600"
                >
                  {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button 
              onClick={handleSaveNewPassword}
              disabled={saveSuccess}
              className={`w-full py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg ${saveSuccess ? 'bg-emerald-600 text-white shadow-emerald-600/20' : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20 active:scale-[0.98]'}`}
            >
              {saveSuccess ? <><CheckCircle2 className="w-4 h-4" /> Senha Alterada!</> : <><Save className="w-4 h-4" /> Salvar Nova Senha</>}
            </button>
            
            <button 
              onClick={() => setIsAdminUnlocked(false)}
              className="w-full text-[9px] font-black uppercase tracking-widest text-zinc-600 mt-2"
            >
              Fechar Painel
            </button>
          </div>
        )}
      </section>

      {/* System Status Footer */}
      <section className="p-4 bg-zinc-950/50 border border-dashed border-zinc-800 rounded-2xl text-center">
        <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest">
          Os dados são salvos automaticamente neste dispositivo.
        </p>
      </section>

      <div className="text-center pt-4">
        <p className="text-[9px] text-zinc-600 font-black uppercase tracking-[0.3em]">Gestão de Frequência v1.5.0</p>
        <p className="text-[9px] text-zinc-700 mt-2 font-bold uppercase italic">Ministério Visão e Propósito</p>
      </div>
    </div>
  );
};

const CategoryInfo = ({ label, rule, color }: { label: string, rule: string, color: string }) => (
  <div className="bg-zinc-950 border border-zinc-800/50 p-3 rounded-xl flex items-center gap-3">
    <div className={`w-2 h-2 rounded-full ${color} shrink-0`} />
    <div>
      <p className="text-[10px] font-black text-zinc-100 uppercase leading-none">{label}</p>
      <p className="text-[9px] text-zinc-500 font-bold mt-1 uppercase tracking-tighter">{rule}</p>
    </div>
  </div>
);

const TipCard = ({ icon, title, description }: any) => (
  <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl flex gap-4">
    <div className="shrink-0 mt-1">{icon}</div>
    <div>
      <h4 className="text-xs font-bold text-zinc-200 mb-1">{title}</h4>
      <p className="text-[11px] text-zinc-500 leading-relaxed font-medium">{description}</p>
    </div>
  </div>
);

export default TipsView;
