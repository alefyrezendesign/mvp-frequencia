
import React, { useMemo, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { format, subMonths, addMonths, endOfMonth, eachDayOfInterval, getDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, TrendingUp, Users, MessageSquare, Percent, X, Calendar, CheckCircle2 } from 'lucide-react';
import { Unit, FrequencyCategory, AttendanceStatus, Member, AttendanceRecord } from '../types';
import { calculateAttendance, getAbsenceCategory } from '../utils';

interface DashboardViewProps {
  store: any;
  selectedUnit: Unit;
}

const DashboardView: React.FC<DashboardViewProps> = ({ store, selectedUnit }) => {
  const [selectedMonthDate, setSelectedMonthDate] = useState(new Date());
  const [showJustificationModal, setShowJustificationModal] = useState(false);
  const currentMonthStr = format(selectedMonthDate, 'yyyy-MM');

  const unitMembers = useMemo(() =>
    store.members.filter((m: Member) => m.unitId === selectedUnit.id && m.active),
    [store.members, selectedUnit.id]);

  const stats = useMemo(() => {
    const validDates = getValidServiceDates(selectedUnit.id, currentMonthStr, selectedUnit.serviceDays);
    const totalServices = validDates.length;

    let totalPresencesInMonth = 0;
    let totalJustificationsInMonth = 0;

    const memberStats = unitMembers.map((m: Member) => {
      const records = store.attendance.filter((r: AttendanceRecord) => {
        const isSameUnit = r.unitId === selectedUnit.id;
        const isMember = r.memberId === m.id;
        const isInMonth = r.Data.startsWith(currentMonthStr);
        return isSameUnit && isMember && isInMonth;
      });

      const attendance = calculateAttendance(records, totalServices, store.settings);
      // Lógica baseada estritamente em faltas
      const cat = getAbsenceCategory(attendance.absences);

      totalPresencesInMonth += attendance.presences;
      totalJustificationsInMonth += attendance.justifications;

      return {
        ...m,
        ...attendance,
        categoryLabel: cat.label,
        categoryColor: cat.color,
        categoryBg: cat.bg
      };
    });

    const counts = {
      [FrequencyCategory.PERFECT]: 0,
      [FrequencyCategory.GOOD]: 0,
      [FrequencyCategory.LOW]: 0,
      [FrequencyCategory.CRITICAL]: 0,
    };

    memberStats.forEach(m => {
      counts[m.categoryLabel as keyof typeof counts]++;
    });

    const chartData = [
      { name: 'Perfeita', value: counts[FrequencyCategory.PERFECT], color: '#10b981' },
      { name: 'Boa', value: counts[FrequencyCategory.GOOD], color: '#3b82f6' },
      { name: 'Baixa', value: counts[FrequencyCategory.LOW], color: '#f59e0b' },
      { name: 'Crítica', value: counts[FrequencyCategory.CRITICAL], color: '#ef4444' },
    ];

    const totalPotentialAttendances = totalServices * unitMembers.length;
    const globalAttendanceRate = totalPotentialAttendances > 0
      ? (totalPresencesInMonth / totalPotentialAttendances) * 100
      : 0;

    return { totalServices, memberStats, chartData, counts, totalJustificationsInMonth, globalAttendanceRate };
  }, [currentMonthStr, selectedUnit, unitMembers, store.attendance, store.settings]);

  const monthJustifications = useMemo(() => {
    return store.attendance
      .filter((r: AttendanceRecord) =>
        r.unitId === selectedUnit.id &&
        r.Data.startsWith(currentMonthStr) &&
        r.Status === AttendanceStatus.JUSTIFIED
      )
      .map((r: AttendanceRecord) => ({
        ...r,
        memberName: store.members.find((m: Member) => m.id === r.memberId)?.name || 'Membro desconhecido'
      }))
      .sort((a: any, b: any) => b.Data.localeCompare(a.Data));
  }, [store.attendance, selectedUnit.id, currentMonthStr, store.members]);

  const priorityAttention = useMemo(() =>
    stats.memberStats
      .filter(m => m.categoryLabel === FrequencyCategory.CRITICAL || m.categoryLabel === FrequencyCategory.LOW)
      .sort((a, b) => {
        // Crítica (mais faltas) primeiro
        if (a.categoryLabel === FrequencyCategory.CRITICAL && b.categoryLabel !== FrequencyCategory.CRITICAL) return -1;
        if (a.categoryLabel !== FrequencyCategory.CRITICAL && b.categoryLabel === FrequencyCategory.CRITICAL) return 1;
        return b.absences - a.absences;
      }),
    [stats.memberStats]);

  const positiveEngagement = useMemo(() =>
    stats.memberStats
      .filter(m => m.categoryLabel === FrequencyCategory.GOOD || m.categoryLabel === FrequencyCategory.PERFECT)
      .sort((a, b) => a.absences - b.absences),
    [stats.memberStats]);

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Dashboard Mensal</h2>
        <span className="text-[10px] bg-zinc-900 border border-zinc-800 text-purple-400 px-3 py-1 rounded-full font-black uppercase tracking-widest">
          {selectedUnit.name}
        </span>
      </div>

      <div className="flex items-center justify-between bg-zinc-900 border border-zinc-800 p-4 rounded-2xl shadow-sm">
        <button onClick={() => setSelectedMonthDate(subMonths(selectedMonthDate, 1))} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="text-center">
          <span className="text-base font-bold text-white capitalize">{format(selectedMonthDate, 'MMMM yyyy', { locale: ptBR })}</span>
        </div>
        <button onClick={() => setSelectedMonthDate(addMonths(selectedMonthDate, 1))} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400">
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <SummaryCard label="Cultos" value={stats.totalServices} icon={<TrendingUp className="w-4 h-4 text-purple-400" />} />
        <SummaryCard label="Membros" value={unitMembers.length} icon={<Users className="w-4 h-4 text-blue-400" />} />
        <SummaryCard label="Justificativas" value={stats.totalJustificationsInMonth} icon={<MessageSquare className="w-4 h-4 text-amber-400" />} clickable onClick={() => setShowJustificationModal(true)} subText="Ver lista" />
        <SummaryCard label="% Presença" value={`${stats.globalAttendanceRate.toFixed(0)}%`} icon={<Percent className="w-4 h-4 text-emerald-400" />} />
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
        <h3 className="text-[10px] font-black text-zinc-500 mb-6 uppercase tracking-widest text-center">Saúde da Frequência</h3>

        {/* Container com altura fixa para evitar warnings de ResponsiveContainer */}
        <div className="h-[200px] w-full min-h-[200px] relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={stats.chartData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={75}
                paddingAngle={8}
                dataKey="value"
                stroke="none"
                animationDuration={800}
              >
                {stats.chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '12px' }} itemStyle={{ fontSize: '12px', fontWeight: 'bold' }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-2xl font-black text-white">{unitMembers.length}</span>
            <span className="text-[8px] text-zinc-500 font-bold uppercase">Membros</span>
          </div>
        </div>

        {/* Contadores detalhados abaixo do gráfico */}
        <div className="grid grid-cols-2 gap-3 mt-6">
          {stats.chartData.map(item => (
            <div key={item.name} className="flex items-center justify-between bg-zinc-800/40 p-3 rounded-xl border border-zinc-800/50">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">{item.name}</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-xs font-black text-white leading-none">{item.value}</span>
                <span className="text-[8px] text-zinc-600 font-bold">pessoas</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Lista Principal: Atenção Prioritária (Crítica e Baixa) */}
      <div className="space-y-3">
        <h3 className="text-[10px] font-black text-rose-500 uppercase tracking-widest px-2 flex items-center gap-2">
          <Calendar className="w-3 h-3" /> Atenção Prioritária (3+ faltas)
        </h3>
        {priorityAttention.length > 0 ? priorityAttention.map(m => (
          <div key={m.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400 font-black text-xs">
                {m.name.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="font-bold text-zinc-100 text-sm leading-tight">{m.name}</p>
                <p className={`text-[10px] font-bold ${m.categoryLabel === FrequencyCategory.CRITICAL ? 'text-rose-500' : 'text-amber-500'}`}>
                  {m.absences} faltas no mês
                </p>
              </div>
            </div>
            <div className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-tighter ${m.categoryColor} ${m.categoryBg} border border-current opacity-80`}>
              {m.categoryLabel.split(' ')[1]}
            </div>
          </div>
        )) : (
          <div className="p-8 text-center bg-zinc-900/20 border border-dashed border-zinc-800 rounded-3xl">
            <p className="text-[10px] text-zinc-600 font-bold uppercase">Nenhum membro crítico este mês</p>
          </div>
        )}
      </div>

      {/* Lista Secundária: Frequência Positiva (Boa e Perfeita) */}
      <div className="space-y-3 pt-2">
        <h3 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest px-2 flex items-center gap-2">
          <CheckCircle2 className="w-3 h-3" /> Frequência Positiva (0-2 faltas)
        </h3>
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="grid grid-cols-1 divide-y divide-zinc-800/50">
            {positiveEngagement.map(m => (
              <div key={m.id} className="px-4 py-3 flex items-center justify-between group hover:bg-zinc-800/30 transition-colors">
                <span className="text-xs font-medium text-zinc-300">{m.name}</span>
                <div className="flex items-center gap-3">
                  <span className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest">
                    {m.absences} {m.absences === 1 ? 'falta' : 'faltas'}
                  </span>
                  <div className={`w-1.5 h-1.5 rounded-full ${m.categoryLabel === FrequencyCategory.PERFECT ? 'bg-emerald-500' : 'bg-blue-500'}`} />
                </div>
              </div>
            ))}
            {positiveEngagement.length === 0 && (
              <div className="p-4 text-center text-[10px] text-zinc-600 font-bold uppercase italic">
                Sem registros positivos
              </div>
            )}
          </div>
        </div>
      </div>

      {showJustificationModal && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="font-bold text-lg">Justificativas</h3>
              <button onClick={() => setShowJustificationModal(false)} className="p-2 bg-zinc-800 rounded-full text-zinc-400"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {monthJustifications.length > 0 ? monthJustifications.map((item: any) => (
                <div key={item.id} className="bg-zinc-800/40 border border-zinc-800 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-white">{item.memberName}</span>
                    <span className="text-amber-400 text-[10px] font-bold tracking-widest uppercase">
                      {format(parseISO(item.Data), "dd MMM", { locale: ptBR })}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 italic">"{item.justificacaoTexto || 'Sem descrição detalhada'}"</p>
                </div>
              )) : (
                <div className="py-10 text-center text-zinc-500">Nenhuma justificativa neste mês.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const SummaryCard = ({ label, value, icon, clickable, onClick, subText }: { label: string, value: string | number, icon: React.ReactNode, clickable?: boolean, onClick?: () => void, subText?: string }) => (
  <button disabled={!clickable} onClick={onClick} className={`bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-center gap-3 text-left transition-all ${clickable ? 'active:scale-95 hover:bg-zinc-800/50' : ''}`}>
    <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center shrink-0 border border-zinc-800/50">{icon}</div>
    <div className="overflow-hidden">
      <p className="text-[9px] text-zinc-500 uppercase font-black tracking-widest truncate">{label}</p>
      <p className="text-xl font-black text-white leading-tight">{value}</p>
      {subText && <p className="text-[8px] text-purple-400 font-bold uppercase mt-0.5">{subText}</p>}
    </div>
  </button>
);

const getValidServiceDates = (unitId: string, monthStr: string, serviceDays: number[]) => {
  const [year, month] = monthStr.split('-').map(Number);
  const start = new Date(year, month - 1, 1);
  const end = endOfMonth(start);
  const days = eachDayOfInterval({ start, end });
  return days.filter(day => serviceDays.includes(getDay(day)));
};

export default DashboardView;
