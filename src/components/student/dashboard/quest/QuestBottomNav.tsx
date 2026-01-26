import React from 'react';
import { Play, Trophy, Zap, User, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface QuestBottomNavProps {
    currentView: string;
    setView: (view: string) => void;
}

export const QuestBottomNav: React.FC<QuestBottomNavProps> = ({ currentView, setView }) => {

    // Helper to handle navigation scroll
    const navTo = (view: string) => {
        setView(view);
        window.scrollTo(0, 0);
    };

    return (
        <nav className="fixed bottom-0 left-0 right-0 h-24 bg-white/80 backdrop-blur-2xl border-t border-purple-50 px-6 flex items-center justify-between pb-6 z-50">
            <button onClick={() => navTo('home')} className={`flex flex-col items-center gap-1.5 transition-all ${currentView === 'home' ? 'text-purple-600 scale-110' : 'text-slate-300'}`}>
                <div className={`p-2.5 rounded-2xl transition-colors ${currentView === 'home' ? 'bg-purple-100' : ''}`}>
                    <Play size={24} fill={currentView === 'home' ? "currentColor" : "none"} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest">Play</span>
            </button>

            <button onClick={() => navTo('awards')} className={`flex flex-col items-center gap-1.5 transition-all ${currentView === 'awards' ? 'text-amber-500 scale-110' : 'text-slate-300'}`}>
                <div className={`p-2.5 rounded-2xl transition-colors ${currentView === 'awards' ? 'bg-amber-100' : ''}`}>
                    <Trophy size={24} fill={currentView === 'awards' ? "currentColor" : "none"} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest">Map</span>
            </button>

            <button onClick={() => setView('challenges')} className={`flex flex-col items-center gap-1.5 transition-all ${currentView === 'challenges' ? 'text-pink-500 scale-110' : 'text-slate-300'}`}>
                <div className={`p-2.5 rounded-2xl transition-colors ${currentView === 'challenges' ? 'bg-pink-100' : ''}`}>
                    <Zap size={24} fill={currentView === 'challenges' ? "currentColor" : "none"} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest">Arena</span>
            </button>

            <button onClick={() => navTo('history')} className={`flex flex-col items-center gap-1.5 transition-all ${currentView === 'history' ? 'text-cyan-500 scale-110' : 'text-slate-300'}`}>
                <div className={`p-2.5 rounded-2xl transition-colors ${currentView === 'history' ? 'bg-cyan-100' : ''}`}>
                    <FileText size={24} className={currentView === 'history' ? 'stroke-2' : ''} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest">Logs</span>
            </button>

            <button onClick={() => navTo('profile')} className={`flex flex-col items-center gap-1.5 transition-all ${currentView === 'profile' ? 'text-indigo-600 scale-110' : 'text-slate-300'}`}>
                <div className={`p-2.5 rounded-2xl transition-colors ${currentView === 'profile' ? 'bg-indigo-100' : ''}`}>
                    <User size={24} fill={currentView === 'profile' ? "currentColor" : "none"} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest">Me</span>
            </button>
        </nav>
    );
};
