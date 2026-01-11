
import React, { useState, useMemo, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { useDataStore } from './store';
import { AppTab } from './types';
import { UNITS } from './constants';
import { getValidServiceDates } from './utils';
import { supabase } from './services/supabase';

// Components
import TopBar from './components/TopBar';
import BottomNav from './components/BottomNav';
import RegisterView from './views/RegisterView';
import DashboardView from './views/DashboardView';
import MembersView from './views/MembersView';
import FollowUpView from './views/FollowUpView';
import TipsView from './views/TipsView';
import LoginView from './views/LoginView';
import SettingsView from './views/SettingsView';

const App: React.FC = () => {
  const store = useDataStore();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => sessionStorage.getItem('church_auth') === 'true');
  const [activeTab, setActiveTab] = useState<AppTab>('register');
  const [selectedUnitId, setSelectedUnitId] = useState<string>(localStorage.getItem('church_last_unit') || UNITS[0].id);

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const [selectedDate, setSelectedDate] = useState<string>(localStorage.getItem('church_last_date') || todayStr);

  const selectedUnit = useMemo(() =>
    store.units.find(u => u.id === selectedUnitId) || store.units[0],
    [selectedUnitId, store.units]);

  const handleLogin = async (password: string) => {
    if (!supabase) {
      console.error('Supabase não configurado! Verifique o .env.local');
      return false;
    }

    // Validação Segura via RPC (Banco de Dados)
    const { data, error } = await supabase.rpc('verify_access_password', { attempt: password });

    if (error) {
      console.error('Erro ao validar senha:', error.message);
      return false;
    }

    if (data === true) {
      setIsAuthenticated(true);
      return true;
    }

    return false;
  };

  const handleLogout = async () => {
    setIsAuthenticated(false);
    // Limpa qualquer estado de sessão se necessário
  };

  useEffect(() => {
    if (!supabase) return;

    // Verifica sessão atual
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
    });

    // Escuta mudanças de auth
    if (supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setIsAuthenticated(!!session);
      });
      return () => subscription.unsubscribe();
    }
  }, []);

  useEffect(() => {
    if (store.loading || !isAuthenticated) return;
    const currentMonthStr = format(parseISO(selectedDate), 'yyyy-MM');
    const validDates = getValidServiceDates(selectedUnitId, currentMonthStr, selectedUnit.serviceDays);
    const isCurrentDateValid = validDates.some(d => format(d, 'yyyy-MM-dd') === selectedDate);
    if (!isCurrentDateValid && validDates.length > 0) {
      setSelectedDate(format(validDates[0], 'yyyy-MM-dd'));
    }
  }, [selectedUnitId, selectedUnit.serviceDays, store.loading, isAuthenticated]);

  useEffect(() => { if (isAuthenticated) localStorage.setItem('church_last_unit', selectedUnitId); }, [selectedUnitId, isAuthenticated]);
  useEffect(() => { if (isAuthenticated) localStorage.setItem('church_last_date', selectedDate); }, [selectedDate, isAuthenticated]);

  if (store.loading) {
    return (
      <div className="min-h-screen w-screen flex flex-col items-center justify-center bg-black">
        <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-zinc-500 font-medium animate-pulse">Sincronizando dados...</p>
      </div>
    );
  }

  if (!isAuthenticated) return <LoginView onLogin={handleLogin} />;

  const renderView = () => {
    switch (activeTab) {
      case 'register':
        return <RegisterView store={store} selectedUnit={selectedUnit} selectedDate={selectedDate} setSelectedDate={setSelectedDate} />;
      case 'dashboard':
        return <DashboardView store={store} selectedUnit={selectedUnit} />;
      case 'members':
        return <MembersView store={store} selectedUnit={selectedUnit} />;
      case 'followup':
        return <FollowUpView store={store} selectedUnit={selectedUnit} />;
      case 'tips':
        return <TipsView store={store} />;
      case 'settings':
        return <SettingsView store={store} />;
      default: return null;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-black text-gray-100 overflow-hidden">
      {/* HEADER FIXO NO TOPO */}
      <TopBar
        selectedUnitId={selectedUnitId}
        setSelectedUnitId={setSelectedUnitId}
        store={store}
        onLogout={handleLogout}
      />

      {/* ÁREA DE CONTEÚDO COM ROLAGEM PRÓPRIA */}
      <main className="flex-1 overflow-y-auto pt-4 px-4 pb-32 md:px-8 max-w-5xl mx-auto w-full scroll-smooth">
        {renderView()}
      </main>

      {/* NAV FIXO NA BASE */}
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
};

export default App;
