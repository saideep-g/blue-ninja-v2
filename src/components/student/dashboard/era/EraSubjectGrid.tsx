import React from 'react';
import { Sparkles, Star, TrendingUp, CheckCircle2, Grid3x3 } from 'lucide-react';
import { EraProgressBar } from './EraProgressBar';
import { User as UserModel } from '../../../../types/models';

interface EraSubjectGridProps {
    subjects: any[];
    totalCompletedToday: number;
    auraPoints: number;
    onOpenArena: () => void;
    onSelectSubject: (subject: any, e: React.MouseEvent) => void;
    selectedSubjectId?: string;
    onOpenTables: () => void;
}

export const EraSubjectGrid: React.FC<EraSubjectGridProps> = ({
    subjects,
    totalCompletedToday,
    auraPoints,
    onOpenArena,
    onSelectSubject,
    selectedSubjectId,
    onOpenTables
}) => {
    const tablesSubject = subjects.find(s => s.id === 'tables');
    const tablesMastery = tablesSubject ? Math.round(tablesSubject.modules.reduce((a: any, b: any) => {
        if (b.atoms && b.atoms.length > 0) {
            return a + b.atoms.reduce((x: any, y: any) => x + y.mastery, 0) / (b.atoms.length || 1);
        }
        return a + (b.mastery || 0);
    }, 0) / (tablesSubject.modules.length || 1)) : 0;

    return (
        <div className="lg:col-span-8 space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Daily Goals Panel */}
                <div className="md:col-span-2 bg-theme-card/60 backdrop-blur-2xl p-8 rounded-[2.5rem] border border-theme-border/80 shadow-sm relative overflow-hidden transition-colors duration-300">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h3 className="text-xl font-serif italic text-theme-text">Daily Eras</h3>
                            <p className="text-[10px] font-bold text-color-text-secondary uppercase tracking-widest mt-1">
                                {totalCompletedToday} of 6 Completed
                            </p>
                        </div>
                        <div className="bg-theme-card p-2 rounded-2xl shadow-sm border border-theme-border text-pink-400">
                            <Sparkles size={20} />
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {subjects.map((s) => (
                            <div key={s.id} className={`px-4 py-2 rounded-full border text-[10px] font-black uppercase tracking-wider transition-all duration-500 ${s.completedToday ? 'bg-theme-card border-pink-100 text-pink-500 shadow-sm scale-105' : 'bg-theme-bg/50 border-theme-border text-color-text-secondary'}`}>
                                {s.icon} {s.name.split(' ')[0]}
                            </div>
                        ))}
                    </div>
                </div>
                {/* XP Panel */}
                <div className="bg-theme-text text-theme-bg p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden flex flex-col justify-between group">
                    <div className="relative z-10">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-theme-bg/40">Knowledge XP</p>
                        <h4 className="text-4xl font-black mt-2 tracking-tighter">{auraPoints.toLocaleString()}</h4>
                    </div>
                    <div className="flex justify-between items-end relative z-10">
                        <div className="space-y-1">
                            <p className="text-[10px] font-bold text-theme-bg/60">4 Challenges Won</p>
                            <div className="flex gap-0.5">
                                {[...Array(3)].map((_, i) => <Star key={i} size={10} fill="#FFD700" className="text-[#FFD700]" />)}
                            </div>
                        </div>
                        <TrendingUp className="text-emerald-400" size={24} />
                    </div>
                </div>
            </div>

            {/* Subjects Grid */}
            <div className="space-y-6">
                <div className="flex items-center justify-between px-2">
                    <h2 className="text-sm font-black uppercase tracking-[0.3em] text-color-text-secondary">Main Curriculum</h2>
                    <button onClick={onOpenArena} className="text-[10px] font-bold text-pink-400 uppercase tracking-widest hover:underline decoration-2 underline-offset-4">Try Fun Challenges</button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                    {/* Tables Strategy Module (Custom) */}
                    <button onClick={onOpenTables} className="group relative p-8 rounded-[3rem] border-2 text-left transition-all duration-500 overflow-hidden bg-theme-card border-violet-100 hover:border-violet-300 shadow-sm hover:shadow-xl">
                        <div className="flex justify-between items-start mb-8">
                            <div className="w-14 h-14 rounded-[2rem] bg-gradient-to-br from-violet-400 to-fuchsia-500 text-white flex items-center justify-center text-3xl shadow-sm group-hover:rotate-12 transition-transform duration-500">
                                <Grid3x3 size={24} />
                            </div>
                            {tablesSubject?.completedToday && (
                                <div className="w-6 h-6 bg-pink-50 rounded-full flex items-center justify-center text-pink-400 border border-pink-100 shadow-sm">
                                    <CheckCircle2 size={14} fill="currentColor" stroke="white" />
                                </div>
                            )}
                        </div>
                        <h4 className="font-serif italic text-lg text-theme-text leading-tight group-hover:text-violet-600 transition-colors">Tables Era</h4>
                        <div className="mt-4 w-full h-1.5 bg-violet-50 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-violet-400 to-fuchsia-500 shadow-[0_0_10px_rgba(167,139,250,0.5)] transition-all duration-1000" style={{ width: `${tablesMastery}%` }}></div>
                        </div>
                        <p className="text-[9px] font-bold text-color-text-secondary uppercase tracking-wider mt-2 group-hover:text-violet-400">
                            {tablesMastery}% Mastery
                        </p>
                    </button>

                    {/* Other Subjects */}
                    {subjects.filter(s => s.id !== 'tables').map((subject) => {
                        const mastery = Math.round(subject.modules.reduce((a: any, b: any) => {
                            if (b.atoms && b.atoms.length > 0) {
                                return a + b.atoms.reduce((x: any, y: any) => x + y.mastery, 0) / (b.atoms.length || 1);
                            }
                            return a + (b.mastery || 0);
                        }, 0) / (subject.modules.length || 1));

                        return (
                            <button key={subject.id} onClick={(e) => onSelectSubject(subject, e)} className={`group relative p-8 rounded-[3rem] border-2 text-left transition-all duration-500 overflow-hidden ${selectedSubjectId === subject.id ? 'bg-theme-card border-pink-200 shadow-xl' : 'bg-theme-card/40 border-theme-border hover:bg-theme-card hover:border-pink-50 shadow-sm'}`}>
                                <div className="flex justify-between items-start mb-8">
                                    <div className={`w-14 h-14 rounded-[2rem] bg-gradient-to-br ${subject.color} flex items-center justify-center text-3xl shadow-sm group-hover:rotate-12 transition-transform duration-500`}>{subject.icon}</div>
                                    {subject.completedToday && <div className="w-6 h-6 bg-pink-50 rounded-full flex items-center justify-center text-pink-400 border border-pink-100 shadow-sm"><CheckCircle2 size={14} fill="currentColor" stroke="white" /></div>}
                                </div>
                                <h4 className="font-serif italic text-lg text-theme-text leading-tight group-hover:text-pink-500 transition-colors">{subject.name}</h4>
                                <div className="mt-4"><EraProgressBar value={mastery} color={subject.accent} /></div>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
