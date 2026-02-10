
import { format, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, getDay, parseISO } from 'date-fns';
import { AttendanceStatus, FrequencyCategory, AppSettings, AttendanceRecord } from './types';

export const getStatusColor = (status: AttendanceStatus) => {
  switch (status) {
    case AttendanceStatus.PRESENT: return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    case AttendanceStatus.ABSENT: return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
    case AttendanceStatus.JUSTIFIED: return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    default: return 'bg-zinc-800 text-zinc-400 border-zinc-700';
  }
};

export const getNucleoColor = (colorName: string = 'zinc') => {
  const mapping: Record<string, string> = {
    pink: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    sky: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
    indigo: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    teal: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
    zinc: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    fuchsia: 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20',
  };
  return mapping[colorName] || mapping.zinc;
};

/**
 * Lógica de categorias baseada estritamente no número de faltas do mês:
 * 0 faltas: Perfeita
 * 1-2 faltas: Boa
 * 3-4 faltas: Baixa
 * > 4 faltas: Crítica
 */
export const getAbsenceCategory = (absences: number) => {
  if (absences === 0) {
    return {
      label: FrequencyCategory.PERFECT,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      dot: 'bg-emerald-500',
      chartColor: '#10b981'
    };
  }
  if (absences <= 2) {
    return {
      label: FrequencyCategory.GOOD,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      dot: 'bg-blue-500',
      chartColor: '#3b82f6'
    };
  }
  if (absences <= 4) {
    return {
      label: FrequencyCategory.LOW,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      dot: 'bg-amber-500',
      chartColor: '#f59e0b'
    };
  }
  return {
    label: FrequencyCategory.CRITICAL,
    color: 'text-rose-400',
    bg: 'bg-rose-500/10',
    dot: 'bg-rose-500',
    chartColor: '#ef4444'
  };
};

export const getValidServiceDates = (unitId: string, monthStr: string, serviceDays: number[]) => {
  const start = startOfMonth(parseISO(`${monthStr}-01`));
  const end = endOfMonth(start);
  const days = eachDayOfInterval({ start, end });
  return days.filter(day => serviceDays.includes(getDay(day)));
};

export const calculateAttendance = (memberRecords: AttendanceRecord[], totalExpected: number, settings: AppSettings) => {
  const presences = memberRecords.filter(r => r.status === AttendanceStatus.PRESENT).length;
  const absences = memberRecords.filter(r => r.status === AttendanceStatus.ABSENT).length;
  const justifications = memberRecords.filter(r => r.status === AttendanceStatus.JUSTIFIED).length;

  let effectivePresences = presences;
  if (settings.justifiedCountsAsPresence) {
    effectivePresences += justifications;
  }

  const percent = totalExpected > 0 ? (effectivePresences / totalExpected) * 100 : 0;
  return { presences, absences, justifications, percent };
};

export const normalizePhone = (phone: string) => {
  // Remove tudo que não é número
  const digits = phone.replace(/\D/g, '');
  // Adiciona código do país Brasil (55) se não tiver (assumindo que seja BR se tiver 10 ou 11 dígitos)
  if (digits.length >= 10 && digits.length <= 11) {
    return `55${digits}`;
  }
  return digits;
};

export const generateWhatsAppLink = (
  leaderName: string,
  leaderPhone: string,
  memberName: string,
  role: string,
  unitName: string,
  period: string,
  stats: { presences: number; absences: number; justifications: number; percent: number },
  category: string
) => {
  const phone = normalizePhone(leaderPhone);
  const faultPercent = 100 - stats.percent;

  const text = `Olá, ${leaderName}! Tudo bem?

Passando para informar a frequência de ${memberName} (${role}) na unidade ${unitName}.

No mês de ${period}, tivemos:
• ${stats.absences} faltas
• ${stats.presences} presenças
• ${stats.justifications} justificativas

Sinalizado como: ${category}
Percentual de faltas: ${faultPercent.toFixed(0)}%

Peço, por favor, que faça um contato e alinhe uma conversa com ${memberName} para entendermos o que está acontecendo e então ajudarmos a regularizar a frequência.

Obrigado(a)!`;

  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
};
