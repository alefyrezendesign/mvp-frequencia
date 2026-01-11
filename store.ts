
import { useState, useEffect } from 'react';
import { Member, AttendanceRecord, CabinetFollowUp, AppSettings, Unit, Nucleo, AttendanceStatus } from './types';
import { MOCK_MEMBERS, UNITS, NUCLEOS, INITIAL_SETTINGS } from './constants';

import { supabase } from './services/supabase';

export function useDataStore() {
  const [members, setMembers] = useState<Member[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [cabinet, setCabinet] = useState<CabinetFollowUp[]>([]);
  const [settings, setSettings] = useState<AppSettings>(INITIAL_SETTINGS);
  const [units] = useState<Unit[]>(UNITS);
  const [nucleos] = useState<Nucleo[]>(NUCLEOS);
  const [loading, setLoading] = useState(true);

  // Carregamento Inicial (Banco de Dados ou LocalStorage como backup)
  useEffect(() => {
    async function loadInitialData() {
      if (supabase) {
        try {
          const [
            { data: dbMembers },
            { data: dbAttendance },
            { data: dbCabinet },
            { data: dbSettings }
          ] = await Promise.all([
            supabase.from('members').select('*'),
            supabase.from('attendance').select('*'),
            supabase.from('cabinet').select('*'),
            supabase.from('settings').select('data').single()
          ]);

          if (dbMembers) setMembers(dbMembers);
          if (dbAttendance) setAttendance(dbAttendance);
          if (dbCabinet) setCabinet(dbCabinet);
          if (dbSettings?.data) setSettings(dbSettings.data);
        } catch (error) {
          console.error('Erro ao carregar do Supabase:', error);
          loadFromLocalStorage();
        }
      } else {
        loadFromLocalStorage();
      }
      setLoading(false);
    }

    function loadFromLocalStorage() {
      const savedMembers = localStorage.getItem('church_members');
      const savedAttendance = localStorage.getItem('church_attendance');
      const savedSettings = localStorage.getItem('church_settings');

      if (savedMembers) setMembers(JSON.parse(savedMembers));
      else setMembers(MOCK_MEMBERS);

      if (savedAttendance) setAttendance(JSON.parse(savedAttendance));
      if (savedSettings) setSettings(JSON.parse(savedSettings));
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
          setAttendance(prev => prev.some(r => r.id === newRecord.id) ? prev : [...prev, newRecord]);
        }
        if (payload.eventType === 'UPDATE') {
          const updated = payload.new as AttendanceRecord;
          setAttendance(prev => prev.map(r => r.id === updated.id ? updated : r));
        }
        if (payload.eventType === 'DELETE') {
          setAttendance(prev => prev.filter(r => r.id !== payload.old.id));
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cabinet' }, (payload) => {
        const record = payload.new as CabinetFollowUp;
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Update Methods (Salvando no Banco)
  const updateAttendance = async (record: Omit<AttendanceRecord, 'id' | 'registeredAt'>) => {
    const newRecord = {
      ...record,
      id: Math.random().toString(36).substr(2, 9),
      registeredAt: Date.now()
    };

    setAttendance(prev => {
      const filtered = prev.filter(r => !(r.memberId === record.memberId && r.date === record.date));
      return record.status === AttendanceStatus.NOT_REGISTERED ? filtered : [...filtered, newRecord];
    });

    if (supabase) {
      // Deleta anterior e insere novo no banco
      await supabase.from('attendance').delete().match({ memberId: record.memberId, date: record.date });
      if (record.status !== AttendanceStatus.NOT_REGISTERED) {
        await supabase.from('attendance').insert(newRecord);
      }
    } else {
      localStorage.setItem('church_attendance', JSON.stringify(attendance));
    }
  };

  const batchUpdateAttendance = async (records: AttendanceRecord[]) => {
    setAttendance(prev => {
      const keysToRemove = new Set(records.map(r => `${r.memberId}-${r.date}`));
      const filtered = prev.filter(r => !keysToRemove.has(`${r.memberId}-${r.date}`));
      return [...filtered, ...records];
    });

    if (supabase) {
      for (const r of records) {
        await supabase.from('attendance').upsert(r);
      }
    }
  };

  const updateCabinetStatus = async (memberId: string, period: string, status: CabinetFollowUp['status']) => {
    const newItem = { memberId, period, status, lastUpdate: Date.now() };
    setCabinet(prev => {
      const filtered = prev.filter(c => !(c.memberId === memberId && c.period === period));
      return [...filtered, newItem];
    });

    if (supabase) {
      await supabase.from('cabinet').upsert(newItem);
    }
  };

  const saveMember = async (member: Member) => {
    setMembers(prev => {
      const exists = prev.find(m => m.id === member.id);
      return exists ? prev.map(m => m.id === member.id ? member : m) : [...prev, member];
    });

    if (supabase) {
      await supabase.from('members').upsert(member);
    }
  };

  const batchSaveMembers = async (newMembers: Member[]) => {
    setMembers(prev => [...prev, ...newMembers]);
    if (supabase) {
      await supabase.from('members').insert(newMembers);
    }
  };

  const updateSettings = async (newSettings: AppSettings) => {
    setSettings(newSettings);
    if (supabase) {
      await supabase.from('settings').upsert({ id: 1, data: newSettings });
    } else {
      localStorage.setItem('church_settings', JSON.stringify(newSettings));
    }
  };

  return {
    members, attendance, cabinet, settings, units, nucleos, loading,
    updateAttendance, batchUpdateAttendance, updateCabinetStatus, saveMember, batchSaveMembers, setSettings: updateSettings
  };
}
