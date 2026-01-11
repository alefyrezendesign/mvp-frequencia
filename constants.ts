
import { Unit, Nucleo, AppSettings, Member } from './types';

export const UNITS: Unit[] = [
  { id: '1', name: 'Boa Vista', serviceDays: [0, 3], pastorPhone: '5511999999999' },
  { id: '2', name: 'Abacatão', serviceDays: [0, 4], pastorPhone: '5511888888888' }
];

// Chave que apenas o DONO do app deve saber para alterar a senha de login
// SECURITY: MASTER_KEY foi removida do código cliente para segurança.
// A verificação deve ser feita via Backend/Supabase Auth.
export const MASTER_KEY = '';

export const NUCLEOS: Nucleo[] = [
  { id: 'n1', name: 'Berçário', color: 'pink' },
  { id: 'n2', name: 'Kids', color: 'amber' },
  { id: 'n3', name: 'Teens', color: 'sky' },
  { id: 'n4', name: 'Obreiro / Líder', color: 'indigo' },
  { id: 'n5', name: 'Voluntário', color: 'teal' },
  { id: 'n6', name: 'Membro', color: 'zinc' },
  { id: 'n7', name: 'Missionário(a)', color: 'emerald' },
  { id: 'n8', name: 'Pastor', color: 'fuchsia' }
];

export const INITIAL_SETTINGS: AppSettings = {
  justifiedCountsAsPresence: false,
  accessPassword: 'mvp20152026#', // Nova senha padrão inicial
  thresholds: {
    perfect: 100,
    good: 80,
    low: 60
  }
};

export const MOCK_MEMBERS: Member[] = [
  { id: 'm1', name: 'Agnes Loyse', nucleoId: 'n1', unitId: '1', active: true },
  { id: 'm2', name: 'Alejandro Moreira', nucleoId: 'n3', unitId: '1', active: true },
  { id: 'm3', name: 'Ana Carolinne Lima', nucleoId: 'n4', unitId: '1', active: true },
  { id: 'm4', name: 'Benjamin', nucleoId: 'n1', unitId: '2', active: true },
  { id: 'm5', name: 'Carlos Rocha', nucleoId: 'n6', unitId: '2', active: true },
  { id: 'm6', name: 'Cleiton Burger', nucleoId: 'n8', unitId: '1', active: true },
];

export const COLORS = {
  primary: '#8A05BE', // Nubank Purple
  primaryDark: '#6A0493',
  bgMain: '#000000',
  bgCard: '#121212',
  bgHover: '#1C1C1C',
  border: '#2A2A2A',
  textSecondary: '#A0A0A0'
};
