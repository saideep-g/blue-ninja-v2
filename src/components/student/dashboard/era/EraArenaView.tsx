import React, { useState } from 'react';
import {
    PlusCircle, Timer, History, Trophy, X, UserPlus, Send, Moon, Dices, CheckCircle2
} from 'lucide-react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../../services/db/firebase';
import { Bundle, Challenge, User as UserModel } from '../../../../types/models';

interface EraArenaViewProps {
    subView: 'create' | 'active' | 'history';
    setSubView: (view: 'create' | 'active' | 'history') => void;
    bundles: Bundle[];
    activeChallenges: Challenge[];
    friends: UserModel[];
    user: any;
    ninjaStats: any;
    onEnterArena: (challenge: Challenge) => void;
}

export const EraArenaView: React.FC<EraArenaViewProps> = ({
    subView,
    setSubView,
    bundles,
    activeChallenges,
    friends,
    user,
    ninjaStats,
    onEnterArena
}) => {
    // Local Builder State
    const [selectedBundles, setSelectedBundles] = useState<Bundle[]>([]);
    const [selectedFriends, setSelectedFriends] = useState<UserModel[]>([]);
    const [guestEmails, setGuestEmails] = useState<string[]>([]);
    const [inviteEmailInput, setInviteEmailInput] = useState('');
    const [challengeName, setChallengeName] = useState('');
    const [showChallengeSent, setShowChallengeSent] = useState(false);

    const generateRandomChallengeName = () => {
        const prefixes = ["The", "Main Character", "Absolute", "POV: You're in your", "Vibe Check:", "Final Boss", "CEO of"];
        const middle = ["Slay", "Genius", "Aura", "Queen", "Legend", "Master"];
        const suffixes = ["Era", "Quest", "Mission", "Moment", "Rumble", "Energy"];
        const random = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];
        return `${random(prefixes)} ${random(middle)} ${random(suffixes)}`;
    };

    const toggleBundle = (bundle: Bundle) => {
        if (selectedBundles.find(b => b.id === bundle.id)) {
            setSelectedBundles(selectedBundles.filter(b => b.id !== bundle.id));
        } else if (selectedBundles.length < 5) {
            setSelectedBundles([...selectedBundles, bundle]);
        }
    };

    const toggleFriend = (friend: UserModel) => {
        if (selectedFriends.find(f => f.id === friend.id)) {
            setSelectedFriends(selectedFriends.filter(f => f.id !== friend.id));
        } else {
            setSelectedFriends([...selectedFriends, friend]);
        }
    };

    const addGuestEmail = () => {
        if (inviteEmailInput && !guestEmails.includes(inviteEmailInput)) {
            setGuestEmails([...guestEmails, inviteEmailInput]);
            setInviteEmailInput('');
        }
    };

    const handleSendChallenge = async () => {
        const totalRecipients = selectedFriends.length + guestEmails.length;
        if (selectedBundles.length > 0 && totalRecipients > 0) {
            const finalName = challengeName || generateRandomChallengeName();
            setChallengeName(finalName);

            try {
                await addDoc(collection(db, 'challenges'), {
                    name: finalName,
                    creatorId: user?.uid,
                    creatorName: ninjaStats?.username || user?.displayName || 'Unknown Era',
                    bundleIds: selectedBundles.map(b => b.id),
                    participants: [
                        ...selectedFriends.map(f => ({
                            userId: f.id,
                            name: f.username || f.email || 'Friend',
                            status: 'pending',
                            avatar: f.profile?.avatar || '👤'
                        })),
                        ...guestEmails.map(e => ({
                            userId: e,
                            name: e,
                            status: 'pending',
                            isGuest: true,
                            avatar: '📧'
                        })),
                        // Add self
                        {
                            userId: user?.uid,
                            name: 'Me',
                            status: 'accepted',
                            avatar: '👑'
                        }
                    ],
                    status: 'active',
                    createdAt: serverTimestamp(),
                    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h expiry
                });

                setShowChallengeSent(true);
                setTimeout(() => {
                    setShowChallengeSent(false);
                    setSelectedBundles([]);
                    setSelectedFriends([]);
                    setGuestEmails([]);
                    setInviteEmailInput('');
                    setChallengeName('');
                }, 3000);
            } catch (e) {
                console.error("Failed to blast challenge", e);
                alert("Failed to create challenge. Try again.");
            }
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-in slide-in-from-bottom-8 duration-500">
            {/* LEFT: ARENA CONTENT */}
            <div className="lg:col-span-8 space-y-10">

                {/* ARENA NAVIGATION */}
                <div className="flex bg-white/40 backdrop-blur-md p-1.5 rounded-[2rem] border border-white/60 w-fit">
                    <button
                        onClick={() => setSubView('create')}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${subView === 'create' ? 'bg-[#1A1A1A] text-white shadow-lg' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        <PlusCircle size={14} /> New Quest
                    </button>
                    <button
                        onClick={() => setSubView('active')}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${subView === 'active' ? 'bg-[#1A1A1A] text-white shadow-lg' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        <Timer size={14} /> Active {activeChallenges.length > 0 && `(${activeChallenges.length})`}
                    </button>
                    <button
                        onClick={() => setSubView('history')}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${subView === 'history' ? 'bg-[#1A1A1A] text-white shadow-lg' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        <History size={14} /> Hall of Slay
                    </button>
                </div>

                {/* BUILDER VIEW */}
                {subView === 'create' && (
                    <div className="bg-white/60 backdrop-blur-2xl p-8 rounded-[3rem] border border-white/80 shadow-sm animate-in fade-in duration-500">
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h2 className="text-2xl font-serif italic text-gray-800 tracking-tight">Practice Hub</h2>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Pick up to 5 bundles to build a Group Challenge</p>
                            </div>
                            <div className="bg-pink-50 text-pink-400 p-3 rounded-2xl">
                                <Trophy size={24} />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {bundles.length === 0 ? (
                                <div className="col-span-full p-8 text-center text-gray-400 text-sm">No bundles available yet. Ask admin to create some!</div>
                            ) : bundles.map((bundle) => {
                                const isSelected = selectedBundles.some(b => b.id === bundle.id);
                                const bgColor = isSelected ? 'bg-pink-50' : (bundle.color || 'bg-white');

                                return (
                                    <button
                                        key={bundle.id}
                                        onClick={() => toggleBundle(bundle)}
                                        className={`group p-6 rounded-[2.5rem] border-2 transition-all duration-300 text-center flex flex-col items-center gap-3 relative ${isSelected ? 'bg-white border-pink-400 shadow-xl -translate-y-2' : 'bg-white/40 border-white hover:border-pink-50 shadow-sm'
                                            }`}
                                    >
                                        <div className={`w-14 h-14 rounded-full ${bgColor} flex items-center justify-center text-3xl shadow-inner transition-transform group-hover:scale-110`}>
                                            {bundle.icon || '📦'}
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-black text-gray-800 leading-tight">{bundle.name || bundle.title}</h4>
                                            <p className="text-[9px] font-bold text-gray-400 uppercase mt-1 tracking-widest">{bundle.questionCount || 0} Qs</p>
                                            <p className="text-[8px] font-bold text-gray-300 uppercase mt-0.5">{bundle.subject}</p>
                                        </div>
                                        {isSelected && (
                                            <div className="absolute top-2 right-2 bg-pink-400 text-white p-1 rounded-full shadow-lg">
                                                <PlusCircle size={14} fill="white" className="text-pink-400" />
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* ACTIVE CHALLENGES VIEW */}
                {subView === 'active' && (
                    <div className="space-y-6 animate-in fade-in duration-500">
                        {activeChallenges.map(quest => (
                            <div key={quest.id} className="bg-white/60 backdrop-blur-2xl p-8 rounded-[3rem] border border-white/80 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
                                <div className="flex gap-4 items-center">
                                    <div className="w-16 h-16 bg-pink-50 rounded-[2rem] flex items-center justify-center text-3xl shadow-inner">⚡</div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h4 className="text-xl font-serif italic text-gray-800">{quest.name}</h4>
                                            <span className="bg-pink-100 text-pink-500 text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">{quest.status}</span>
                                        </div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">
                                            Invited by {quest.creatorName} • Expires {quest.expiresAt?.toDate().toLocaleTimeString()}
                                        </p>
                                        <div className="flex -space-x-2 mt-3">
                                            {quest.participants.map((p, i) => (
                                                <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-[10px] font-bold overflow-hidden" title={p.name}>
                                                    {p.avatar && p.avatar.length < 5 ? p.avatar : (p.name?.[0] || '?')}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <button onClick={() => onEnterArena(quest)} className="bg-[#1A1A1A] text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg hover:bg-pink-500 transition-all active:scale-95">
                                    Enter Arena
                                </button>
                            </div>
                        ))}
                        {activeChallenges.length === 0 && (
                            <div className="p-20 text-center space-y-4 bg-white/40 rounded-[3rem] border border-dashed border-gray-200 text-gray-400">
                                <Moon size={40} className="mx-auto" />
                                <p className="font-serif italic text-xl">Quiet in here... invite some besties?</p>
                            </div>
                        )}
                    </div>
                )}

                {/* CHALLENGE TRAY */}
                {subView === 'create' && (selectedBundles.length > 0 || selectedFriends.length > 0 || guestEmails.length > 0) && (
                    <div className="bg-[#1A1A1A] text-white p-8 rounded-[3rem] shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-serif italic">Group Challenge Era</h3>
                            <span className="text-[10px] font-black uppercase tracking-widest text-white/40">{selectedBundles.length} / 5 Bundles</span>
                        </div>

                        {/* Name Your Era */}
                        <div className="mb-8 space-y-4">
                            <div className="flex items-center justify-between">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Name Your Era</p>
                                <button
                                    onClick={() => setChallengeName(generateRandomChallengeName())}
                                    className="text-[8px] font-black uppercase tracking-widest text-pink-400 flex items-center gap-1 hover:text-white transition-colors"
                                >
                                    <Dices size={12} /> Randomize
                                </button>
                            </div>
                            <input
                                type="text"
                                placeholder="Enter a legendary name for this challenge..."
                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xs font-bold outline-none focus:border-pink-400/50 transition-all"
                                value={challengeName}
                                onChange={(e) => setChallengeName(e.target.value)}
                            />
                        </div>

                        {/* Selected Bundles */}
                        <div className="flex flex-wrap gap-3 mb-8">
                            {selectedBundles.map(b => (
                                <div key={b.id} className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full border border-white/10 group">
                                    <span>{b.icon || '📦'}</span>
                                    <span className="text-[10px] font-black uppercase tracking-wider">{b.name || b.title}</span>
                                    <button onClick={() => toggleBundle(b)} className="text-white/20 hover:text-pink-400"><X size={14} /></button>
                                </div>
                            ))}
                        </div>

                        <div className="h-[1px] bg-white/10 w-full mb-8"></div>

                        {/* Participants */}
                        <div className="mb-8">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-4">The Squad ({selectedFriends.length + guestEmails.length})</p>
                            <div className="flex flex-wrap gap-3">
                                {selectedFriends.map(f => (
                                    <div key={f.id} className="flex items-center gap-2 bg-pink-400/20 px-3 py-1.5 rounded-xl border border-pink-400/30">
                                        <span className="text-sm">{f.profile?.avatar ? '👤' : '😊'}</span>
                                        <span className="text-[10px] font-black text-pink-100">{f.username}</span>
                                        <button onClick={() => toggleFriend(f)} className="text-pink-400/50 hover:text-pink-400"><X size={12} /></button>
                                    </div>
                                ))}
                                {guestEmails.map(email => (
                                    <div key={email} className="flex items-center gap-2 bg-indigo-400/20 px-3 py-1.5 rounded-xl border border-indigo-400/30">
                                        <span className="text-[10px] font-black text-indigo-100">{email}</span>
                                        <button onClick={() => setGuestEmails(guestEmails.filter(e => e !== email))} className="text-indigo-400/50 hover:text-indigo-400"><X size={12} /></button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Invite Input */}
                        <div className="flex flex-col md:flex-row gap-6 items-end">
                            <div className="flex-1 space-y-4 w-full">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Invite Guest Besties</p>
                                <div className="flex-1 flex gap-2 bg-white/5 border border-white/10 rounded-2xl p-2 items-center">
                                    <input
                                        type="email"
                                        placeholder="Add email address..."
                                        className="flex-1 bg-transparent px-4 text-xs font-bold outline-none text-white h-8"
                                        value={inviteEmailInput}
                                        onChange={(e) => setInviteEmailInput(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && addGuestEmail()}
                                    />
                                    <button
                                        onClick={addGuestEmail}
                                        className="p-2 bg-white/10 rounded-xl hover:bg-white/20 text-pink-400 transition-all"
                                    >
                                        <UserPlus size={18} />
                                    </button>
                                </div>
                            </div>
                            <button
                                onClick={handleSendChallenge}
                                disabled={selectedBundles.length === 0 || (selectedFriends.length === 0 && guestEmails.length === 0)}
                                className="bg-pink-400 hover:bg-pink-500 disabled:opacity-30 text-white px-8 h-12 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 transition-all shadow-xl shadow-pink-900/20 active:scale-95 whitespace-nowrap"
                            >
                                Blast Group Challenge <Send size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* RIGHT: GANG SELECTOR */}
            <div className="lg:col-span-4 space-y-8 sticky top-8">
                <div className="bg-white/70 backdrop-blur-3xl rounded-[3rem] border border-white shadow-sm p-8 flex flex-col gap-8 h-full min-h-[500px]">
                    <div className="space-y-6">
                        <div className="flex justify-between items-center px-1">
                            <h3 className="text-xl font-serif italic text-gray-800">The Gang</h3>
                            <button className="p-2 bg-pink-50 text-pink-400 rounded-xl"><PlusCircle size={20} /></button>
                        </div>
                        <div className="space-y-4 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
                            {friends.length === 0 ? (
                                <p className="text-xs text-center text-gray-400 italic">No vibe tribe yet.</p>
                            ) : friends.map(f => {
                                const isSelected = selectedFriends.some(item => item.id === f.id);
                                return (
                                    <button
                                        key={f.id}
                                        onClick={() => toggleFriend(f)}
                                        className={`w-full flex items-center justify-between p-4 rounded-[2rem] border transition-all duration-300 group ${isSelected
                                            ? 'bg-pink-50 border-pink-100 text-pink-600 ring-2 ring-pink-50'
                                            : 'bg-gray-50/50 border-gray-100 text-gray-400 hover:border-pink-50'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-12 h-12 bg-white rounded-full flex items-center justify-center text-2xl shadow-sm border border-gray-100 transition-transform ${isSelected ? 'scale-110 shadow-pink-100' : 'group-hover:scale-105'}`}>
                                                {f.profile?.avatar ? '👤' : '😊'}
                                            </div>
                                            <div className="text-left">
                                                <p className={`text-xs font-black ${isSelected ? 'text-pink-600' : 'text-gray-800'}`}>{f.username || f.email}</p>
                                                <p className="text-[10px] text-gray-400 font-bold tracking-tight">Challenge to Group</p>
                                            </div>
                                        </div>
                                        <div className={`w-6 h-6 rounded-full border flex items-center justify-center transition-colors ${isSelected ? 'bg-pink-400 border-pink-400 text-white' : 'border-gray-200'}`}>
                                            {isSelected ? <CheckCircle2 size={12} fill="currentColor" stroke="white" /> : <PlusCircle size={12} />}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="space-y-6">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-300">Era Highlights</p>
                        <div className="space-y-4 opacity-60">
                            {/* Mock highlights for now */}
                            <div className="flex items-center gap-3 text-xs">
                                <span className="text-lg">👑</span>
                                <p className="font-bold text-gray-600"><span className="text-gray-800">Anya Era</span> invited 4 people to flags!</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* CHALLENGE SUCCESS OVERLAY */}
            {showChallengeSent && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-md"></div>
                    <div className="relative bg-white p-12 rounded-[4rem] text-center shadow-2xl max-w-sm w-full space-y-6 animate-in zoom-in duration-500">
                        <div className="w-24 h-24 bg-pink-50 rounded-full flex items-center justify-center text-5xl mx-auto shadow-inner">⚡</div>
                        <div className="space-y-2">
                            <h3 className="text-3xl font-serif italic text-gray-800 tracking-tight">
                                {challengeName || "New Era"} Started!
                            </h3>
                            <p className="text-sm text-gray-400 font-medium">Blast sent to {selectedFriends.length + guestEmails.length} besties. Prepare for the slay!</p>
                        </div>
                        <div className="pt-4">
                            <button
                                onClick={() => { setShowChallengeSent(false); setSubView('active'); }}
                                className="bg-pink-400 text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-pink-100"
                            >
                                Track Active Quests
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
