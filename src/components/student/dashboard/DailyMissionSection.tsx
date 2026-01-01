import React from 'react';
import { CheckCircle, Circle, Flame } from 'lucide-react';

interface DailyMissionSectionProps {
    progress: Record<string, number>; // e.g., { math: 12, science: 4 }
    onSubjectClick: (subjectId: string) => void;
}

const DAILY_GOAL = 10;
const SUBJECTS = [
    { id: 'Math', icon: '➕', color: 'bg-emerald-100 text-emerald-600' },
    { id: 'Science', icon: '🧬', color: 'bg-blue-100 text-blue-600' },
    { id: 'Words', icon: '📖', color: 'bg-amber-100 text-amber-600' },
    { id: 'World', icon: '🌍', color: 'bg-purple-100 text-purple-600' }
];

export const DailyMissionSection: React.FC<DailyMissionSectionProps> = ({ progress, onSubjectClick }) => {
    return (
        <div className="bg-white rounded-3xl p-6 shadow-xl shadow-purple-50/50 mb-8 border border-purple-50">
            <h2 className="text-xl font-black text-slate-800 mb-4 flex items-center gap-2">
                <Flame className="text-orange-500 fill-orange-500 animate-pulse" /> Daily Missions
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {SUBJECTS.map((sub) => {
                    const count = progress[sub.id] || 0;
                    const isFinished = count >= DAILY_GOAL;

                    return (
                        <button
                            key={sub.id}
                            onClick={() => onSubjectClick(sub.id)}
                            className={`relative p-4 rounded-2xl border-2 transition-all duration-300 flex flex-col items-center text-center
                                ${isFinished
                                    ? 'bg-emerald-50 border-emerald-200 shadow-sm'
                                    : 'bg-slate-50 border-slate-100 hover:border-purple-200 hover:bg-white'}
                            `}
                        >
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl mb-2 ${sub.color}`}>
                                {sub.icon}
                            </div>
                            <span className="font-bold text-slate-700 text-sm mb-1">{sub.id}</span>

                            {isFinished ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">
                                    <CheckCircle size={10} /> Done
                                </span>
                            ) : (
                                <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
                                    <div
                                        className="h-full bg-purple-500 transition-all duration-500"
                                        style={{ width: `${Math.min(100, (count / DAILY_GOAL) * 100)}%` }}
                                    />
                                </div>
                            )}

                            {!isFinished && (
                                <span className="text-[10px] font-bold text-slate-400 mt-1">
                                    {count}/{DAILY_GOAL}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
