import React from 'react';
import { Lock, Star, ChevronRight, Trophy } from 'lucide-react';
import { CHAPTERS } from '../../../constants/chapters';

interface MasteryPathSectionProps {
    subject: string;
    chapterProgress: Record<string, { correct: number; total: number; unlocked: boolean; mastered: boolean }>;
    onChapterClick: (chapter: any) => void;
}

export const MasteryPathSection: React.FC<MasteryPathSectionProps> = ({ subject, chapterProgress, onChapterClick }) => {
    // Get chapters for this subject, default to empty if not found
    const chapters = CHAPTERS[subject as keyof typeof CHAPTERS] || [];

    return (
        <div className="space-y-4 pb-20">
            <div className="flex justify-between items-end px-2 mb-2">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                        {subject} Journey
                    </h2>
                    <p className="text-sm font-medium text-slate-400">Master paths to earn badges</p>
                </div>
            </div>

            <div className="space-y-4">
                {chapters.map((chapter, index) => {
                    // Defaults if no progress record exists yet
                    const stats = chapterProgress[chapter.n] || { correct: 0, total: 0, unlocked: index === 0, mastered: false };

                    // Logic for "Blueprint" state (locked)
                    const isLocked = !stats.unlocked;

                    return (
                        <div
                            key={index}
                            onClick={() => !isLocked && onChapterClick(chapter)}
                            className={`relative rounded-3xl p-1 transition-all duration-300
                                ${isLocked ? 'opacity-60 grayscale cursor-not-allowed' : 'cursor-pointer hover:scale-[1.02]'}
                            `}
                        >
                            {/* Card Body */}
                            <div className="bg-white rounded-[1.3rem] p-5 border border-slate-100 shadow-lg shadow-indigo-100/50 flex gap-5 items-center relative overflow-hidden">

                                {/* Icon / Progress Circle */}
                                <div className="relative flex-shrink-0">
                                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-inner
                                        ${stats.mastered ? 'bg-indigo-100' : 'bg-slate-50'}
                                    `}>
                                        {isLocked ? <Lock className="text-slate-300" size={24} /> : chapter.e}
                                    </div>
                                    {/* Badge Preview if mastered */}
                                    {stats.mastered && (
                                        <div className="absolute -bottom-2 -right-2 bg-yellow-400 text-white p-1 rounded-full shadow-sm border-2 border-white">
                                            <Trophy size={12} fill="currentColor" />
                                        </div>
                                    )}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start">
                                        <h3 className="font-black text-slate-800 text-lg leading-tight truncate pr-2">
                                            {chapter.n}
                                        </h3>
                                        {isLocked && <span className="text-[10px] font-bold text-slate-400 uppercase bg-slate-100 px-2 py-1 rounded">Locked</span>}
                                    </div>

                                    <p className="text-xs text-slate-500 font-medium mt-1 line-clamp-1">
                                        {chapter.details}
                                    </p>

                                    {/* Progress Bar (Mastery Feedback - Indigo) */}
                                    {!isLocked && (
                                        <div className="mt-3">
                                            <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 mb-1">
                                                <span>{stats.mastered ? 'Mastered!' : 'Progress'}</span>
                                                <span>{stats.correct}/{chapter.req || 50} pts</span>
                                            </div>
                                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full transition-all duration-700 rounded-full
                                                        ${stats.mastered ? 'bg-yellow-400' : 'bg-indigo-500'}
                                                    `}
                                                    style={{ width: `${Math.min(100, (stats.correct / (chapter.req || 50)) * 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Arrow Action */}
                                {!isLocked && !stats.mastered && (
                                    <div className="bg-indigo-50 p-2 rounded-full text-indigo-500">
                                        <ChevronRight size={20} />
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Bottom Spacer for Mobile Nav */}
            <div className="h-12" />
        </div>
    );
};
