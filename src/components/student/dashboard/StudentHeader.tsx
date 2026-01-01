import React from 'react';
import { Star } from 'lucide-react';

interface StudentHeaderProps {
    user: any;
    stars: number;
}

export const StudentHeader: React.FC<StudentHeaderProps> = ({ user, stars }) => {
    // Resolve Name Logic
    const rawName = user?.displayName || user?.email?.split('@')[0] || 'Explorer';
    const displayFirstName = rawName.split(' ')[0].charAt(0).toUpperCase() + rawName.split(' ')[0].slice(1);
    const avatarUrl = user?.photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${displayFirstName}`;

    return (
        <header className="px-6 pt-8 pb-4 flex justify-between items-center animate-in fade-in duration-500">
            <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-400 to-pink-400 border-2 border-white shadow-lg flex-shrink-0 flex items-center justify-center overflow-hidden">
                    <img src={avatarUrl} alt="Avatar" className="w-full h-full scale-110" />
                </div>
                <div>
                    <h1 className="text-lg font-black text-purple-900 leading-none">{displayFirstName}'s Quest</h1>
                    <p className="text-[10px] font-bold text-purple-400 uppercase tracking-widest mt-1">Explorer Rank: Gold</p>
                </div>
            </div>
            <div className="bg-white px-3 py-1.5 rounded-2xl flex items-center gap-1.5 shadow-sm border border-purple-100">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                <span className="text-sm font-black text-slate-700">{stars}</span>
            </div>
        </header>
    );
};
