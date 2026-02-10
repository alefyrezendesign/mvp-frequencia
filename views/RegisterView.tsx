
import React, { useState, useMemo, useEffect } from 'react';
import { Search, Check, X, MessageSquare, FileText, CheckCircle2, ChevronRight, AlertTriangle, ChevronLeft, Clock, ListChecks, Eraser, Loader2 } from 'lucide-react';
import { AttendanceStatus, Member, Unit } from '../types';
import { getStatusColor, getValidServiceDates } from '../utils';
import { format, parseISO, addMonths, subMonths, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { GENERATIONS, GENERATION_COLORS, GenerationType } from '../constants';

interface RegisterViewProps {
  store: any;
  selectedUnit: Unit;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
}

const RegisterView: React.FC<RegisterViewProps> = ({ store, selectedUnit, selectedDate, setSelectedDate }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGeneration, setFilterGeneration] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showJustifyModal, setShowJustifyModal] = useState<string | null>(null);
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [justificationText, setJustificationText] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => setShowToast(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  const currentMonthDate = parseISO(selectedDate);
  const monthDisplay = format(currentMonthDate, 'MMMM yyyy', { locale: ptBR });

  const validDates = useMemo(() => {
    const monthStr = format(currentMonthDate, 'yyyy-MM');
    return getValidServiceDates(selectedUnit.id, monthStr, selectedUnit.serviceDays);
  }, [selectedUnit.id, currentMonthDate, selectedUnit.serviceDays]);

  const handleMonthChange = (direction: 'prev' | 'next') => {
    const nextMonth = direction === 'next' ? addMonths(currentMonthDate, 1) : subMonths(currentMonthDate, 1);
    const monthStr = format(nextMonth, 'yyyy-MM');
    const datesInNextMonth = getValidServiceDates(selectedUnit.id, monthStr, selectedUnit.serviceDays);
    if (datesInNextMonth.length > 0) {
      setSelectedDate(format(datesInNextMonth[0], 'yyyy-MM-dd'));
    } else {
      setSelectedDate(format(startOfMonth(nextMonth), 'yyyy-MM-dd'));
    }
  };

  const unitMembers = useMemo(() =>
    store.members.filter((m: Member) => m.unitId === selectedUnit.id && m.active),
    [store.members, selectedUnit.id]);

  const records = useMemo(() =>
    store.attendance.filter((r: any) => r.unitId === selectedUnit.id && r.date === selectedDate),
    [store.attendance, selectedUnit.id, selectedDate]);

  const currentAttendance = useMemo(() => {
    const present = records.filter((r: any) => r.status === AttendanceStatus.PRESENT).length;
    const absent = records.filter((r: any) => r.status === AttendanceStatus.ABSENT).length;
    const justified = records.filter((r: any) => r.status === AttendanceStatus.JUSTIFIED).length;
    const total = unitMembers.length;
    const registered = records.length;
    const notRegistered = total - registered;
    const presenceRate = total > 0 ? (present / total) * 100 : 0;
    return { present, absent, justified, notRegistered, presenceRate };
  }, [records, unitMembers]);

  const isDateCompleted = (dateStr: string) => {
    const count = store.attendance.filter((r: any) => r.unitId === selectedUnit.id && r.date === dateStr).length;
    return unitMembers.length > 0 && count >= unitMembers.length;
  };

  const dateHasJustification = (dateStr: string) => {
    return store.attendance.some((r: any) =>
      r.unitId === selectedUnit.id &&
      r.date === dateStr &&
      r.status === AttendanceStatus.JUSTIFIED
    );
  };

  // Separação dos membros em Pendentes e Concluídos
  const { pendingMembers, completedMembers } = useMemo(() => {
    let all = unitMembers.map((m: Member) => {
      const record = records.find((r: any) => r.memberId === m.id);
      return { ...m, status: record?.status || AttendanceStatus.NOT_REGISTERED };
    });

    if (searchTerm) all = all.filter((m: any) => m.name.toLowerCase().includes(searchTerm.toLowerCase()));
    if (filterGeneration !== 'all') all = all.filter((m: any) => m.generation === filterGeneration);
    if (filterStatus !== 'all') all = all.filter((m: any) => m.status === filterStatus);

    const pending = all.filter((m: any) => m.status === AttendanceStatus.NOT_REGISTERED)
      .sort((a: any, b: any) => a.name.localeCompare(b.name));

    const completed = all.filter((m: any) => m.status !== AttendanceStatus.NOT_REGISTERED)
      .sort((a: any, b: any) => a.name.localeCompare(b.name));

    return { pendingMembers: pending, completedMembers: completed };
  }, [unitMembers, records, searchTerm, filterGeneration, filterStatus]);

  const handleStatusUpdate = (memberId: string, newStatus: AttendanceStatus, currentStatus: AttendanceStatus, text?: string) => {
    const finalStatus = currentStatus === newStatus ? AttendanceStatus.NOT_REGISTERED : newStatus;
    store.updateAttendance({
      memberId,
      date: selectedDate,
      unitId: selectedUnit.id,
      status: finalStatus,
      justificationText: finalStatus === AttendanceStatus.JUSTIFIED ? text : undefined
    });
  };

  const handleClearDay = async () => {
    setIsClearing(true);
    try {
      await store.clearAttendanceForDate(selectedUnit.id, selectedDate);
      setShowClearModal(false);
      setShowToast(true);
    } catch (error) {
      alert('Erro ao limpar dia. Tente novamente.');
    } finally {
      setIsClearing(false);
    }
  };

  const hasRecordsToday = records.length > 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] bg-emerald-600 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-2 animate-in slide-in-from-top duration-300">
          <CheckCircle2 className="w-5 h-5" />
          <span className="text-sm font-bold">Registro atualizado!</span>
        </div>
      )}

      {/* BLOCO DE DATA E ESTATÍSTICAS - ROLA COM A TELA */}
      <div className="flex flex-col gap-4 mb-2 animate-in fade-in duration-500">
        <div className="flex items-center justify-between w-full px-1">
          <button onClick={() => handleMonthChange('prev')} className="p-2 hover:bg-zinc-900 rounded-full text-zinc-600 transition-colors" title="Mês Anterior">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h2 className="text-[12px] font-black uppercase tracking-[0.2em] text-zinc-400 capitalize">
            {monthDisplay}
          </h2>
          <button onClick={() => handleMonthChange('next')} className="p-2 hover:bg-zinc-900 rounded-full text-zinc-600 transition-colors" title="Próximo Mês">
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>

        <div className="flex flex-wrap justify-center gap-2 w-full md:flex-nowrap">
          {validDates.map(date => {
            const dStr = format(date, 'yyyy-MM-dd');
            const isActive = dStr === selectedDate;
            const completed = isDateCompleted(dStr);
            const hasJustification = dateHasJustification(dStr);
            const dayOfWeek = format(date, 'EEE', { locale: ptBR }).toUpperCase().replace('.', '').substring(0, 3);
            const dayOfMonth = format(date, 'dd');

            return (
              <button
                key={dStr}
                onClick={() => setSelectedDate(dStr)}
                className={`relative flex flex-col items-center justify-center w-[calc(20%-8px)] md:w-28 aspect-square rounded-2xl transition-all duration-300 border ${isActive
                  ? 'bg-purple-600 border-purple-400 text-white shadow-lg shadow-purple-600/30 scale-105 z-10'
                  : completed
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
                    : 'bg-zinc-900/50 border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:bg-zinc-800'
                  }`}
              >
                {/* Container de indicadores no canto superior direito */}
                <div className="absolute -top-1.5 -right-1.5 flex items-center gap-0.5">
                  {hasJustification && (
                    <div className={`p-0.5 rounded-full shadow-sm flex items-center justify-center ${isActive ? 'bg-white' : 'bg-black'}`}>
                      <FileText className={`w-3 h-3 ${isActive ? 'text-amber-500' : 'text-amber-400'}`} fill="currentColor" fillOpacity={0.2} />
                    </div>
                  )}
                  {completed && (
                    <CheckCircle2 className={`w-4 h-4 fill-black transition-all ${isActive ? 'text-white fill-purple-600' : 'text-emerald-500'}`} />
                  )}
                </div>

                <span className={`text-[9px] font-black tracking-widest mb-0.5 ${isActive ? 'text-purple-100' : 'text-zinc-600'}`}>
                  {dayOfWeek}
                </span>
                <span className="text-base font-black leading-none">{dayOfMonth}</span>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-5 gap-2 w-full">
          <StatCard label="Pres." value={currentAttendance.present} color="text-emerald-400" />
          <StatCard label="Faltas" value={currentAttendance.absent} color="text-rose-400" />
          <StatCard label="Just." value={currentAttendance.justified} color="text-amber-400" />
          <StatCard label="Pend." value={currentAttendance.notRegistered} color="text-zinc-500" />
          <StatCard label="Freq." value={`${currentAttendance.presenceRate.toFixed(0)}%`} color="text-purple-400" />
        </div>
      </div>

      {/* LISTA DE PENDENTES */}
      <div className="space-y-4">
        <div className="flex items-center justify-between py-2 border-b border-zinc-900/50 mt-2">
          <div className="flex items-center gap-2">
            <Clock className="w-3 h-3 text-purple-400" />
            <h3 className="text-[10px] font-black text-zinc-300 uppercase tracking-widest">
              Chamada ({pendingMembers.length} Pendentes)
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {hasRecordsToday && (
              <button
                onClick={() => setShowClearModal(true)}
                className="p-1.5 hover:bg-amber-500/10 rounded-lg text-zinc-600 hover:text-amber-500 transition-all active:scale-95"
                title="Reiniciar frequência do dia"
              >
                <Eraser className="w-4 h-4" />
              </button>
            )}
            {pendingMembers.length > 0 && (
              <button
                onClick={() => setShowFinalizeModal(true)}
                className="flex items-center gap-2 bg-purple-600/10 border border-purple-600/20 px-3 py-1.5 rounded-full text-[10px] font-black text-purple-400 uppercase hover:bg-purple-600 hover:text-white transition-all active:scale-95"
              >
                Faltas em Massa <ChevronRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {pendingMembers.map((member: any) => (
            <MemberCard
              key={member.id}
              member={member}
              store={store}
              onStatusUpdate={handleStatusUpdate}
              onJustify={() => { setShowJustifyModal(member.id); setJustificationText(''); }}
            />
          ))}
          {pendingMembers.length === 0 && (
            <div className="py-8 text-center bg-zinc-900/10 border border-dashed border-zinc-800 rounded-3xl">
              <p className="text-[10px] text-zinc-600 font-bold uppercase">Todos os membros foram marcados!</p>
            </div>
          )}
        </div>
      </div>

      {/* LISTA DE CONCLUÍDOS */}
      {completedMembers.length > 0 && (
        <div className="space-y-4 mt-6">
          <div className="flex items-center gap-2 py-2 border-b border-zinc-900/50">
            <ListChecks className="w-3 h-3 text-emerald-500" />
            <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
              Chamada Realizada / Concluídos ({completedMembers.length})
            </h3>
          </div>

          <div className="space-y-3 opacity-80">
            {completedMembers.map((member: any) => {
              const currentRecord = records.find((r: any) => r.memberId === member.id);
              return (
                <MemberCard
                  key={member.id}
                  member={member}
                  store={store}
                  onStatusUpdate={handleStatusUpdate}
                  onJustify={() => { setShowJustifyModal(member.id); setJustificationText(currentRecord?.justificationText || ''); }}
                  showJustificationIcon={member.status === AttendanceStatus.JUSTIFIED}
                  justificationText={currentRecord?.justificationText}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Floating Action Search Button */}
      <button onClick={() => setIsSearchOpen(!isSearchOpen)} className={`fixed right-6 bottom-28 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 ${isSearchOpen ? 'bg-zinc-800 rotate-90 text-zinc-100' : 'bg-purple-600 text-white shadow-purple-600/40 hover:bg-purple-500'}`} aria-label={isSearchOpen ? "Fechar Busca" : "Abrir Busca"}>
        {isSearchOpen ? <X className="w-6 h-6" /> : <Search className="w-6 h-6" />}
      </button>

      {/* Modals... */}
      {showClearModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-sm rounded-3xl p-8 text-center shadow-2xl animate-in zoom-in-95">
            <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Eraser className="w-8 h-8 text-amber-500" />
            </div>
            <h3 className="text-xl font-black text-white mb-2">Reiniciar Dia?</h3>
            <p className="text-sm text-zinc-500 mb-8 font-medium">
              Deseja <strong>reiniciar</strong> a chamada de hoje? Isso limpará todas as marcações atuais para que você possa começar de novo.
            </p>
            <div className="space-y-3">
              <button
                onClick={handleClearDay}
                disabled={isClearing}
                className="w-full bg-amber-600 hover:bg-amber-500 py-4 rounded-2xl font-black text-xs uppercase text-white shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isClearing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sim, reiniciar'}
              </button>
              <button
                onClick={() => setShowClearModal(false)}
                disabled={isClearing}
                className="w-full bg-zinc-800 hover:bg-zinc-700 py-4 rounded-2xl font-black text-xs uppercase text-zinc-400 transition-all disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {showFinalizeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-sm rounded-3xl p-8 text-center shadow-2xl animate-in zoom-in-95">
            <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-8 h-8 text-amber-500" />
            </div>
            <h3 className="text-xl font-black text-white mb-2">Marcar Faltas?</h3>
            <p className="text-sm text-zinc-500 mb-8 font-medium">Deseja marcar os {pendingMembers.length} membros restantes como FALTA?</p>
            <div className="space-y-3">
              <button onClick={() => {
                store.batchUpdateAttendance(pendingMembers.map((m: any) => ({
                  id: Math.random().toString(36).substr(2, 9),
                  memberId: m.id,
                  date: selectedDate,
                  unitId: selectedUnit.id,
                  status: AttendanceStatus.ABSENT,
                  registeredAt: Date.now()
                })));
                setShowFinalizeModal(false); setShowToast(true);
              }} className="w-full bg-purple-600 hover:bg-purple-500 py-4 rounded-2xl font-black text-xs uppercase text-white shadow-lg transition-all active:scale-95">Sim, marcar faltas</button>
              <button onClick={() => setShowFinalizeModal(false)} className="w-full bg-zinc-800 hover:bg-zinc-700 py-4 rounded-2xl font-black text-xs uppercase text-zinc-400 transition-all">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {showJustifyModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-zinc-900 w-full max-w-md rounded-2xl p-6 border border-zinc-800 shadow-2xl">
            <h2 className="text-lg font-bold mb-4 text-white">Justificativa</h2>
            <textarea autoFocus className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-4 text-sm min-h-[140px] text-white outline-none focus:ring-1 focus:ring-purple-600" placeholder="Motivo da falta..." value={justificationText} onChange={(e) => setJustificationText(e.target.value)} />
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowJustifyModal(null)} className="flex-1 py-3 text-zinc-500 font-bold uppercase text-xs hover:text-zinc-300">Cancelar</button>
              <button onClick={() => { store.updateAttendance({ memberId: showJustifyModal, date: selectedDate, unitId: selectedUnit.id, status: AttendanceStatus.JUSTIFIED, justificationText }); setShowJustifyModal(null); setShowToast(true); }} className="flex-1 bg-purple-600 py-3 rounded-xl font-bold text-sm shadow-lg text-white uppercase text-xs hover:bg-purple-500 active:scale-95 transition-all">Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {isSearchOpen && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm pt-40 px-6 animate-in fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl max-w-lg mx-auto animate-in slide-in-from-top-4">
            <div className="flex justify-between items-center mb-4"><h3 className="text-xs font-black text-zinc-500 uppercase">Filtrar Chamada</h3><button onClick={() => setIsSearchOpen(false)} aria-label="Fechar Busca"><X className="w-4 h-4" /></button></div>
            <div className="space-y-4">
              <input autoFocus type="text" placeholder="Pesquisar nome..." className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-3 px-4 text-sm text-white focus:border-purple-600 outline-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              <div className="grid grid-cols-2 gap-3">
                <select className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-xs text-zinc-300 outline-none" value={filterGeneration} onChange={(e) => setFilterGeneration(e.target.value)} aria-label="Filtrar por Geração"><option value="all">Todas Gerações</option>{GENERATIONS.map((g) => <option key={g} value={g}>{g}</option>)}</select>
                <select className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-xs text-zinc-300 outline-none" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} aria-label="Filtrar por Status"><option value="all">Todos Status</option>{Object.values(AttendanceStatus).map(s => <option key={s} value={s}>{s}</option>)}</select>
              </div>
              <button onClick={() => setIsSearchOpen(false)} className="w-full bg-purple-600 hover:bg-purple-500 py-3 rounded-xl font-bold text-sm text-white uppercase tracking-widest active:scale-[0.98] transition-all">Ver Resultados</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Componente Interno para o Card do Membro
const MemberCard = ({ member, store, onStatusUpdate, onJustify, showJustificationIcon, justificationText }: any) => {
  return (
    <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-4 flex flex-col gap-3 transition-all hover:border-zinc-700/80">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h3 className="font-semibold text-zinc-100 text-base leading-tight mb-1">{member.name}</h3>
          <div className="flex flex-wrap gap-2">
            <span className={`text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold border ${GENERATION_COLORS[member.generation as GenerationType] || 'text-zinc-500 border-zinc-700 bg-zinc-800'}`}>
              {member.generation || 'Sem Geração'}
            </span>
            <span className={`text-[9px] px-2 py-0.5 rounded-full border ${getStatusColor(member.status)} uppercase font-bold`}>{member.status}</span>
          </div>
        </div>
        {showJustificationIcon && (
          <button onClick={onJustify} className="p-2 bg-zinc-800/50 rounded-xl group active:scale-95 transition-all hover:bg-zinc-800" aria-label="Justificar Falta">
            <FileText className="w-5 h-5 text-amber-500 group-hover:text-amber-400" />
          </button>
        )}
      </div>
      <div className="flex gap-2 mt-1">
        <ActionButton onClick={() => onStatusUpdate(member.id, AttendanceStatus.PRESENT, member.status)} active={member.status === AttendanceStatus.PRESENT} variant="present">
          <Check className="w-4 h-4 mr-1" /> Presença
        </ActionButton>
        <ActionButton onClick={() => onStatusUpdate(member.id, AttendanceStatus.ABSENT, member.status)} active={member.status === AttendanceStatus.ABSENT} variant="absent">
          <X className="w-4 h-4 mr-1" /> Falta
        </ActionButton>
        <ActionButton onClick={onJustify} active={member.status === AttendanceStatus.JUSTIFIED} variant="justified">
          <MessageSquare className="w-4 h-4 mr-1" /> Justif.
        </ActionButton>
      </div>
      {justificationText && member.status === AttendanceStatus.JUSTIFIED && (
        <p className="text-[10px] text-zinc-500 italic mt-1 px-1 border-l border-zinc-800">"{justificationText}"</p>
      )}
    </div>
  );
};

const StatCard = ({ label, value, color }: { label: string, value: string | number, color: string }) => (
  <div className="bg-zinc-900/50 rounded-xl p-2 flex flex-col items-center justify-center border border-zinc-800/30">
    <span className={`text-[12px] font-black ${color}`}>{value}</span>
    <span className="text-[8px] text-zinc-600 uppercase tracking-tighter font-bold">{label}</span>
  </div>
);

const ActionButton = ({ children, onClick, active, variant }: any) => {
  const styles = {
    present: active
      ? 'bg-emerald-600 text-white border-emerald-500 shadow-lg shadow-emerald-600/20'
      : 'bg-zinc-800 text-zinc-500 border-transparent hover:bg-zinc-700/80 hover:border-emerald-500/30 hover:text-emerald-400',
    absent: active
      ? 'bg-rose-600 text-white border-rose-500 shadow-lg shadow-rose-600/20'
      : 'bg-zinc-800 text-zinc-500 border-transparent hover:bg-zinc-700/80 hover:border-rose-500/30 hover:text-rose-400',
    justified: active
      ? 'bg-amber-600 text-white border-amber-500 shadow-lg shadow-amber-600/20'
      : 'bg-zinc-800 text-zinc-500 border-transparent hover:bg-zinc-700/80 hover:border-amber-500/30 hover:text-amber-400',
  };
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center py-2.5 rounded-xl text-[10px] font-black border transition-all active:scale-[0.98] ${styles[variant as keyof typeof styles]}`}
    >
      {children}
    </button>
  );
};

export default RegisterView;
