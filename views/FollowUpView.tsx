
import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, ChevronLeft, ChevronRight, CheckCircle2, Clock, X, Copy, Check, ChevronDown } from 'lucide-react';
import { AttendanceStatus, CabinetStatus, Unit, Member, FrequencyCategory, AttendanceRecord, CabinetFollowUp, Leader } from '../types';
import { calculateAttendance, getValidServiceDates, getAbsenceCategory, generateWhatsAppLink } from '../utils';
import { GENERATION_COLORS, GenerationType } from '../constants';
import { format, subMonths, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface FollowUpViewProps {
  store: any;
  selectedUnit: Unit;
}

const FollowUpView: React.FC<FollowUpViewProps> = ({ store, selectedUnit }) => {
  const [selectedMonthDate, setSelectedMonthDate] = useState(new Date());
  const [copyModalData, setCopyModalData] = useState<{ isOpen: boolean; text: string; copied: boolean }>({
    isOpen: false,
    text: '',
    copied: false
  });

  const currentMonthStr = format(selectedMonthDate, 'yyyy-MM');

  const allFollowUps = useMemo(() => {
    const validDates = getValidServiceDates(selectedUnit.id, currentMonthStr, selectedUnit.serviceDays);
    const totalServices = validDates.length;

    return store.members
      .filter((m: Member) => m.unitId === selectedUnit.id && m.active)
      .map((m: Member) => {
        const records = store.attendance.filter((r: AttendanceRecord) =>
          r.memberId === m.id && r.date.startsWith(currentMonthStr)
        );

        // Calculate totalExpected services for this specific member based on their start_date
        const memberValidDates = validDates.filter(d => {
          if (!m.startDate) return true; // If no start date, count all valid dates for the unit
          return format(d, 'yyyy-MM-dd') >= m.startDate;
        });

        const totalExpected = memberValidDates.length;

        // Calculate Presences (only for dates valid for this member)
        const presences = records.filter((r: any) =>
          r.memberId === m.id &&
          r.status === AttendanceStatus.PRESENT &&
          (!m.startDate || r.date >= m.startDate)
        ).length;

        const justifications = records.filter((r: any) =>
          r.memberId === m.id &&
          r.status === AttendanceStatus.JUSTIFIED &&
          (!m.startDate || r.date >= m.startDate)
        ).length;

        // Calculate Absences (considering only dates that have passed AND are valid for the member)
        // If the record exists as ABSENT or if the date has passed and there's no record (but here the system forces a record in the App).
        // We will rely on ABSENT records, but filter by the start date.

        const absences = records.filter((r: any) =>
          r.memberId === m.id &&
          r.status === AttendanceStatus.ABSENT &&
          (!m.startDate || r.date >= m.startDate)
        ).length;

        let effectivePresences = presences;
        if (store.settings.justifiedCountsAsPresence) {
          effectivePresences += justifications;
        }

        const percent = totalExpected > 0 ? (effectivePresences / totalExpected) * 100 : 0; // Ex: 0/0 = 100% or 0? 0/0 is technically undefined, but for UX: new member with no services = 100% or 0%? Let's go with 100% initially or -
        const displayPercent = totalExpected === 0 ? 100 : percent;

        const cabinetInfo = store.cabinet.find((c: CabinetFollowUp) => c.memberId === m.id && c.period === currentMonthStr);

        return {
          ...m,
          stats: { presences, absences, justifications, percent: displayPercent, totalExpected },
          category: getAbsenceCategory(absences), // Category based on absences
          cabinetStatus: cabinetInfo?.status || CabinetStatus.AGUARDANDO
        };
      })
      .sort((a: any, b: any) => {
        // Sort Priority:
        // 1. Critical Status First
        // 2. Number of Absences (Descending)
        // 3. Name (Ascending)

        const isACritical = a.category.label === FrequencyCategory.CRITICAL;
        const isBCritical = b.category.label === FrequencyCategory.CRITICAL;

        if (isACritical && !isBCritical) return -1;
        if (!isACritical && isBCritical) return 1;

        if (b.stats.absences !== a.stats.absences) {
          return b.stats.absences - a.stats.absences;
        }

        return a.name.localeCompare(b.name);
      })
      // Filtrar membros com 3 faltas ou mais (Categorias Baixa e Crítica)
      .filter((m: any) => m.stats.absences >= 3);
  }, [store.members, store.attendance, store.cabinet, store.settings, selectedUnit, currentMonthStr]);

  const activeFollowUps = useMemo(() =>
    allFollowUps.filter((m: any) => m.cabinetStatus !== CabinetStatus.SOLUCIONADO)
      .sort((a: any, b: any) => {
        // 1. Prioridade: Frequência CRÍTICA vem sempre primeiro
        const isACritical = a.category.label === FrequencyCategory.CRITICAL;
        const isBCritical = b.category.label === FrequencyCategory.CRITICAL;

        if (isACritical && !isBCritical) return -1;
        if (!isACritical && isBCritical) return 1;

        // 2. Desempate: Maior quantidade de faltas
        return b.stats.absences - a.stats.absences;
      }),
    [allFollowUps]);

  const resolvedFollowUps = useMemo(() =>
    allFollowUps.filter((m: any) => m.cabinetStatus === CabinetStatus.SOLUCIONADO)
      .sort((a: any, b: any) => b.stats.absences - a.stats.absences),
    [allFollowUps]);

  const handleInformLeader = (member: any) => {
    // 1. Identificar Líder da Geração + Unidade
    const leader = store.leaders.find((l: Leader) => l.unitId === selectedUnit.id && l.generation === member.generation);

    // 2. Se não existir líder, mostrar alerta
    if (!leader || !leader.phone) {
      alert(`Cadastre o líder de ${member.generation} na aba Líder para usar esta função.`);
      return;
    }

    // 3. Gerar Link WhatsApp
    const link = generateWhatsAppLink(
      leader.name,
      leader.phone,
      member.name,
      member.role || 'Membro', // Passando Cargo (Role)
      selectedUnit.name,
      format(selectedMonthDate, 'MMMM/yyyy', { locale: ptBR }),
      { presences: member.presences, absences: member.absences, justifications: member.justifications, percent: member.percent },
      member.category.label
    );

    window.open(link, '_blank');
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(copyModalData.text);
      setCopyModalData(prev => ({ ...prev, copied: true }));
      setTimeout(() => {
        setCopyModalData(prev => ({ ...prev, copied: false }));
      }, 2000);
    } catch (err) {
      console.error('Falha ao copiar texto: ', err);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <motion.div
      className="space-y-6 pb-24"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Acompanhar</h2>
        <span className="text-[10px] bg-zinc-900 border border-zinc-800 text-purple-400 px-3 py-1 rounded-full font-black uppercase tracking-widest">
          {selectedUnit.name}
        </span>
      </div>

      <div className="flex items-center justify-between bg-zinc-900 border border-zinc-800 p-4 rounded-2xl shadow-sm">
        <button onClick={() => setSelectedMonthDate(subMonths(selectedMonthDate, 1))} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400" title="Mês Anterior" aria-label="Mês Anterior">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="text-center">
          <span className="text-base font-bold text-white capitalize">{format(selectedMonthDate, 'MMMM yyyy', { locale: ptBR })}</span>
        </div>
        <button onClick={() => setSelectedMonthDate(addMonths(selectedMonthDate, 1))} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400" title="Próximo Mês" aria-label="Próximo Mês">
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      <motion.div className="space-y-4" variants={itemVariants}>
        <h3 className="text-[10px] font-black text-rose-500 uppercase tracking-widest flex items-center gap-2 px-2">
          <Clock className="w-3 h-3" /> Demandas Ativas ({activeFollowUps.length})
        </h3>
        {activeFollowUps.map((member: any) => (
          <motion.div key={member.id} layout>
            <FollowUpCard
              member={member}
              store={store}
              currentMonthStr={currentMonthStr}
              onInform={handleInformLeader}
            />
          </motion.div>
        ))}
        {activeFollowUps.length === 0 && (
          <div className="py-12 text-center text-zinc-600 bg-zinc-900/20 border border-dashed border-zinc-800 rounded-3xl">
            Nenhuma demanda pendente
          </div>
        )}
      </motion.div>

      {resolvedFollowUps.length > 0 && (
        <motion.div className="space-y-4 pt-4" variants={itemVariants}>
          <h3 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-2 px-2">
            <CheckCircle2 className="w-3 h-3" /> Resolvidos ({resolvedFollowUps.length})
          </h3>
          {resolvedFollowUps.map((member: any) => (
            <FollowUpCard
              key={member.id}
              member={member}
              store={store}
              currentMonthStr={currentMonthStr}
              onInform={handleInformLeader}
              resolved
            />
          ))}
        </motion.div>
      )}

      {/* Modal de Cópia de Mensagem */}
      <AnimatePresence>
        {copyModalData.isOpen && (
          <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-300">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-zinc-900 border border-zinc-800 w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl"
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-xl font-black text-white tracking-tight">Mensagem para o Pastor</h3>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">Copie e cole no WhatsApp</p>
                </div>
                <button
                  onClick={() => setCopyModalData(prev => ({ ...prev, isOpen: false }))}
                  className="p-2 hover:bg-zinc-800 rounded-full transition-colors"
                  title="Fechar"
                  aria-label="Fechar"
                >
                  <X className="w-5 h-5 text-zinc-500" />
                </button>
              </div>

              <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 mb-8">
                <textarea
                  readOnly
                  value={copyModalData.text}
                  className="w-full bg-transparent text-xs sm:text-sm text-zinc-300 font-medium leading-relaxed resize-none outline-none min-h-[220px] custom-scrollbar"
                  title="Texto da mensagem"
                  aria-label="Texto da mensagem whatsapp"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setCopyModalData(prev => ({ ...prev, isOpen: false }))}
                  className="flex-1 py-4 text-xs font-black text-zinc-500 uppercase tracking-widest"
                >
                  Fechar
                </button>
                <button
                  onClick={handleCopyText}
                  className={`flex-[2] py-4 rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${copyModalData.copied
                    ? 'bg-emerald-600 text-white shadow-emerald-600/20'
                    : 'bg-purple-600 text-white shadow-purple-600/20 hover:bg-purple-500'
                    }`}
                >
                  {copyModalData.copied ? (
                    <>
                      <Check className="w-4 h-4" /> Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" /> Copiar Mensagem
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const FollowUpCard = ({ member, store, currentMonthStr, onInform, resolved }: any) => {
  return (
    <div className={`border rounded-2xl shadow-xl ${resolved ? 'bg-zinc-900/40 border-emerald-900/20' : 'bg-zinc-900 border-zinc-800'}`}>
      <div className="p-4 flex justify-between items-start border-b border-zinc-800/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-black text-xs text-zinc-500">{member.name.substring(0, 2).toUpperCase()}</div>
          <div>
            <h3 className="font-bold text-zinc-100 leading-tight mb-1">{member.name}</h3>
            <span className={`text-[9px] px-2 py-0.5 rounded-full uppercase font-bold border ${GENERATION_COLORS[member.generation as GenerationType] || 'text-zinc-500 border-zinc-700 bg-zinc-800'}`}>
              {member.generation || 'Sem Geração'}
            </span>
          </div>
        </div>
        <div
          className={`relative overflow-hidden px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-tighter ${member.category.color} ${member.category.bg} border border-current opacity-70`}
        >
          <span className="relative z-10">{member.category.label.split(' ')[1]}</span>
          {member.category.label === FrequencyCategory.CRITICAL && (
            <div className="absolute inset-0 animate-shimmer pointer-events-none" />
          )}
        </div>
      </div>
      <div className="p-4 grid grid-cols-2 gap-4">
        <div>
          <p className="text-[9px] text-zinc-500 uppercase font-black tracking-widest">Faltas no Mês</p>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-black text-rose-500">{member.absences}</span>
            <span className="text-[10px] text-zinc-600 font-bold uppercase">faltas</span>
          </div>
        </div>
        <div>
          <p className="text-[9px] text-zinc-500 uppercase font-black tracking-widest">Status</p>
          <StatusSelector
            currentStatus={member.cabinetStatus}
            onStatusChange={(newStatus) => store.updateCabinetStatus(member.id, currentMonthStr, newStatus)}
          />
        </div>
      </div>
      <div className="px-4 pb-4">
        <button onClick={() => onInform(member)} className="w-full rounded-xl py-3 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-500 border border-emerald-600/20 transition-all active:scale-[0.98]">
          <MessageCircle className="w-4 h-4" /> Informar Líder
        </button>
      </div>
    </div>
  );
};

export default FollowUpView;

const STATUS_CONFIG: Record<CabinetStatus, { color: string; label: string; percent: number; bgColor: string; widthClass: string }> = {
  [CabinetStatus.AGUARDANDO]: {
    color: 'text-zinc-500',
    bgColor: 'bg-zinc-500',
    label: 'Aguardando',
    percent: 0,
    widthClass: 'w-0'
  },
  [CabinetStatus.LIDER_INFORMADO]: {
    color: 'text-amber-500',
    bgColor: 'bg-amber-500',
    label: 'Líder Informado',
    percent: 33,
    widthClass: 'w-1/3'
  },
  [CabinetStatus.PRIMEIRO_CONTATO]: {
    color: 'text-blue-500',
    bgColor: 'bg-blue-500',
    label: 'Primeiro Contato',
    percent: 66,
    widthClass: 'w-2/3'
  },
  [CabinetStatus.CONVERSA_REALIZADA]: {
    color: 'text-purple-500',
    bgColor: 'bg-purple-500',
    label: 'Conversa Realizada',
    percent: 90,
    widthClass: 'w-[90%]'
  },
  [CabinetStatus.SOLUCIONADO]: {
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500',
    label: 'Solucionado',
    percent: 100,
    widthClass: 'w-full'
  }
};

const StatusSelector = ({ currentStatus, onStatusChange }: { currentStatus: CabinetStatus, onStatusChange: (status: CabinetStatus) => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const config = STATUS_CONFIG[currentStatus] || STATUS_CONFIG[CabinetStatus.AGUARDANDO];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl p-3 flex items-center justify-between gap-3 text-left transition-all hover:bg-zinc-900 active:scale-[0.98] group"
      >
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-center mb-1.5">
            <span className={`text-[10px] font-black uppercase tracking-wider ${config.color}`}>
              {config.label}
            </span>
            <span className={`text-[9px] font-bold ${config.color}`}>
              {config.percent}%
            </span>
          </div>
          <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${config.bgColor} ${config.widthClass}`}
            />
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-zinc-600 transition-transform duration-300 group-hover:text-zinc-400 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-20 overflow-hidden py-1 animate-in fade-in zoom-in-95 duration-200">
            {Object.values(CabinetStatus).map((status) => {
              const itemConfig = STATUS_CONFIG[status as CabinetStatus];
              if (!itemConfig) return null;
              const isSelected = currentStatus === status;

              return (
                <button
                  key={status}
                  onClick={() => { onStatusChange(status as CabinetStatus); setIsOpen(false); }}
                  className={`w-full text-left px-4 py-3 hover:bg-zinc-800/80 flex items-center justify-between group transition-colors ${isSelected ? 'bg-zinc-800/50' : ''}`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${itemConfig.bgColor}`} />
                    <span className={`text-[10px] font-bold uppercase tracking-wide ${isSelected ? itemConfig.color : 'text-zinc-400 group-hover:text-zinc-200'}`}>
                      {itemConfig.label}
                    </span>
                  </div>
                  {isSelected && <Check className={`w-3 h-3 ${itemConfig.color}`} />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
