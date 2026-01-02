import React, { useState, useEffect } from 'react';
import {
    Trophy, Zap, Plus, Timer, History,
    ArrowLeft, CheckCircle2, User, Play, Package, Loader, Send
} from 'lucide-react';
import { useNinja } from '../../../context/NinjaContext';
import { collection, query, orderBy, getDocs, where, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../services/db/firebase';
import { Bundle, Challenge, User as UserModel } from '../../../types/models';

interface MobileChallengeArenaProps {
    onBack: () => void;
}

export const MobileChallengeArena: React.FC<MobileChallengeArenaProps> = ({ onBack }) => {
    const { user, ninjaStats } = useNinja();
    const [subView, setSubView] = useState<'create' | 'active' | 'history'>('create');
    const [bundles, setBundles] = useState<Bundle[]>([]);
    const [activeChallenges, setActiveChallenges] = useState<Challenge[]>([]);
    const [friends, setFriends] = useState<UserModel[]>([]);
    const [loading, setLoading] = useState(true);

    // Creation State
    const [selectedBundles, setSelectedBundles] = useState<Bundle[]>([]);
    const [challengeName, setChallengeName] = useState('');
    const [sending, setSending] = useState(false);

    // --- DATA FETCHING ---
    useEffect(() => {
        const fetchBundles = async () => {
            try {
                const q = query(collection(db, 'question_bundles'), orderBy('updatedAt', 'desc'));
                const snap = await getDocs(q);
                const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Bundle));
                // Only show bundles tagged for 'challenge'
                const challengeBundles = list.filter(b => b.tags?.includes('challenge'));
                setBundles(challengeBundles);
            } catch (e) {
                console.error("Bundles fetch error", e);
            } finally {
                setLoading(false);
            }
        };

        // Mock Friends Fetch matching StudyEra
        const fetchFriends = async () => {
            try {
                const snap = await getDocs(collection(db, 'students'));
                const list = snap.docs
                    .map(d => ({ id: d.id, ...d.data() } as UserModel))
                    .filter(u => u.id !== user?.uid)
                    .slice(0, 10);
                setFriends(list);
            } catch (e) { console.error(e); }
        };

        fetchBundles();
        if (user) fetchFriends();
    }, [user]);

    useEffect(() => {
        if (!user) return;
        const q = query(collection(db, 'challenges'), where('status', '==', 'active'), orderBy('createdAt', 'desc'));
        const unsub = onSnapshot(q, (snap) => {
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Challenge));
            // Client Filter
            const mine = list.filter(c => c.participants.some(p => p.userId === user.uid));
            setActiveChallenges(mine);
        });
        return () => unsub();
    }, [user]);

    // --- ACTIONS ---

    const toggleBundle = (b: Bundle) => {
        if (selectedBundles.find(sb => sb.id === b.id)) {
            setSelectedBundles(prev => prev.filter(i => i.id !== b.id));
        } else if (selectedBundles.length < 5) {
            setSelectedBundles(prev => [...prev, b]);
        }
    };

    const handleCreate = async () => {
        if (selectedBundles.length === 0 || !user) return;
        setSending(true);
        try {
            await addDoc(collection(db, 'challenges'), {
                name: challengeName || `Quest #${Math.floor(Math.random() * 1000)}`,
                creatorId: user.uid,
                creatorName: ninjaStats?.username || user.displayName || 'Friend',
                bundleIds: selectedBundles.map(b => b.id),
                participants: [
                    { userId: user.uid, name: 'Me', status: 'accepted', avatar: '👑' }
                    // Simplify Mobile: Only solo or open challenges for now, or add friend selector later
                    // To keep UI simple for mobile, we make it a "Public" or "Solo" challenge primarily?
                    // Or just auto-invite "The Gang" if previously defined?
                    // Providing a simpler flow: Just create for Self + Open for others to join if shared.
                ],
                status: 'active',
                createdAt: serverTimestamp(),
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
            });
            setSubView('active');
            setSelectedBundles([]);
            setChallengeName('');
        } catch (e) {
            console.error("Create failed", e);
        } finally {
            setSending(false);
        }
    };

    // --- RENDER ---

    return (
        <div className="flex flex-col h-full bg-slate-50 relative pb-24">
            {/* Header */}
            <div className="bg-white p-6 pb-4 shadow-sm z-10 sticky top-0">
                <div className="flex justify-between items-center mb-4">
                    <button onClick={onBack} className="p-2 -ml-2 text-slate-400 hover:text-slate-600">
                        <ArrowLeft size={24} />
                    </button>
                    <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Challenge Arena</h2>
                    <div className="w-8"></div> {/* Spacer */}
                </div>

                {/* Tabs */}
                <div className="flex bg-slate-100 p-1 rounded-xl">
                    <button
                        onClick={() => setSubView('create')}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${subView === 'create' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-400'}`}
                    >
                        <Plus className="inline w-3 h-3 mb-0.5 mr-1" /> Build
                    </button>
                    <button
                        onClick={() => setSubView('active')}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${subView === 'active' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-400'}`}
                    >
                        <Timer className="inline w-3 h-3 mb-0.5 mr-1" /> Active
                    </button>
                    <button
                        onClick={() => setSubView('history')}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${subView === 'history' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-400'}`}
                    >
                        <History className="inline w-3 h-3 mb-0.5 mr-1" /> History
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
                {subView === 'create' && (
                    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">
                        {/* Bundle Selector */}
                        <div>
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Select Bundles ({selectedBundles.length}/5)</h3>
                            <div className="grid grid-cols-2 gap-3">
                                {loading ? (
                                    <Loader className="animate-spin text-purple-500 m-auto col-span-2" />
                                ) : bundles.length === 0 ? (
                                    <div className="col-span-2 text-center p-8 bg-purple-50 rounded-2xl border border-purple-100 border-dashed">
                                        <div className="text-4xl mb-2">🤷‍♂️</div>
                                        <p className="font-bold text-slate-600">No Challenge Bundles Found</p>
                                        <p className="text-xs text-slate-400">Ask your teacher to tag some bundles for the Arena!</p>
                                    </div>
                                ) : (
                                    bundles.map(b => {
                                        const isSelected = selectedBundles.some(sb => sb.id === b.id);
                                        return (
                                            <button
                                                key={b.id}
                                                onClick={() => toggleBundle(b)}
                                                className={`relative p-4 rounded-2xl border-2 text-left transition-all ${isSelected
                                                    ? 'bg-purple-50 border-purple-500 shadow-md ring-2 ring-purple-100'
                                                    : 'bg-white border-transparent shadow-sm'
                                                    }`}
                                            >
                                                <div className="text-2xl mb-2">{b.icon || '📦'}</div>
                                                <h4 className="font-bold text-slate-800 text-sm leading-tight mb-1">{b.name || b.title}</h4>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase">{b.questionCount || 0} Questions</p>
                                                {isSelected && <div className="absolute top-2 right-2 text-purple-500"><CheckCircle2 size={16} fill="currentColor" className="text-white" /></div>}
                                            </button>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        {/* Action Area */}
                        {selectedBundles.length > 0 && (
                            <div className="bg-white p-4 rounded-3xl shadow-lg border border-purple-100 sticky bottom-4">
                                <input
                                    type="text"
                                    placeholder="Name your quest..."
                                    className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm font-bold text-slate-700 mb-3 focus:ring-2 focus:ring-purple-200 outline-none"
                                    value={challengeName}
                                    onChange={e => setChallengeName(e.target.value)}
                                />
                                <button
                                    onClick={handleCreate}
                                    disabled={sending}
                                    className="w-full bg-purple-600 text-white py-3 rounded-xl font-black uppercase text-sm tracking-widest shadow-lg shadow-purple-200 active:scale-95 transition-all flex justify-center items-center gap-2"
                                >
                                    {sending ? <Loader className="animate-spin w-4 h-4" /> : <><Zap size={16} /> Start Quest</>}
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {subView === 'active' && (
                    <div className="space-y-4">
                        {activeChallenges.length === 0 ? (
                            <div className="text-center p-8 text-slate-400">
                                <Timer className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                <p className="font-bold">No active quests.</p>
                                <button onClick={() => setSubView('create')} className="text-purple-500 text-sm font-bold mt-2">Start one now?</button>
                            </div>
                        ) : activeChallenges.map(c => (
                            <div key={c.id} className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h4 className="font-black text-slate-800 text-lg">{c.name}</h4>
                                        <p className="text-xs text-slate-400 font-bold mt-1">Created by {c.creatorName}</p>
                                    </div>
                                    <span className="bg-emerald-100 text-emerald-600 text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-wider">Active</span>
                                </div>

                                <div className="flex -space-x-2 mb-6">
                                    {c.participants.slice(0, 5).map((p, i) => (
                                        <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-xs shadow-sm">
                                            {p.avatar && p.avatar.length < 5 ? p.avatar : (p.name?.[0] || '?')}
                                        </div>
                                    ))}
                                    {c.participants.length > 5 && (
                                        <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500">
                                            +{c.participants.length - 5}
                                        </div>
                                    )}
                                </div>

                                <button className="w-full bg-slate-900 text-white py-3 rounded-xl font-black uppercase text-xs tracking-widest shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2">
                                    Play Now <Play size={14} fill="currentColor" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {subView === 'history' && (
                    <div className="text-center p-12 text-slate-400">
                        <History className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p className="font-bold">History coming soon...</p>
                    </div>
                )}
            </div>
        </div>
    );
};
