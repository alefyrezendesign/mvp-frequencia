
import React, { useState, useMemo, useRef } from 'react';
import { Search, Plus, UserPlus, Edit2, FileUp, X, Download, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Member, Unit, MemberRole, Nucleo } from '../types';
import { GENERATIONS, ROLES, GENERATION_COLORS, GenerationType } from '../constants';

interface MembersViewProps {
  store: any;
  selectedUnit: Unit;
}

const MembersView: React.FC<MembersViewProps> = ({ store, selectedUnit }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);

  const filteredMembers = useMemo(() => {
    return store.members
      .filter((m: Member) => m.unitId === selectedUnit.id)
      .filter((m: Member) => m.name.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a: Member, b: Member) => a.name.localeCompare(b.name));
  }, [store.members, selectedUnit.id, searchTerm]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Gestão de Membros</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowImportModal(true)}
            className="bg-zinc-800 p-2.5 rounded-xl text-zinc-400 hover:text-white border border-zinc-700 transition-colors"
            title="Importar CSV"
          >
            <FileUp className="w-5 h-5" />
          </button>
          <button
            onClick={() => {
              setEditingMember(null);
              setShowAddModal(true);
            }}
            className="bg-purple-600 p-2.5 rounded-xl text-white shadow-lg shadow-purple-600/20 active:scale-95 transition-transform"
            title="Adicionar Membro"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <input
          type="text"
          placeholder="Filtrar por nome..."
          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-purple-600"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid gap-3 pb-32">
        {filteredMembers.map((member: Member) => {
          const nucleo = store.nucleos.find((n: Nucleo) => n.id === member.nucleoId);
          return (
            <div key={member.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-center justify-between group hover:border-zinc-700 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-purple-600/20 border border-purple-500/20 flex items-center justify-center text-purple-400 font-bold group-hover:scale-110 transition-transform text-xs uppercase">
                  {member.name.substring(0, 2)}
                </div>
                <div>
                  <p className="font-semibold text-zinc-200">{member.name}</p>
                  <div className="flex gap-2 mt-1">
                    <span className={`text-[9px] font-bold uppercase tracking-tight px-1.5 py-0.5 rounded border ${GENERATION_COLORS[member.generation as GenerationType] || 'text-zinc-500 border-zinc-700 bg-zinc-800'}`}>
                      {member.generation || 'Sem Geração'}
                    </span>
                    {member.role && (
                      <span className="text-[9px] font-bold uppercase tracking-tight px-1.5 py-0.5 rounded border border-zinc-700 bg-zinc-800 text-zinc-400">
                        {member.role}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditingMember(member);
                    setShowAddModal(true);
                  }}
                  className="p-2 text-zinc-500 hover:text-purple-400 transition-colors"
                  aria-label="Editar Membro"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}

        {filteredMembers.length === 0 && (
          <div className="py-20 text-center opacity-30">
            <UserPlus className="w-12 h-12 mx-auto mb-4" />
            <p className="text-sm font-medium">Nenhum membro encontrado</p>
          </div>
        )}
      </div>

      {showAddModal && (
        <MemberFormModal
          onClose={() => setShowAddModal(false)}
          saveMember={store.saveMember}
          deleteMember={store.deleteMember}
          initialData={editingMember}
          unitId={selectedUnit.id}
          nucleos={store.nucleos}
        />
      )}

      {showImportModal && (
        <BulkImportModal
          onClose={() => setShowImportModal(false)}
          onImport={(members: Member[]) => store.batchSaveMembers(members)}
          unitId={selectedUnit.id}
          nucleos={store.nucleos}
        />
      )}
    </div>
  );
};

const BulkImportModal = ({ onClose, onImport, unitId, nucleos }: any) => {
  const [preview, setPreview] = useState<Member[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split('\n');
        const newMembers: Member[] = [];

        const startLine = lines[0].toLowerCase().includes('nome') ? 1 : 0;

        for (let i = startLine; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          const cols = line.includes(';') ? line.split(';') : line.split(',');

          const name = cols[0]?.trim();
          const generationName = cols[1]?.trim();

          if (!name) continue;

          // Tentativa de encontrar a geração compatível (case insensitive)
          const matchedGeneration = GENERATIONS.find(g => g.toLowerCase() === generationName?.toLowerCase()) || GENERATIONS[0];

          newMembers.push({
            id: crypto.randomUUID(),
            name,
            nucleoId: '', // Nucleo deprecado
            generation: matchedGeneration,
            role: 'Membro',
            unitId,
            active: true,
            start_date: new Date().toISOString().split('T')[0]
          });
        }

        if (newMembers.length === 0) {
          setError('Nenhum dado válido encontrado no arquivo.');
        } else {
          setPreview(newMembers);
          setError(null);
        }
      } catch (err) {
        setError('Erro ao processar arquivo. Verifique se o formato está correto.');
      }
    };
    reader.readAsText(file);
  };

  const handleDownloadTemplate = () => {
    const csvContent = "Nome,Geração\nFulano de Tal,Jovens\nBeltrana,Kids";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "modelo_membros.csv");
    link.click();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-zinc-900 border border-zinc-800 w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-xl font-black text-white tracking-tight">Importar Membros</h3>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">Carregamento em massa via CSV</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full transition-colors" aria-label="Fechar Modal">
            <X className="w-5 h-5 text-zinc-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-6">
          <div className="bg-zinc-950 border border-zinc-800 p-5 rounded-3xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-purple-600/10 border border-purple-500/20 flex items-center justify-center shrink-0">
                <AlertCircle className="w-4 h-4 text-purple-500" />
              </div>
              <div>
                <p className="text-xs font-bold text-zinc-200">Instruções de Formatação</p>
                <p className="text-[11px] text-zinc-500 leading-relaxed mt-1">
                  Seu arquivo CSV deve conter 2 colunas na ordem exata: <br />
                  <span className="text-zinc-300 font-bold">Nome, Geração</span>
                </p>
              </div>
            </div>
            <button
              onClick={handleDownloadTemplate}
              className="w-full bg-zinc-900 border border-zinc-800 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center justify-center gap-2 hover:bg-zinc-800 transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> Baixar Modelo CSV
            </button>
          </div>

          {preview.length === 0 ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-zinc-800 rounded-3xl p-10 flex flex-col items-center justify-center gap-4 hover:border-purple-600/50 hover:bg-purple-600/5 transition-all cursor-pointer group"
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={processFile}
                accept=".csv"
                className="hidden"
                aria-label="Arquivo CSV"
              />
              <div className="w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <FileUp className="w-8 h-8 text-zinc-700 group-hover:text-purple-500" />
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-zinc-300">Selecionar arquivo CSV</p>
                <p className="text-[10px] text-zinc-600 font-bold uppercase mt-1">Ou arraste e solte aqui</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4 animate-in slide-in-from-bottom-4">
              <div className="flex items-center justify-between px-2">
                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Preview: {preview.length} Membros</p>
                <button onClick={() => setPreview([])} className="text-[10px] font-black text-rose-500 uppercase">Limpar</button>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                {preview.map((m, idx) => (
                  <div key={idx} className="bg-zinc-950/50 border border-zinc-800 rounded-xl p-3 flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-zinc-200 truncate max-w-[200px]">{m.name}</span>
                      <span className={`text-[9px] font-bold uppercase tracking-tight px-1.5 py-0.5 rounded border ${GENERATION_COLORS[m.generation as GenerationType] || 'text-zinc-500 border-zinc-700 bg-zinc-800'}`}>
                        {m.generation || 'Sem Geração'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3 animate-in shake duration-300">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <p className="text-[11px] text-rose-500 font-bold">{error}</p>
            </div>
          )}
        </div>

        <div className="pt-8 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-4 text-xs font-black text-zinc-500 uppercase tracking-widest"
          >
            Cancelar
          </button>
          <button
            disabled={preview.length === 0}
            onClick={() => {
              onImport(preview);
              onClose();
            }}
            className="flex-[2] bg-purple-600 disabled:opacity-20 disabled:grayscale py-4 rounded-2xl text-xs font-black text-white uppercase tracking-widest shadow-lg shadow-purple-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" /> Confirmar Importação
          </button>
        </div>
      </div>
    </div>
  );
};

const MemberFormModal = ({ onClose, saveMember, deleteMember, initialData, unitId, nucleos }: any) => {
  const [formData, setFormData] = useState<Partial<Member>>(initialData || {
    name: '',
    nucleoId: nucleos[0]?.id || '',
    generation: GENERATIONS[0],
    role: ROLES[0] as MemberRole,
    unitId: unitId,
    active: true
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await saveMember({
        ...formData,
        start_date: initialData?.start_date || new Date().toISOString().split('T')[0],
        id: initialData?.id || crypto.randomUUID()
      } as Member);
      onClose();
    } catch (error) {
      // Erro tratado no store
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Tem certeza que deseja EXCLUIR este membro permanentemente? Esta ação não pode ser desfeita e apagará todo o histórico de frequência.')) {
      try {
        await deleteMember(initialData.id);
        onClose();
      } catch (error) {
        // Erro tratado no store
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-zinc-900 w-full max-w-md rounded-[2.5rem] p-8 border border-zinc-800 shadow-2xl animate-in zoom-in-95 duration-300">
        <h2 className="text-xl font-black text-white tracking-tight mb-6">{initialData ? 'Editar Membro' : 'Novo Membro'}</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Nome Completo</label>
            <input
              required
              placeholder="Digite o nome..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-sm text-white focus:border-purple-600 outline-none transition-all"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Geração</label>
              <select
                className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-sm text-white outline-none focus:border-purple-600 appearance-none"
                value={formData.generation}
                onChange={e => setFormData({ ...formData, generation: e.target.value })}
                aria-label="Selecione a Geração"
              >
                <option value="">Selecione...</option>
                {GENERATIONS.map((gen) => <option key={gen} value={gen}>{gen}</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Cargo</label>
              <select
                className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-sm text-white outline-none focus:border-purple-600 appearance-none"
                value={formData.role}
                onChange={e => setFormData({ ...formData, role: e.target.value as MemberRole })}
                aria-label="Selecione o Cargo"
              >
                <option value="">Selecione...</option>
                {ROLES.map((role) => <option key={role} value={role}>{role}</option>)}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-zinc-950 rounded-2xl border border-zinc-800">
            <input
              type="checkbox"
              id="active-member"
              checked={formData.active}
              onChange={e => setFormData({ ...formData, active: e.target.checked })}
              className="w-6 h-6 accent-purple-600 rounded-lg cursor-pointer"
            />
            <label htmlFor="active-member" className="text-xs font-bold text-zinc-400 cursor-pointer">Membro Ativo e Visível</label>
          </div>

          <div className="flex flex-col gap-3 pt-4">
            <div className="flex gap-3">
              <button type="button" onClick={onClose} className="flex-1 py-4 text-xs font-black text-zinc-500 uppercase tracking-widest">Cancelar</button>
              <button type="submit" className="flex-[2] bg-purple-600 py-4 rounded-2xl text-xs font-black text-white uppercase tracking-widest shadow-lg shadow-purple-600/20 active:scale-[0.98] transition-all">
                {initialData ? 'Atualizar' : 'Salvar Membro'}
              </button>
            </div>

            {initialData && (
              <button
                type="button"
                onClick={handleDelete}
                className="w-full py-3 rounded-2xl border border-rose-500/20 text-rose-500 hover:bg-rose-500/10 text-[10px] font-black uppercase tracking-widest transition-all"
              >
                Excluir Membro Permanentemente
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default MembersView;
