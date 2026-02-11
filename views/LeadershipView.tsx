import React, { useState } from 'react';
import { Unit, Leader } from '../types';
import { GENERATIONS, GenerationType, GENERATION_COLORS, GENERATION_BASE_COLORS } from '../constants';
import { normalizePhone } from '../utils';
import { Crown, Edit2, Check, X, Phone, User } from 'lucide-react';

interface LeadershipViewProps {
    store: any;
    selectedUnit: Unit;
}

const LeadershipView: React.FC<LeadershipViewProps> = ({ store, selectedUnit }) => {
    const [editingGeneration, setEditingGeneration] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<{ name: string; phone: string }>({ name: '', phone: '' });

    const unitLeaders = store.leaders.filter((l: Leader) => l.unitId === selectedUnit.id);

    const handleEdit = (generation: string) => {
        const currentLeader = unitLeaders.find((l: Leader) => l.generation === generation);
        setEditForm({
            name: currentLeader?.name || '',
            phone: currentLeader?.phone || ''
        });
        setEditingGeneration(generation);
    };

    const handleSave = async () => {
        if (!editingGeneration) return;

        const currentLeader = unitLeaders.find((l: Leader) => l.generation === editingGeneration);
        const newLeader: Leader = {
            id: currentLeader?.id || crypto.randomUUID(),
            unitId: selectedUnit.id,
            generation: editingGeneration,
            name: editForm.name.trim(),
            phone: normalizePhone(editForm.phone)
        };

        try {
            await store.saveLeader(newLeader);
            setEditingGeneration(null);
        } catch (error) {
            // Erro já tratado no store (alert)
        }
    };

    return (
        <div className="space-y-6 pb-24 animate-in fade-in">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <Crown className="w-6 h-6 text-amber-500" />
                    Líder
                </h2>
                <span className="text-[10px] bg-zinc-900 border border-zinc-800 text-purple-400 px-3 py-1 rounded-full font-black uppercase tracking-widest">
                    {selectedUnit.name}
                </span>
            </div>

            <div className="grid gap-4">
                {GENERATIONS.map((gen) => {
                    const leader = unitLeaders.find((l: Leader) => l.generation === gen);
                    const isEditing = editingGeneration === gen;


                    const genColor = GENERATION_COLORS[gen as GenerationType] || 'border-zinc-800 bg-zinc-900';
                    return (
                        <div key={gen} className={`border transition-all rounded-2xl p-4 ${isEditing ? 'border-purple-600 ring-1 ring-purple-600/50 bg-zinc-900' : genColor}`}>
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="font-black uppercase tracking-widest text-xs opacity-80">{gen}</h3>
                                <button
                                    onClick={() => isEditing ? setEditingGeneration(null) : handleEdit(gen)}
                                    className={`p-2 rounded-full transition-colors ${isEditing ? 'bg-zinc-800 text-zinc-400' : 'hover:bg-black/20 text-current opacity-70 hover:opacity-100'}`}
                                >
                                    {isEditing ? <X className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
                                </button>
                            </div>

                            {isEditing ? (
                                <div className="space-y-3 pt-2">
                                    <div className="space-y-1">
                                        <label className="text-[10px] uppercase font-bold text-zinc-600 ml-1">Nome do Líder</label>
                                        <div className="relative">
                                            <User className="absolute left-3 top-3 w-4 h-4 text-zinc-500" />
                                            <input
                                                autoFocus
                                                type="text"
                                                value={editForm.name}
                                                onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                                                className="w-full bg-black border border-zinc-700 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white outline-none focus:border-purple-500 transition-colors"
                                                placeholder="Nome completo..."
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] uppercase font-bold text-zinc-600 ml-1">WhatsApp / Telefone</label>
                                        <div className="relative">
                                            <Phone className="absolute left-3 top-3 w-4 h-4 text-zinc-500" />
                                            <input
                                                type="tel"
                                                value={editForm.phone}
                                                onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                                                className="w-full bg-black border border-zinc-700 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white outline-none focus:border-purple-500 transition-colors"
                                                placeholder="Ex: 5511999999999"
                                            />
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleSave}
                                        className="w-full mt-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase py-3 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                                        title="Salvar Líder"
                                    >
                                        <Check className="w-4 h-4" /> Salvar Líder
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-3 pt-1">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg transition-colors ${leader ? `bg-${GENERATION_BASE_COLORS[gen as GenerationType]} text-zinc-950 shadow-lg shadow-${GENERATION_BASE_COLORS[gen as GenerationType]}/20` : 'bg-zinc-800/50 text-zinc-600'}`}>
                                        {leader ? leader.name[0].toUpperCase() : '?'}
                                    </div>
                                    <div>
                                        {leader ? (
                                            <>
                                                <p className="font-bold text-zinc-200 text-sm leading-tight">{leader.name}</p>
                                                <p className="text-xs text-current opacity-70 font-medium">{leader.phone || 'Sem telefone'}</p>
                                            </>
                                        ) : (
                                            <p className="text-sm opacity-60 italic">Nenhum líder definido</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default LeadershipView;
