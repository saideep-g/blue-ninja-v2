import React, { useState, useEffect, useMemo } from 'react';
import { ChevronRight, Search, Zap } from 'lucide-react';
import { EraProgressBar } from './EraProgressBar';

interface EraDetailPanelProps {
    selectedSubject: any | null;
    onClose: () => void;
    onStartQuiz: () => void;
}

export const EraDetailPanel: React.FC<EraDetailPanelProps> = ({
    selectedSubject,
    onClose,
    onStartQuiz
}) => {
    const [viewMode, setViewMode] = useState<'modules' | 'atoms'>('modules');
    const [atomFilter, setAtomFilter] = useState('');

    // Reset view state when subject changes
    useEffect(() => {
        setViewMode('modules');
        setAtomFilter('');
    }, [selectedSubject?.id]);

    const filteredAtoms = useMemo(() => {
        if (!selectedSubject) return [];
        let atoms: any[] = [];
        selectedSubject.modules.forEach((mod: any) => {
            if (mod.atoms) {
                mod.atoms.forEach((atom: any) => {
                    atoms.push({ ...atom, moduleName: mod.name });
                });
            }
        });
        if (atomFilter) {
            return atoms.filter((a: any) =>
                a.name.toLowerCase().includes(atomFilter.toLowerCase()) ||
                a.moduleName.toLowerCase().includes(atomFilter.toLowerCase())
            );
        }
        return atoms;
    }, [selectedSubject, atomFilter]);

    return (
        <div className="bg-theme-card/70 backdrop-blur-3xl rounded-[3.5rem] border border-theme-border shadow-xl h-full flex flex-col overflow-hidden transition-colors duration-300">
            {!selectedSubject ? (
                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-8 animate-in fade-in zoom-in duration-700">
                    <div className="w-32 h-32 bg-pink-50 rounded-full flex items-center justify-center text-6xl shadow-inner border border-theme-border">🎀</div>
                    <h3 className="text-2xl font-serif italic text-theme-text">Choose an Era</h3>
                    <p className="text-sm text-color-text-secondary font-medium">Select a subject to dive into the detailed concept map.</p>
                </div>
            ) : (
                <div className="flex flex-col h-full animate-in slide-in-from-right-8 duration-500">
                    <div className={`p-8 bg-gradient-to-br ${selectedSubject.color} relative overflow-hidden`}>
                        <button onClick={onClose} className="bg-theme-card/80 p-3 rounded-[1.25rem] text-color-text-secondary hover:text-pink-400 shadow-sm mb-8"><ChevronRight className="rotate-180" size={20} /></button>
                        <div className="flex items-center gap-5 mb-8">
                            <div className="text-5xl">{selectedSubject.icon}</div>
                            <div>
                                <h3 className="text-3xl font-serif italic text-white leading-none tracking-tight">{selectedSubject.name}</h3>
                                <p className="text-white/70 text-[10px] font-black uppercase tracking-widest mt-2">{selectedSubject.modules.length} Modules</p>
                            </div>
                        </div>
                        <div className="flex bg-black/5 rounded-2xl p-1.5 border border-white/20">
                            <button onClick={() => setViewMode('modules')} className={`flex-1 py-3 rounded-[1rem] text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'modules' ? 'bg-theme-card text-theme-text shadow-sm' : 'text-white/60'}`}>Chapters</button>
                            {(selectedSubject.hasAtoms !== false) && (
                                <button onClick={() => setViewMode('atoms')} className={`flex-1 py-3 rounded-[1rem] text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'atoms' ? 'bg-theme-card text-theme-text shadow-sm' : 'text-white/60'}`}>ATOMs</button>
                            )}
                        </div>
                    </div>
                    <div className="p-8 flex-1 overflow-y-auto">
                        {viewMode === 'modules' ? (
                            <div className="space-y-4">
                                {selectedSubject.modules.map((mod: any) => (
                                    <div key={mod.id} className="p-6 bg-theme-bg/40 rounded-[2rem] border border-theme-border hover:bg-theme-card transition-all group">
                                        <div className="flex justify-between items-center mb-4">
                                            <h5 className="font-serif italic text-theme-text text-lg group-hover:text-pink-500">{mod.name}</h5>
                                            <span className="text-xs font-black text-theme-text">{mod.mastery}%</span>
                                        </div>
                                        <EraProgressBar value={mod.mastery} color={selectedSubject.accent} height="h-1.5" />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="relative mb-6">
                                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-color-text-secondary" size={16} />
                                    <input type="text" placeholder="Search concepts..." className="w-full bg-theme-bg/50 rounded-[1.5rem] py-4 pl-14 pr-6 text-xs font-bold transition-all outline-none text-theme-text placeholder:text-color-text-secondary" value={atomFilter} onChange={(e) => setAtomFilter(e.target.value)} />
                                </div>
                                {filteredAtoms.map((atom: any) => (
                                    <div key={atom.id} className="p-5 bg-theme-card rounded-[2rem] border border-theme-border shadow-sm hover:border-pink-100 transition-all">
                                        <p className="text-[9px] text-pink-300 font-black uppercase tracking-widest mb-1">{atom.moduleName}</p>
                                        <h5 className="font-serif italic text-theme-text leading-snug">{atom.name}</h5>
                                        <div className="mt-4"><EraProgressBar value={atom.mastery} color={selectedSubject.accent} height="h-1" /></div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="p-8 border-t border-theme-border">
                        <button onClick={onStartQuiz} className="w-full py-5 bg-theme-text text-theme-bg rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-pink-500 hover:text-white transition-all active:scale-95">Start Quiz <Zap size={18} fill="currentColor" /></button>
                    </div>
                </div>
            )}
        </div>
    );
};
