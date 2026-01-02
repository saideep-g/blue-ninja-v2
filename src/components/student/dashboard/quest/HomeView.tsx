import React from 'react';
import { BookOpen, Beaker, MessageSquare, Globe, Play, Grid3x3, Lightbulb } from 'lucide-react';
import { CHAPTERS } from '../../../../constants/chapters';

const SUBJECT_CONFIG = {
    'Math': { color: 'from-pink-400 to-rose-500', icon: <BookOpen size={28} />, label: 'Math' },
    'Science': { color: 'from-cyan-400 to-blue-500', icon: <Beaker size={28} />, label: 'Science' },
    'Words': { color: 'from-amber-400 to-orange-500', icon: <MessageSquare size={28} />, label: 'Words' },
    'World': { color: 'from-indigo-400 to-purple-500', icon: <Globe size={28} />, label: 'World' },
    'GK': { color: 'from-teal-400 to-emerald-500', icon: <Lightbulb size={28} />, label: 'Gen. Knowledge' },
};

interface HomeViewProps {
    dailyProgress: Record<string, number>;
    chapterProgress: Record<string, any>;
    onPlaySubject: (subject: string) => void;
    onPlayTables: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ dailyProgress, chapterProgress, onPlaySubject, onPlayTables }) => {

    // Calculate Daily Total
    const totalDaily = Object.values(dailyProgress).reduce((a, b) => a + b, 0);
    const dailyGoal = 40; // 10 * 4 subjects roughly

    return (
        <div className="px-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
            {/* Hero / Daily Status */}
            <div className="mb-8">
                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-[2.5rem] p-6 shadow-xl shadow-purple-200 text-white flex flex-col sm:flex-row items-center gap-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-10 translate-x-10 blur-2xl" />

                    <div className="relative w-20 h-20 flex-shrink-0">
                        <svg className="w-full h-full -rotate-90">
                            <circle cx="40" cy="40" r="36" fill="transparent" stroke="rgba(255,255,255,0.2)" strokeWidth="6" />
                            <circle
                                cx="40" cy="40" r="36" fill="transparent" stroke="#FACC15" strokeWidth="6"
                                strokeDasharray={226}
                                strokeDashoffset={226 - (226 * Math.min(1, totalDaily / dailyGoal))}
                                strokeLinecap="round"
                            />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center text-lg font-black">{totalDaily}/{dailyGoal}</div>
                    </div>

                    <div className="text-center sm:text-left z-10">
                        <h2 className="font-black text-xl mb-1">Daily Power Charge</h2>
                        <p className="text-xs text-purple-100 font-medium opacity-90 leading-relaxed max-w-[200px]">
                            {totalDaily >= dailyGoal
                                ? "System Fully Charged! You are unstoppable!"
                                : "Complete missions to power up your suit!"}
                        </p>
                    </div>
                </div>
            </div>

            {/* The 4 Big Buttons + Tables */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {(Object.entries(SUBJECT_CONFIG) as [string, typeof SUBJECT_CONFIG['Math']][]).map(([key, config]) => {
                    // Find active chapter
                    const subjChapters = CHAPTERS[key as keyof typeof CHAPTERS] || [];
                    // Default to first chapter
                    let activeChapter = subjChapters[0];
                    // Search for first !mastered & unlocked
                    for (const ch of subjChapters) {
                        const p = chapterProgress[ch.n];
                        if (p && p.unlocked && !p.mastered) {
                            activeChapter = ch;
                            break;
                        }
                        // If everything unlocked is mastered, maybe play the last one or something?
                        // If p.mastered is true, check next. 
                        // If we haven't started (no p), it's the one.
                        if (!p && subjChapters.indexOf(ch) === 0) { // Should be covered by initial state
                            // This handles 'undefined' progress for first chapter
                            break;
                        }
                    }
                    // Actually simplier: Find the first one where (!mastered). 
                    // Assuming valid sequential unlock logic ensures only one 'active' frontier.
                    const targetChapter = subjChapters.find(c => {
                        const p = chapterProgress[c.n];
                        return !p?.mastered;
                    }) || subjChapters[subjChapters.length - 1]; // Fallback to last if all done

                    const isDoneToday = (dailyProgress[key] || 0) >= 10;

                    return (
                        <button
                            key={key}
                            onClick={() => onPlaySubject(key)}
                            className={`group relative p-6 h-40 rounded-[2.5rem] text-left transition-all active:scale-95 flex flex-col justify-between shadow-lg hover:shadow-xl
                                ${isDoneToday ? 'bg-emerald-500 shadow-emerald-200' : 'bg-white shadow-purple-100'}
                            `}
                        >
                            <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${config.color} opacity-10 rounded-bl-[2.5rem] rounded-tr-[2.5rem] transition-all group-hover:scale-110`} />

                            <div className="flex justify-between items-start">
                                <div className={`p-3 rounded-2xl ${isDoneToday ? 'bg-white/20 text-white' : `bg-gradient-to-br ${config.color} text-white shadow-md`}`}>
                                    {React.cloneElement(config.icon as React.ReactElement<any>, { size: 24 })}
                                </div>
                                {isDoneToday && <div className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black text-white uppercase tracking-wider">Complete</div>}
                            </div>

                            <div className="z-10">
                                <h3 className={`font-black text-2xl mb-1 ${isDoneToday ? 'text-white' : 'text-slate-800'}`}>
                                    {config.label}
                                </h3>
                                <p className={`text-xs font-bold uppercase tracking-wider truncate max-w-[80%]
                                    ${isDoneToday ? 'text-emerald-100' : 'text-slate-400'}
                                `}>
                                    Next: {targetChapter.n}
                                </p>
                            </div>

                            {!isDoneToday && (
                                <div className="absolute bottom-6 right-6 p-2 bg-slate-50 rounded-full text-purple-300 group-hover:bg-purple-100 group-hover:text-purple-600 transition-colors">
                                    <Play size={20} fill="currentColor" />
                                </div>
                            )}
                        </button>
                    );
                })}

                {/* Tables Card */}
                {/* Tables Card */}
                {(() => {
                    const isDoneToday = (dailyProgress['Tables'] || 0) >= 20;
                    return (
                        <button
                            onClick={onPlayTables}
                            className={`group relative p-6 h-40 rounded-[2.5rem] text-left transition-all active:scale-95 flex flex-col justify-between shadow-lg hover:shadow-xl sm:col-span-1
                                ${isDoneToday ? 'bg-emerald-500 shadow-emerald-200' : 'bg-white shadow-purple-100'}
                            `}
                        >
                            <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-teal-400 to-emerald-500 opacity-10 rounded-bl-[2.5rem] rounded-tr-[2.5rem] transition-all group-hover:scale-110`} />

                            <div className="flex justify-between items-start">
                                <div className={`p-3 rounded-2xl ${isDoneToday ? 'bg-white/20 text-white' : 'bg-gradient-to-br from-teal-400 to-emerald-500 text-white shadow-md'}`}>
                                    <Grid3x3 size={24} />
                                </div>
                                {isDoneToday && <div className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black text-white uppercase tracking-wider">Complete</div>}
                            </div>

                            <div className="z-10">
                                <h3 className={`font-black text-2xl mb-1 ${isDoneToday ? 'text-white' : 'text-slate-800'}`}>Tables</h3>
                                <p className={`text-xs font-bold uppercase tracking-wider ${isDoneToday ? 'text-emerald-100' : 'text-slate-400'}`}>Master x1 to x12</p>
                            </div>

                            {!isDoneToday && (
                                <div className="absolute bottom-6 right-6 p-2 bg-slate-50 rounded-full text-purple-300 group-hover:bg-purple-100 group-hover:text-purple-600 transition-colors">
                                    <Play size={20} fill="currentColor" />
                                </div>
                            )}
                        </button>
                    );
                })()}
            </div>
        </div>
    );
};
