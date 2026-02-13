
import { useState, useEffect } from 'react';
import { Member, AttendanceRecord, CabinetFollowUp, AppSettings, Unit, Nucleo, AttendanceStatus, Leader } from './types';
import { MOCK_MEMBERS, UNITS, NUCLEOS, INITIAL_SETTINGS } from './constants';

import { supabase } from './services/supabase';

export function useDataStore() {
  const [members, setMembers] = useState<Member[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [cabinet, setCabinet] = useState<CabinetFollowUp[]>([]);
  const [settings, setSettings] = useState<AppSettings>(INITIAL_SETTINGS);
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [units] = useState<Unit[]>(UNITS);
  const [nucleos] = useState<Nucleo[]>(NUCLEOS);
  const [loading, setLoading] = useState(true);

  // Carregamento Inicial (Banco de Dados ou LocalStorage como backup)
  // Carregamento Inicial (Banco de Dados + Sync LocalStorage)
  useEffect(() => {
    async function loadInitialData() {
      if (supabase) {
        try {
          // 1. Buscas Críticas (Paralelas)
          const [
            { data: dbMembers, error: errMembers },
            { data: dbAttendance, error: errAttendance },
            { data: dbCabinet, error: errCabinet },
            { data: dbLeaders, error: errLeaders }
          ] = await Promise.all([
            supabase.from('members').select('*'),
            supabase.from('attendance').select('*'),
            supabase.from('cabinet').select('*'),
            supabase.from('leaders').select('*')
          ]);

          if (errMembers) throw errMembers;
          if (errAttendance) throw errAttendance;

          // 2. Busca Não-Crítica (Settings) - Falha silenciosa permitida
          let dbSettingsData = null;
          try {
            const { data: dbSettings } = await supabase.from('settings').select('data').maybeSingle();
            if (dbSettings) dbSettingsData = dbSettings.data;
          } catch (e) {
            console.warn('Erro ao carregar configurações (usando padrão):', e);
          }

          // 3. Atualizar Estado
          if (dbMembers) setMembers(dbMembers);
          if (dbAttendance) setAttendance(dbAttendance);
          if (dbCabinet) setCabinet(dbCabinet || []);
          if (dbSettingsData) setSettings(dbSettingsData);
          if (dbLeaders) setLeaders(dbLeaders || []);

          // 4. PERSISTIR NO LOCALSTORAGE (Cache para Offline/Fallback)
          // Isso garante que se a internet cair ou o próximo load falhar, temos dados reais.
          localStorage.setItem('church_members', JSON.stringify(dbMembers || []));
          localStorage.setItem('church_attendance', JSON.stringify(dbAttendance || []));
          if (dbSettingsData) localStorage.setItem('church_settings', JSON.stringify(dbSettingsData));

        } catch (error) {
          console.error('Erro CRÍTICO no carregamento inicial:', error);
          loadFromLocalStorage(); // Fallback
        }
      } else {
        loadFromLocalStorage();
      }
      setLoading(false);
    }

    function loadFromLocalStorage() {
      try {
        const savedMembers = localStorage.getItem('church_members');
        const savedAttendance = localStorage.getItem('church_attendance');
        const savedSettings = localStorage.getItem('church_settings');

        if (savedMembers) setMembers(JSON.parse(savedMembers));
        else setMembers(MOCK_MEMBERS); // Só usa mock se realmente não tiver cache

        if (savedAttendance) setAttendance(JSON.parse(savedAttendance));
        if (savedSettings) setSettings(JSON.parse(savedSettings));
      } catch (e) {
        console.error('Erro ao ler LocalStorage:', e);
      }
    }

    loadInitialData();
  }, []);

  // Realtime Subscriptions (Atualização em Tempo Real)
  useEffect(() => {
    if (!supabase) return;

    const channel = supabase.channel('db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'members' }, (payload) => {
        if (payload.eventType === 'INSERT') setMembers(prev => [...prev, payload.new as Member]);
        if (payload.eventType === 'UPDATE') setMembers(prev => prev.map(m => m.id === payload.new.id ? payload.new as Member : m));
        if (payload.eventType === 'DELETE') setMembers(prev => prev.filter(m => m.id !== payload.old.id));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const newRecord = payload.new as AttendanceRecord;
          setAttendance(prev => prev.filter(r => !(r.memberId === newRecord.memberId && r.Data === newRecord.Data)).concat(newRecord));
        }
        if (payload.eventType === 'UPDATE') {
          const updated = payload.new as AttendanceRecord;
          setAttendance(prev => prev.map(r =>
            r.memberId === updated.memberId && r.Data === updated.Data ? updated : r
          ));
        }
        if (payload.eventType === 'DELETE') {
          setAttendance(prev => prev.filter(r =>
            !(r.memberId === payload.old.memberId && r.Data === payload.old.Data)
          ));
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cabinet' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const record = payload.new as CabinetFollowUp;
          setCabinet(prev => {
            const filtered = prev.filter(c => !(c.memberId === record.memberId && c.period === record.period));
            return [...filtered, record];
          });
        }
        if (payload.eventType === 'UPDATE') {
          const record = payload.new as CabinetFollowUp;
          setCabinet(prev => {
            const filtered = prev.filter(c => !(c.memberId === record.memberId && c.period === record.period));
            return [...filtered, record];
          });
        }
        // DELETE é complexo sem ID, vamos focar em INSERT/UPDATE que é o principal
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, (payload) => {
        if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
          setSettings((payload.new as any).data);
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leaders' }, (payload) => {
        if (payload.eventType === 'INSERT') setLeaders(prev => [...prev, payload.new as Leader]);
        if (payload.eventType === 'UPDATE') setLeaders(prev => prev.map(l => l.id === payload.new.id ? payload.new as Leader : l));
        if (payload.eventType === 'DELETE') setLeaders(prev => prev.filter(l => l.id !== payload.old.id));
      })
      .subscribe();

    return () => {
      supabase?.removeChannel(channel);
    };
  }, []);

  // Update Methods (Salvando no Banco)
  const updateAttendance = async (record: Omit<AttendanceRecord, 'id' | 'registrado'>) => {
    const newRecord: AttendanceRecord = {
      ...record,
      id: crypto.randomUUID(),
      registrado: Date.now()
    };

    // Snapshot anterior para rollback
    const previousAttendance = [...attendance];

    // Optimistic Update
    setAttendance(prev => {
      const filtered = prev.filter(r => !(r.memberId === record.memberId && r.Data === record.Data));
      return record.Status === AttendanceStatus.NOT_REGISTERED ? filtered : [...filtered, newRecord];
    });

    // 1. SALVAR NO LOCALSTORAGE AGORA (Backup de Segurança Imediato)
    try {
      const updatedLocal = record.Status === AttendanceStatus.NOT_REGISTERED
        ? previousAttendance.filter(r => !(r.memberId === record.memberId && r.Data === record.Data))
        : [...previousAttendance.filter(r => !(r.memberId === record.memberId && r.Data === record.Data)), newRecord];
      localStorage.setItem('church_attendance', JSON.stringify(updatedLocal));
    } catch (e) { console.error('Erro ao salvar local:', e); }

    if (supabase) {
      try {
        // Upsert seguro: Atualiza se existir, insere se não (COLUNA CORRETA: "Data"!)
        const { data, error } = await supabase
          .from('attendance')
          .upsert(newRecord, { onConflict: 'memberId, Data' })
          .select()
          .single();

        if (error) throw error;

        // Confirmar com o dado real do banco e atualizar LocalStorage
        if (data) {
          setAttendance(prev => {
            const clean = prev.filter(r => !(r.memberId === data.memberId && r.Data === data.Data));
            const finalState = [...clean, data as AttendanceRecord];
            localStorage.setItem('church_attendance', JSON.stringify(finalState));
            return finalState;
          });
        }
      } catch (error: any) {
        console.error('Erro ao salvar presença:', error);
        setAttendance(previousAttendance); // Rollback
        alert(`Erro ao salvar presença: ${error.message || 'Verifique sua conexão.'}`);
        throw error;
      }
    } else {
      // Fallback para LocalStorage se Supabase não estiver configurado
      const updated = record.Status === AttendanceStatus.NOT_REGISTERED
        ? previousAttendance.filter(r => !(r.memberId === record.memberId && r.Data === record.Data))
        : [...previousAttendance.filter(r => !(r.memberId === record.memberId && r.Data === record.Data)), newRecord];
      localStorage.setItem('church_attendance', JSON.stringify(updated));
    }
  };

  const batchUpdateAttendance = async (records: AttendanceRecord[]) => {
    const previousAttendance = [...attendance];

    // Optimistic Update
    // Optimistic Update & LocalStorage Sync
    const newLocalState = [...attendance];
    // Remove antigos que serão atualizados
    const keysToRemove = new Set(records.map(r => `${r.memberId}-${r.Data}`));
    const cleanState = newLocalState.filter(r => !keysToRemove.has(`${r.memberId}-${r.Data}`));
    const optimizedState = [...cleanState, ...records];

    setAttendance(optimizedState);
    localStorage.setItem('church_attendance', JSON.stringify(optimizedState));

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('attendance')
          .upsert(records, { onConflict: 'memberId, Data' })
          .select();

        if (error) throw error;

        // Reconciliação com dados reais do banco
        if (data) {
          setAttendance(prev => {
            const keysToUpdate = new Set(data.map(r => `${r.memberId}-${r.Data}`));
            const clean = prev.filter(r => !keysToUpdate.has(`${r.memberId}-${r.Data}`));
            const finalState = [...clean, ...data as AttendanceRecord[]];
            localStorage.setItem('church_attendance', JSON.stringify(finalState)); // Atualiza com dados oficiais
            return finalState;
          });
        }

      } catch (error: any) {
        console.error('Erro ao salvar lote de presença:', error);
        setAttendance(previousAttendance);
        localStorage.setItem('church_attendance', JSON.stringify(previousAttendance));
        alert(`Erro ao salvar chamadas em massa: ${error.message}`);
        throw error;
      }
    }
  };

  const clearAttendanceForDate = async (date: string, unitId: string) => {
    const previousAttendance = [...attendance];

    setAttendance(prev => prev.filter(r => r.Data !== date || r.unitId !== unitId));

    if (supabase) {
      try {
        const { error } = await supabase
          .from('attendance')
          .delete()
          .eq('Data', date)
          .eq('unitId', unitId);
        if (error) throw error;
      } catch (error) {
        console.error('Erro ao limpar frequência:', error);
        setAttendance(previousAttendance);
        alert('Erro ao limpar frequência do dia.');
        throw error;
      }
    } else {
      const current = JSON.parse(localStorage.getItem('church_attendance') || '[]');
      const filtered = current.filter((r: any) => !(r.unitId === unitId && r.Data === date));
      localStorage.setItem('church_attendance', JSON.stringify(filtered));
    }
  };

  const updateCabinetStatus = async (memberId: string, period: string, status: CabinetFollowUp['status']) => {
    const previousCabinet = [...cabinet];
    const newItem = { memberId, period, status, lastUpdate: Date.now() };

    setCabinet(prev => {
      const filtered = prev.filter(c => !(c.memberId === memberId && c.period === period));
      return [...filtered, newItem];
    });

    if (supabase) {
      try {
        const { error } = await supabase.from('cabinet').upsert(newItem);
        if (error) throw error;
      } catch (error) {
        console.error('Erro ao atualizar gabinete:', error);
        setCabinet(previousCabinet);
        alert('Erro ao salvar status do gabinete.');
      }
    }
  };

  const saveMember = async (member: Member) => {
    const previousMembers = [...members];

    setMembers(prev => {
      const exists = prev.find(m => m.id === member.id);
      return exists ? prev.map(m => m.id === member.id ? member : m) : [...prev, member];
    });

    if (supabase) {
      try {
        const { error } = await supabase.from('members').upsert(member);
        if (error) throw error;
      } catch (error: any) {
        console.error('Erro ao salvar membro:', error);
        setMembers(previousMembers);
        // Importante: lançar erro para a UI tratar (ex: mostrar mensagem específica)
        alert(`Erro ao salvar membro: ${error.message || 'Erro desconhecido'}`);
        throw error;
      }
    } else {
      // Fallback LocalStorage
      const current = JSON.parse(localStorage.getItem('church_members') || '[]');
      const exists = current.find((m: any) => m.id === member.id);
      const updated = exists
        ? current.map((m: any) => m.id === member.id ? member : m)
        : [...current, member];
      localStorage.setItem('church_members', JSON.stringify(updated));
    }
  };

  const batchSaveMembers = async (newMembers: Member[]) => {
    const previousMembers = [...members];
    setMembers(prev => [...prev, ...newMembers]);

    if (supabase) {
      try {
        const { error } = await supabase.from('members').insert(newMembers);
        if (error) throw error;
      } catch (error) {
        console.error('Erro ao importar membros:', error);
        setMembers(previousMembers);
        alert('Erro ao importar membros.');
        throw error;
      }
    }
  };

  const updateSettings = async (newSettings: AppSettings) => {
    const previousSettings = { ...settings };
    setSettings(newSettings);

    if (supabase) {
      try {
        const { error } = await supabase.from('settings').upsert({ id: 1, data: newSettings });
        if (error) throw error;
      } catch (error) {
        console.error('Erro ao salvar configurações:', error);
        setSettings(previousSettings);
        alert('Erro ao salvar configurações.');
      }
    } else {
      localStorage.setItem('church_settings', JSON.stringify(newSettings));
    }
  };

  const saveLeader = async (leader: Leader) => {
    const previousLeaders = [...leaders];

    setLeaders(prev => {
      const exists = prev.find(l => l.id === leader.id);
      return exists ? prev.map(l => l.id === leader.id ? leader : l) : [...prev, leader];
    });

    if (supabase) {
      try {
        const { error } = await supabase.from('leaders').upsert(leader);
        if (error) throw error;
      } catch (error: any) {
        console.error('Erro ao salvar líder:', error);
        setLeaders(previousLeaders);
        alert(`Erro ao salvar líder: ${error.message}`);
        throw error;
      }
    }
  };

  const deleteMember = async (memberId: string) => {
    const previousMembers = [...members];
    setMembers(prev => prev.filter(m => m.id !== memberId));

    if (supabase) {
      try {
        const { error } = await supabase.from('members').delete().match({ id: memberId });
        if (error) throw error;
      } catch (error) {
        console.error('Erro ao deletar membro:', error);
        setMembers(previousMembers);
        alert('Erro ao deletar membro. Verifique permissões.');
        throw error;
      }
    }
  };

  return {
    members, attendance, cabinet, settings, units, nucleos, leaders, loading,
    updateAttendance, batchUpdateAttendance, clearAttendanceForDate, updateCabinetStatus, saveMember, deleteMember, batchSaveMembers, setSettings: updateSettings, saveLeader
  };
}
