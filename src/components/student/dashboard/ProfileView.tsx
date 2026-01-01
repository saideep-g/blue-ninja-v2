import React, { useState } from 'react';
import { Pencil, Check, X, Star, Flame, Medal, Zap, Calendar } from 'lucide-react';

interface ProfileViewProps {
    user: any;
    stats: { stars: number; streak: number; powerPoints: any };
    onUpdateProfile: (name: string, avatarSeed: string) => Promise<void>;
}

const GIRL_AVATAR_SEEDS = [
    'Mimi', 'Bella', 'Daisy', 'Lola', 'Coco', 'Ruby',
    'Luna', 'Sophie', 'Mia', 'Chloe', 'Zoe', 'Lily'
];

export const ProfileView: React.FC<ProfileViewProps> = ({ user, stats, onUpdateProfile }) => {
    const [isEditingName, setIsEditingName] = useState(false);
    const [editName, setEditName] = useState('');
    const [selectedAvatarSeed, setSelectedAvatarSeed] = useState('');

    const handleSave = async () => {
        if (!editName.trim()) return;
        await onUpdateProfile(editName, selectedAvatarSeed);
        setIsEditingName(false);
    };

    const currentAvatar = isEditingName && selectedAvatarSeed
        ? `https://api.dicebear.com/7.x/adventurer/svg?seed=${selectedAvatarSeed}`
        : (user?.photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${user?.displayName || 'Mimi'}`);

    return (
        <div className="px-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
            <div className="flex flex-col items-center mb-10 pt-4">
                <div className="relative">
                    <div className="w-28 h-28 rounded-[2.5rem] bg-gradient-to-tr from-purple-400 to-pink-500 p-1 shadow-2xl">
                        <div className="w-full h-full bg-white rounded-[2.3rem] overflow-hidden">
                            <img
                                src={currentAvatar}
                                alt="Avatar"
                                className="w-full h-full scale-125 translate-y-3"
                            />
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            setEditName(user?.displayName || '');
                            setSelectedAvatarSeed('');
                            setIsEditingName(true);
                        }}
                        className="absolute -bottom-2 -right-2 bg-white p-2.5 rounded-2xl shadow-lg border border-purple-100 hover:bg-purple-50 transition-colors"
                    >
                        <Pencil size={20} className="text-purple-600" />
                    </button>
                </div>

                {isEditingName ? (
                    <div className="mt-6 flex flex-col items-center gap-4 animate-in fade-in slide-in-from-bottom-2 w-full">
                        {/* Name Edit */}
                        <div className="flex items-center gap-2">
                            <input
                                autoFocus
                                className="text-2xl font-black text-purple-900 bg-purple-50 border-b-2 border-purple-300 outline-none w-48 text-center"
                                value={editName}
                                onChange={e => setEditName(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSave()}
                            />
                            <button onClick={handleSave} className="p-2 bg-emerald-100 rounded-full text-emerald-600 hover:bg-emerald-200">
                                <Check size={20} />
                            </button>
                            <button onClick={() => setIsEditingName(false)} className="p-2 bg-red-100 rounded-full text-red-600 hover:bg-red-200">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Avatar Selection */}
                        <div className="w-full overflow-x-auto pb-4 px-4 scrollbar-hide">
                            <p className="text-center text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Choose your Look</p>
                            <div className="flex gap-3 justify-center">
                                {GIRL_AVATAR_SEEDS.map(seed => (
                                    <button
                                        key={seed}
                                        onClick={() => setSelectedAvatarSeed(seed)}
                                        className={`w-14 h-14 rounded-2xl overflow-hidden border-2 transition-all flex-shrink-0
                                            ${selectedAvatarSeed === seed ? 'border-purple-500 scale-110 shadow-lg' : 'border-slate-100 opacity-60 hover:opacity-100'}
                                        `}
                                    >
                                        <img
                                            src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${seed}`}
                                            alt={seed}
                                            className="w-full h-full scale-125 translate-y-2"
                                        />
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                    <h2 className="mt-6 text-3xl font-black text-purple-900 leading-none text-center px-4">
                        {user?.displayName || "Explorer"}
                    </h2>
                )}
                <p className="text-xs font-bold text-purple-400 uppercase tracking-widest mt-3">Adventurer since 2024</p>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8">
                {[
                    { label: 'Total Stars', val: stats.stars, icon: <Star className="text-amber-500" fill="currentColor" />, bg: 'bg-amber-50' },
                    { label: 'Day Streak', val: stats.streak, icon: <Flame className="text-orange-500" fill="currentColor" />, bg: 'bg-orange-50' },
                ].map((stat, i) => (
                    <div key={i} className={`${stat.bg} rounded-[2rem] p-6 flex flex-col items-center justify-center text-center shadow-sm border border-black/5`}>
                        <div className="mb-3 scale-110">{stat.icon}</div>
                        <span className="text-2xl font-black text-slate-700 leading-none">{stat.val}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase mt-2">{stat.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};
