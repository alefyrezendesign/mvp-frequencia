
import React, { useRef, useState } from 'react';
import { Smartphone, Database, Shield, FileUp, Download, Trash2, Lock, Eye, EyeOff, Save, Key, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

const SettingsView: React.FC<{ store: any }> = ({ store }) => {
  const { settings, setSettings } = store;
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados para proteção de Admin
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [adminKeyInput, setAdminKeyInput] = useState('');
  const [showAdminPrompt, setShowAdminPrompt] = useState(false);
  const [adminError, setAdminError] = useState(false);

  // Estados para nova senha - Fallback para 'mvp20152026#'
  const [newPassword, setNewPassword] = useState(settings.accessPassword || 'mvp20152026#');
  const [showPass, setShowPass] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleToggleJustified = () => {
    setSettings({ ...settings, justifiedCountsAsPresence: !settings.justifiedCountsAsPresence });
  };

  const handleSavePassword = () => {
    setSettings({ ...settings, accessPassword: newPassword });
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      setIsAdminUnlocked(false);
      setShowAdminPrompt(false);
      setAdminKeyInput('');
    }, 2000);
  };

  const handleVerifyAdmin = async () => {
    // Verificação Segura (Backend)
    if (store.supabase || (window as any).supabase) { // Acesso direto ou via store se disponível
      // Nota: store pode não ter supabase exposto diretamente, vamos importar do serviço se necessário
      // ou assumir que o usuário não configurou ainda e usar fallback local para evitar travamento
    }

    try {
      // Import dinâmico ou uso do cliente global
      const { supabase } = await import('../services/supabase');

      if (supabase) {
        const { data, error } = await supabase.rpc('verify_master_key', { attempt: adminKeyInput });

        if (data === true) {
          setIsAdminUnlocked(true);
          setAdminError(false);
          return;
        }
      } else {
        // Fallback apenas se não houver conexão configurada (segurança reduzida, mas funcional)
        if (adminKeyInput === 'DONO_MVP_2026_AR') {
          setIsAdminUnlocked(true);
          setAdminError(false);
          return;
        }
      }
    } catch (e) {
      console.error(e);
    }

    setAdminError(true);
    setTimeout(() => setAdminError(false), 2000);
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.members && data.attendance) {
          if (confirm('Isso substituirá todos os dados atuais pelos dados do backup. Deseja continuar?')) {
            localStorage.setItem('church_members', JSON.stringify(data.members));
            localStorage.setItem('church_attendance', JSON.stringify(data.attendance));
            localStorage.setItem('church_cabinet', JSON.stringify(data.cabinet || []));
            localStorage.setItem('church_settings', JSON.stringify(data.settings || settings));
            window.location.reload();
          }
        } else {
          alert('Arquivo de backup inválido.');
        }
      } catch (err) {
        alert('Erro ao ler o arquivo de backup.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-8 pb-24">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold">Configurações</h2>
        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Ajustes do Sistema</p>
      </div>

      {/* Seção de Segurança PROTEGIDA */}
      <section className="space-y-4">
        <h3 className="text-[10px] font-black text-zinc-500 uppercase flex items-center gap-2 tracking-[0.2em]">
          <Shield className="w-3.5 h-3.5" /> Segurança
        </h3>

        {!isAdminUnlocked ? (
          <button
            onClick={() => setShowAdminPrompt(!showAdminPrompt)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-center justify-between group active:scale-[0.98] transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                <Lock className="w-4 h-4 text-zinc-500" />
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-zinc-100">Painel do Proprietário</p>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-tight">Alterar senhas e acessos</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-zinc-700 group-hover:text-purple-500 transition-colors" />
          </button>
        ) : (
          <div className="bg-zinc-900 border border-purple-600/30 rounded-3xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-300 shadow-2xl shadow-purple-600/5">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Modo Administrador Ativo</p>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Nova Senha Mestre (Login)</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-sm text-white focus:border-purple-600 outline-none transition-all"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                />
                <button
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600"
                >
                  {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setIsAdminUnlocked(false)}
                className="flex-1 py-4 rounded-2xl text-[10px] font-black uppercase text-zinc-500 bg-zinc-800"
              >
                Cancelar
              </button>
              <button
                onClick={handleSavePassword}
                className={`flex-[2] py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${saveSuccess ? 'bg-emerald-600 text-white' : 'bg-purple-600 text-white shadow-lg shadow-purple-600/20'}`}
              >
                {saveSuccess ? <><Save className="w-4 h-4" /> Sucesso!</> : <><Lock className="w-4 h-4" /> Aplicar Nova Senha</>}
              </button>
            </div>
          </div>
        )}

        {showAdminPrompt && !isAdminUnlocked && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-4 mt-2 animate-in slide-in-from-top-2 duration-300 shadow-xl">
            <div className="flex items-center gap-3 mb-2">
              <Key className="w-4 h-4 text-purple-500" />
              <p className="text-xs font-bold text-zinc-300">Digite a Chave do Proprietário</p>
            </div>
            <input
              type="password"
              placeholder="Sua chave secreta..."
              className={`w-full bg-zinc-950 border rounded-2xl p-4 text-sm text-white outline-none transition-all ${adminError ? 'border-rose-500' : 'border-zinc-800 focus:border-purple-600'}`}
              value={adminKeyInput}
              onChange={e => setAdminKeyInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleVerifyAdmin()}
            />
            {adminError && <p className="text-[10px] text-rose-500 font-bold uppercase text-center">Chave Incorreta!</p>}
            <button
              onClick={handleVerifyAdmin}
              className="w-full bg-zinc-800 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-zinc-300 active:scale-95 transition-all"
            >
              Verificar Identidade
            </button>
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h3 className="text-[10px] font-black text-zinc-500 uppercase flex items-center gap-2 tracking-[0.2em]">
          <Smartphone className="w-3.5 h-3.5" /> Regras de Negócio
        </h3>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between py-1">
            <div className="pr-4">
              <p className="font-bold text-sm text-zinc-100">Justificativa = Presença</p>
              <p className="text-[10px] text-zinc-500 font-medium leading-tight mt-1">
                Membros justificados serão contabilizados como presença nos cálculos.
              </p>
            </div>
            <button
              onClick={handleToggleJustified}
              className={`w-12 h-6 rounded-full transition-all shrink-0 relative ${settings.justifiedCountsAsPresence ? 'bg-purple-600' : 'bg-zinc-800'}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-md transition-all ${settings.justifiedCountsAsPresence ? 'right-1' : 'left-1'}`} />
            </button>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-[10px] font-black text-zinc-500 uppercase flex items-center gap-2 tracking-[0.2em]">
          <Database className="w-3.5 h-3.5" /> Gestão de Dados (Backup)
        </h3>
        <div className="grid grid-cols-1 gap-3">
          <button
            onClick={() => {
              const data = JSON.stringify({
                members: store.members,
                attendance: store.attendance,
                cabinet: store.cabinet,
                settings: store.settings
              }, null, 2);
              const blob = new Blob([data], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `backup-igreja-${format(new Date(), 'yyyy-MM-dd')}.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl text-xs font-black text-zinc-300 flex items-center justify-center gap-3 transition-all active:scale-[0.98] hover:bg-zinc-800/50 uppercase tracking-widest"
          >
            <Download className="w-4 h-4 text-purple-500" /> Exportar Backup
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl text-xs font-black text-zinc-300 flex items-center justify-center gap-3 transition-all active:scale-[0.98] hover:bg-zinc-800/50 uppercase tracking-widest"
          >
            <FileUp className="w-4 h-4 text-emerald-500" /> Importar Backup
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImportBackup}
              accept=".json"
              className="hidden"
            />
          </button>

          <button
            onClick={() => {
              if (confirm('ATENÇÃO: Isso apagará permanentemente todos os registros deste dispositivo. Deseja continuar?')) {
                localStorage.clear();
                window.location.reload();
              }
            }}
            className="bg-rose-900/10 border border-rose-900/20 p-4 rounded-2xl text-xs font-black text-rose-500 flex items-center justify-center gap-3 transition-all active:scale-[0.98] hover:bg-rose-900/20 uppercase tracking-widest"
          >
            <Trash2 className="w-4 h-4" /> Resetar Sistema
          </button>
        </div>
      </section>

      <div className="pt-8 text-center border-t border-zinc-900/50">
        <p className="text-[9px] text-zinc-600 font-black uppercase tracking-[0.3em]">Controle de Frequência v1.5.0</p>
        <p className="text-[9px] text-zinc-700 mt-2 font-bold uppercase italic">Ministério Visão e Propósito</p>
      </div>
    </div>
  );
};

export default SettingsView;
