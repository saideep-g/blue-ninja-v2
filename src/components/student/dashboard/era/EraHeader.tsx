import React from 'react';
import { Flame } from 'lucide-react';
import { User as UserModel } from '../../../../types/models';

interface EraHeaderProps {
    currentView: string;
    setCurrentView: (view: 'dashboard' | 'challenges' | 'quiz') => void;
    setArenaSubView: (view: 'create' | 'active' | 'history') => void;
    ninjaStats: any;
    user: any;
    greeting: string;
    totalCompletedToday: number;
    navigate: (path: string) => void;
}

export const EraHeader: React.FC<EraHeaderProps> = ({
    currentView,
    setCurrentView,
    setArenaSubView,
    ninjaStats,
    user,
    greeting,
    totalCompletedToday,
    navigate
}) => {
    return (
        <header className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
            <div className="space-y-2">
                <div className="flex items-center gap-2 mb-2">
                    <span className="bg-theme-card px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-sm text-pink-400 border border-theme-border">{ninjaStats?.profile?.class || 7}th Grade Elite</span>
                    <span className="text-pink-300">✦</span>
                    <button
                        className={`text-[10px] uppercase font-bold tracking-[0.1em] transition-colors ${currentView === 'dashboard' ? 'text-theme-text' : 'text-color-text-secondary'}`}
                    >
                        Main Desk
                    </button>
                    <span className="text-color-text-secondary">/</span>
                    <button
                        onClick={() => { setCurrentView('challenges'); setArenaSubView('create'); }}
                        className={`text-[10px] uppercase font-bold tracking-[0.1em] transition-colors ${currentView === 'challenges' ? 'text-pink-400' : 'text-color-text-secondary'}`}
                    >
                        Challenge Arena
                    </button>
                </div>
                <h1 className="text-4xl lg:text-5xl font-serif italic text-theme-text tracking-tight leading-tight">
                    {currentView === 'dashboard' ? greeting : "Arena Era ⚔️"}
                </h1>
            </div>

            <div className="flex items-center gap-6">
                <div className="hidden lg:flex flex-col items-end">
                    <p className="text-[10px] font-black uppercase text-color-text-secondary tracking-widest">Aura Vibe</p>
                    <div className="flex gap-1 mt-1">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className={`w-1.5 h-4 rounded-full ${i < totalCompletedToday ? 'bg-pink-300' : 'bg-theme-bg-secondary'}`}></div>
                        ))}
                    </div>
                </div>
                <div className="flex items-center gap-3 bg-theme-card/40 backdrop-blur-xl p-2 pr-4 rounded-full border border-theme-border/60 shadow-sm cursor-pointer" onClick={() => navigate('/profile')}>
                    <div className="w-12 h-12 bg-gradient-to-tr from-pink-200 to-rose-300 rounded-full flex items-center justify-center text-white shadow-inner border-2 border-theme-card text-xl overflow-hidden">
                        {ninjaStats?.profile?.avatar ? <img src={ninjaStats.profile.avatar} alt="avatar" /> : '🧸'}
                    </div>
                    <div>
                        <p className="text-xs font-black text-theme-text leading-none">{ninjaStats?.username || user?.displayName || 'Student Era'}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                            <Flame size={12} className="text-orange-400" fill="currentColor" />
                            <span className="text-[10px] font-bold text-color-text-secondary uppercase tracking-widest">{ninjaStats?.streakCount || 0} Day Streak</span>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
};
