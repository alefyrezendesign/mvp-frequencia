
export enum AttendanceStatus {
  NOT_REGISTERED = 'NÃO REGISTRADO',
  PRESENT = 'PRESENTE',
  ABSENT = 'FALTOU',
  JUSTIFIED = 'JUSTIFICADO'
}

export enum CabinetStatus {
  PENDING = 'Gabinete a agendar',
  SCHEDULED = 'Gabinete agendado',
  DONE = 'Gabinete realizado'
}

export enum FrequencyCategory {
  PERFECT = 'Frequência Perfeita',
  GOOD = 'Frequência Boa',
  LOW = 'Frequência Baixa',
  CRITICAL = 'Frequência Crítica'
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

export interface Member {
  id: string;
  name: string;
  nucleoId: string;
  unitId: string;
  active: boolean;
  notes?: string;
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

export type AppTab = 'register' | 'dashboard' | 'members' | 'followup' | 'tips' | 'settings';
