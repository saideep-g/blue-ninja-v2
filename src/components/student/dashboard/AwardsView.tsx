import React, { useState } from 'react';
import { Lock, Sparkles, CheckCircle2 } from 'lucide-react';
import { CHAPTERS } from '../../../constants/chapters'; // Assuming path

interface AwardsViewProps {
    masteryProgress: Record<string, any>;
    onPlayChapter: (subject: string, chapter: any) => void;
}

const TASKS = ['Math', 'Science', 'Words', 'World'];

export const AwardsView: React.FC<AwardsViewProps> = ({ masteryProgress, onPlayChapter }) => {
    const [activeTab, setActiveTab] = useState('Math');

    const chapters = CHAPTERS[activeTab as keyof typeof CHAPTERS] || [];

    return (
        <div className="px-6 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="mb-6">
                <h2 className="text-3xl font-black text-purple-900 leading-tight">Treasure Map</h2>
                <p className="text-sm font-medium text-slate-500">Your collection of badges and medals.</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
                {TASKS.map(t => (
                    <button
                        key={t}
                        onClick={() => setActiveTab(t)}
                        className={`px-5 py-2.5 rounded-2xl text-sm font-black transition-all whitespace-nowrap
                            ${activeTab === t
                                ? 'bg-purple-600 text-white shadow-lg shadow-purple-200 scale-105'
                                : 'bg-white text-slate-400 border border-slate-100'
                            }
                        `}
                    >
                        {t}
                    </button>
                ))}
            </div>

            {/* Badges Grid */}
            <div className="grid grid-cols-2 gap-4">
                {chapters.map((chapter, idx) => {
                    const progress = masteryProgress[chapter.n] || {};
                    const isUnlocked = progress.unlocked || idx === 0;
                    const isMastered = progress.mastered;

                    return (
                        <button
                            key={idx}
                            disabled={!isUnlocked}
                            onClick={() => {
                                // Show details modal? Or just simplified "Play" if unlocked
                                // User asked: "click on award -> show name and completing which chapter"
                                // Effectively, this Card IS the award.
                                // If they click it, we can show a small details pop or just toggle expanded state?
                                // For now, let's make it actionable to PLAY the chapter if not mastered.
                                // If mastered, just show off.
                                if (!isMastered && isUnlocked) {
                                    onPlayChapter(activeTab, chapter);
                                }
                            }}
                            className={`relative text-left p-4 rounded-[2rem] border-b-4 transition-all active:scale-95 flex flex-col items-center text-center
                                ${isMastered
                                    ? 'bg-indigo-50 border-indigo-200'
                                    : isUnlocked
                                        ? 'bg-white border-slate-100 shadow-xl shadow-purple-50/20'
                                        : 'bg-slate-50 border-slate-100 opacity-60 grayscale'
                                }
                            `}
                        >
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl mb-3 shadow-sm
                                ${isMastered ? 'bg-indigo-100' : 'bg-slate-100'}
                            `}>
                                {isMastered ? '🏆' : (isUnlocked ? chapter.e : '🔒')}
                            </div>

                            <h3 className={`font-black text-sm leading-tight mb-1 ${isMastered ? 'text-indigo-900' : 'text-slate-700'}`}>
                                {chapter.award}
                            </h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-3">
                                {chapter.n}
                            </p>

                            {isMastered && (
                                <div className="bg-indigo-200 text-indigo-700 px-2 py-1 rounded-full text-[10px] font-black uppercase">
                                    Earned
                                </div>
                            )}

                            {!isMastered && isUnlocked && (
                                <div className="mt-auto w-full">
                                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                        {/* Mock progress or real progress */}
                                        <div className="h-full bg-purple-400" style={{ width: `${(progress.questionsAnswered || 0) / (chapter.req || 50) * 100}%` }} />
                                    </div>
                                    <p className="text-[9px] text-slate-400 font-bold mt-1">
                                        {(progress.questionsAnswered || 0)} / {chapter.req || 50}
                                    </p>
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>

            <div className="mt-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[2.5rem] p-8 text-white text-center shadow-xl shadow-purple-200 overflow-hidden relative">
                <Sparkles className="absolute top-0 right-0 w-24 h-24 text-white/10 -translate-y-6 translate-x-6" />
                <h3 className="font-black text-xl mb-2">Final Master Badge</h3>
                <p className="text-sm text-indigo-100 opacity-80">Complete all chapters to rule the realm!</p>
            </div>
        </div>
    );
};
