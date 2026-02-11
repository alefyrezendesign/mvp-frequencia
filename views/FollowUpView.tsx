
import React, { useMemo, useState } from 'react';
import { MessageCircle, ChevronLeft, ChevronRight, AlertTriangle, CheckCircle2, Clock, X, Copy, Check } from 'lucide-react';
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
        const stats = calculateAttendance(records, totalServices, store.settings);
        const cabinetInfo = store.cabinet.find((c: CabinetFollowUp) => c.memberId === m.id && c.period === currentMonthStr);
        const catInfo = getAbsenceCategory(stats.absences);

        return {
          ...m,
          ...stats,
          category: catInfo,
          cabinetStatus: cabinetInfo?.status || CabinetStatus.AGUARDANDO
        };
      })
      // Filtrar membros com 3 faltas ou mais (Categorias Baixa e Crítica)
      .filter((m: any) => m.absences >= 3);
  }, [store.members, store.attendance, store.cabinet, store.settings, selectedUnit, currentMonthStr]);

  const activeFollowUps = useMemo(() =>
    allFollowUps.filter((m: any) => m.cabinetStatus !== CabinetStatus.SOLUCIONADO)
      .sort((a: any, b: any) => b.absences - a.absences),
    [allFollowUps]);

  const resolvedFollowUps = useMemo(() =>
    allFollowUps.filter((m: any) => m.cabinetStatus === CabinetStatus.SOLUCIONADO)
      .sort((a: any, b: any) => b.absences - a.absences),
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

  return (
    <div className="space-y-6 pb-24">
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

      <div className="space-y-4">
        <h3 className="text-[10px] font-black text-rose-500 uppercase tracking-widest flex items-center gap-2 px-2">
          <Clock className="w-3 h-3" /> Demandas Ativas ({activeFollowUps.length})
        </h3>
        {activeFollowUps.map((member: any) => (
          <FollowUpCard
            key={member.id}
            member={member}
            store={store}
            currentMonthStr={currentMonthStr}
            onInform={handleInformLeader}
          />
        ))}
        {activeFollowUps.length === 0 && (
          <div className="py-12 text-center text-zinc-600 bg-zinc-900/20 border border-dashed border-zinc-800 rounded-3xl">
            Nenhuma demanda pendente
          </div>
        )}
      </div>

      {resolvedFollowUps.length > 0 && (
        <div className="space-y-4 pt-4">
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
        </div>
      )}

      {/* Modal de Cópia de Mensagem */}
      {copyModalData.isOpen && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 duration-300">
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
          </div>
        </div>
      )}
    </div>
  );
};

const FollowUpCard = ({ member, store, currentMonthStr, onInform, resolved }: any) => {
  const statusStyles = member.cabinetStatus === CabinetStatus.SOLUCIONADO
    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
    : member.cabinetStatus === CabinetStatus.CONVERSA_REALIZADA
      ? 'bg-blue-500/10 text-blue-500 border-blue-500/20'
      : member.cabinetStatus === CabinetStatus.AGUARDANDO
        ? 'bg-zinc-800 text-zinc-400 border-zinc-700'
        : 'bg-amber-500/10 text-amber-500 border-amber-500/20';

  return (
    <div className={`border rounded-2xl overflow-hidden shadow-xl ${resolved ? 'bg-zinc-900/40 border-emerald-900/20' : 'bg-zinc-900 border-zinc-800'}`}>
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
        <div className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-tighter ${member.category.color} ${member.category.bg} border border-current opacity-70`}>
          {member.category.label.split(' ')[1]}
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
          <select
            className={`w-full border rounded-xl text-[10px] py-2 px-2 font-bold outline-none appearance-none cursor-pointer ${statusStyles}`}
            value={member.cabinetStatus}
            onChange={(e) => store.updateCabinetStatus(member.id, currentMonthStr, e.target.value as CabinetStatus)}
            title="Alterar Status"
            aria-label="Alterar Status do Gabinete"
          >
            {/* Options atualizadas */}
            <option value={CabinetStatus.AGUARDANDO}>Selecionar Status</option>
            <option value={CabinetStatus.LIDER_INFORMADO}>Líder informado</option>
            <option value={CabinetStatus.PRIMEIRO_CONTATO}>Primeiro contato - realizado</option>
            <option value={CabinetStatus.CONVERSA_REALIZADA}>Conversa 1a1 realizada</option>
            <option value={CabinetStatus.SOLUCIONADO}>Solucionado</option>
          </select>
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
