
export enum AttendanceStatus {
  NOT_REGISTERED = 'NÃO REGISTRADO',
  PRESENT = 'PRESENTE',
  ABSENT = 'FALTOU',
  JUSTIFIED = 'JUSTIFICADO'
}

export enum CabinetStatus {
  AGUARDANDO = 'Selecionar Status',
  LIDER_INFORMADO = 'Líder informado',
  PRIMEIRO_CONTATO = 'Primeiro contato - realizado',
  CONVERSA_REALIZADA = 'Conversa 1a1 realizada',
  SOLUCIONADO = 'Solucionado'
}

export enum FrequencyCategory {
  PERFECT = 'Frequência Perfeita',
  GOOD = 'Frequência Boa',
  LOW = 'Frequência Baixa',
  CRITICAL = 'Frequência Crítica'
}

export interface Leader {
  id: string;
  unitId: string;
  generation: string;
  name: string;
  phone: string;
}

export interface Unit {
  id: string;
  name: string;
  serviceDays: number[]; // 0 for Sunday, 3 for Wed, etc.
  pastorPhone: string;
}

export interface Nucleo {
  id: string;
  name: string;
  color?: string; // Tailwind color name (e.g., 'rose', 'amber')
}

export type MemberRole = 'Membro' | 'Obreiro/Líder' | 'Voluntário';

export interface Member {
  id: string;
  name: string;
  nucleoId: string; // Mantido para compatibilidade, mas usado como fallback
  generation?: string; // Novo campo: Berçário, Kids, Teens, Jovens, Homens, Mulheres, Anciões
  role?: MemberRole; // Novo campo: Membro, Obreiro/Líder, Voluntário
  unitId: string;
  active: boolean;
  notes?: string;
  startDate?: string; // YYYY-MM-DD
}

export interface AttendanceRecord {
  id: string;
  memberId: string;
  date: string; // YYYY-MM-DD
  unitId: string;
  status: AttendanceStatus;
  justificationText?: string;
  registeredAt: number;
}

export interface CabinetFollowUp {
  memberId: string;
  period: string; // YYYY-MM
  status: CabinetStatus;
  lastUpdate: number;
}

export interface AppSettings {
  justifiedCountsAsPresence: boolean;
  accessPassword?: string;
  thresholds: {
    perfect: number;
    good: number;
    low: number;
  };
}

export type AppTab = 'register' | 'dashboard' | 'members' | 'leadership' | 'followup' | 'tips' | 'settings';
