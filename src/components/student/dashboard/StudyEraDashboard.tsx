import React, { useState, useEffect, useMemo } from 'react';
import {
    LayoutDashboard, Trophy, CheckCircle2, TrendingUp, Zap, ChevronRight,
    Search, Star, Flame, User, Sparkles, Moon, Users, PlusCircle, Send, X,
    UserPlus, History, Timer, Crown, Dices, Package
} from 'lucide-react';
import { useNinja } from '../../../context/NinjaContext';
import { useNavigate } from 'react-router-dom';
import coreCurriculum from '../../../data/cbse7_core_curriculum_v3.json';
import { collection, query, where, getDocs, addDoc, serverTimestamp, onSnapshot, orderBy, doc, getDoc } from 'firebase/firestore';
import { db } from '../../../services/db/firebase';
import { Bundle, Challenge, User as UserModel, Question } from '../../../types/models';
import { McqEraTemplate } from '../../templates/McqEraTemplate';

const ProgressBar = ({ value, color, height = "h-2" }: { value: number, color?: string, height?: string }) => (
    <div className={`w-full bg-black/5 rounded-full ${height} overflow-hidden`}>
        <div
            className={`${height} rounded-full transition-all duration-1000 ease-[cubic-bezier(0.34,1.56,0.64,1)] shadow-[0_0_15px_-3px_rgba(0,0,0,0.1)]`}
            style={{
                width: `${value}%`,
                backgroundColor: color || '#FF8DA1',
                backgroundImage: 'linear-gradient(90deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 100%)'
            }}
        />
    </div>
);

/**
 * TEMPLATE FOR STATIC SUBJECTS
 */
const SUBJECT_TEMPLATE = [
    {
        id: 'science',
        name: 'Science Era',
        icon: '🌸',
        color: 'from-[#E0C3FC] to-[#8EC5FC]',
        accent: '#A18CD1',
        completedToday: false,
        modules: [
            {
                id: 's_bio',
                name: 'Biology Basics',
                mastery: 45,
                atoms: [
                    { id: 's1', name: 'Photosynthesis', mastery: 90, status: 'Mastered' },
                    { id: 's2', name: 'Cell Structure', mastery: 10, status: 'New' }
                ]
            }
        ]
    },
    {
        id: 'gk',
        name: 'GK Era',
        icon: '✨',
        color: 'from-[#fdfcfb] to-[#e2d1c3]',
        accent: '#D4A373',
        completedToday: true,
        modules: [
            {
                id: 'g_geo',
                name: 'Geography',
                mastery: 92,
                atoms: [
                    { id: 'g1', name: 'World Capitals', mastery: 95, status: 'Mastered' }
                ]
            }
        ]
    },
    {
        id: 'english',
        name: 'English Era',
        icon: '💌',
        color: 'from-[#f6d365] to-[#fda085]',
        accent: '#f093fb',
        completedToday: true,
        modules: [
            {
                id: 'e_gram',
                name: 'Grammar',
                mastery: 60,
                atoms: [
                    { id: 'e1', name: 'Tenses', mastery: 75, status: 'Learning' }
                ]
            }
        ]
    },
    {
        id: 'tables',
        name: 'Table Era',
        icon: '🍬',
        color: 'from-[#84fab0] to-[#8fd3f4]',
        accent: '#43e97b',
        completedToday: false,
        modules: [
            {
                id: 't_basics',
                name: 'Foundations',
                mastery: 82,
                atoms: [
                    { id: 't1', name: 'Tables 2-12', mastery: 100, status: 'Mastered' }
                ]
            }
        ]
    }
];

const StudyEraDashboard = () => {
    const { user, ninjaStats } = useNinja();
    const navigate = useNavigate();

    // Navigation & View State
    const [currentView, setCurrentView] = useState<'dashboard' | 'challenges' | 'quiz'>('dashboard');
    const [arenaSubView, setArenaSubView] = useState<'create' | 'active' | 'history'>('create');

    const [selectedSubject, setSelectedSubject] = useState<any>(null);
    const [viewMode, setViewMode] = useState<'modules' | 'atoms'>('modules');
    const [atomFilter, setAtomFilter] = useState('');
    const [greeting, setGreeting] = useState("Loading vibes...");

    // Quiz State
    const [quizQuestions, setQuizQuestions] = useState<Question[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [quizScore, setQuizScore] = useState(0);

    // Data State
    const [subjects, setSubjects] = useState<any[]>([]);
    const [bundles, setBundles] = useState<Bundle[]>([]);
    const [friends, setFriends] = useState<UserModel[]>([]);
    const [activeChallenges, setActiveChallenges] = useState<Challenge[]>([]);

    // Challenge Creation State
    const [selectedBundles, setSelectedBundles] = useState<Bundle[]>([]);
    const [selectedFriends, setSelectedFriends] = useState<UserModel[]>([]);
    const [guestEmails, setGuestEmails] = useState<string[]>([]);
    const [inviteEmailInput, setInviteEmailInput] = useState('');
    const [challengeName, setChallengeName] = useState('');
    const [showChallengeSent, setShowChallengeSent] = useState(false);

    const handleStartQuiz = async () => {
        // Mock Questions for "Vibe Check" if no real data
        const mockQuestions: Question[] = [
            {
                id: 'q1',
                type: 'MCQ_SIMPLIFIED',
                text: 'What is the capital of France?',
                content: { prompt: { text: "Which city is known as the 'City of Love'?" } },
                interaction: { config: { options: [{ text: 'London', id: '1' }, { text: 'Paris', id: '2' }, { text: 'Berlin', id: '3' }] } },
                correctOptionId: '2',
                subject: 'gk'
            } as any,
            {
                id: 'q2',
                type: 'MCQ_SIMPLIFIED',
                text: 'Math Vibe',
                content: { prompt: { text: "Solve for $x$: $2x + 5 = 15$" }, instruction: "Don't panic, it's just algebra." },
                interaction: { config: { options: [{ text: '$x=5$', id: '1' }, { text: '$x=10$', id: '2' }, { text: '$x=2.5$', id: '3' }] } },
                correctOptionId: '1',
                subject: 'math'
            } as any
        ];

        setQuizQuestions(mockQuestions);
        setCurrentQuestionIndex(0);
        setQuizScore(0);
        setCurrentView('quiz');
    };

    const handleQuizAnswer = (result: any) => {
        if (result.isCorrect) setQuizScore(prev => prev + 1);

        if (currentQuestionIndex < quizQuestions.length - 1) {
            setTimeout(() => setCurrentQuestionIndex(prev => prev + 1), 1500);
        } else {
            // End of Quiz
            setTimeout(() => {
                alert(`Era Completed! Score: ${quizScore + (result.isCorrect ? 1 : 0)}/${quizQuestions.length}`);
                setCurrentView('dashboard');
            }, 2000);
        }
    };

    const handleEnterArena = async (challenge: Challenge) => {
        try {
            const allQuestions: Question[] = [];
            // Fetch all bundles in parallel
            await Promise.all(challenge.bundleIds.map(async (bundleId) => {
                const bundleRef = doc(db, 'question_bundles', bundleId);
                const bundleSnap = await getDoc(bundleRef);
                if (bundleSnap.exists()) {
                    const data = bundleSnap.data();
                    if (data.questions && Array.isArray(data.questions)) {
                        allQuestions.push(...data.questions as Question[]);
                    }
                }
            }));

            if (allQuestions.length > 0) {
                // Shuffle questions
                const shuffled = allQuestions.sort(() => Math.random() - 0.5);
                setQuizQuestions(shuffled);
                setCurrentQuestionIndex(0);
                setQuizScore(0);
                setCurrentView('quiz');
            } else {
                alert("This arena seems empty! No questions found.");
            }
        } catch (e) {
            console.error("Failed to enter arena", e);
            alert("Failed to load arena questions.");
        }
    };

    // --- INITIALIZATION & DATA FETCHING ---

    useEffect(() => {
        const hour = new Date().getHours();
        if (hour < 12) setGreeting("Good morning, Angel ☕");
        else if (hour < 18) setGreeting("Slay the afternoon 💅");
        else setGreeting("Evening routine... 🌙");
    }, []);

    // 1. Build Subjects (Dynamic Logic from Previous Step)
    useEffect(() => {
        const enrolled = ninjaStats?.enrolledSubjects || [];
        let activeSubjects: any[] = [];

        // Math Logic
        if (enrolled.includes('math') || enrolled.length === 0) {
            const mathModules = coreCurriculum.modules.map(mod => {
                const atoms = mod.atoms.map(atom => {
                    const mScore = ninjaStats?.mastery?.[atom.atom_id] || 0;
                    return {
                        id: atom.atom_id,
                        name: atom.title.split('(')[0].trim(),
                        mastery: Math.min(100, Math.round(mScore * 100)),
                        status: mScore > 0.8 ? 'Mastered' : mScore > 0.1 ? 'Learning' : 'New'
                    };
                });
                const avgMastery = atoms.length > 0 ? Math.round(atoms.reduce((acc, curr) => acc + curr.mastery, 0) / atoms.length) : 0;
                return {
                    id: mod.module_id,
                    name: mod.title.split(':')[0] === 'Chapter' ? mod.title.split(':')[1].trim() : mod.title.trim(),
                    mastery: avgMastery,
                    atoms
                };
            });

            activeSubjects.push({
                id: 'math',
                name: 'Maths Era',
                icon: '🎀',
                color: 'from-[#FFDEE9] to-[#B5FFFC]',
                accent: '#FF8DA1',
                completedToday: false,
                modules: mathModules
            });
        }

        // Other Subjects
        SUBJECT_TEMPLATE.forEach(tpl => {
            if (enrolled.includes(tpl.id) || enrolled.length === 0) {
                activeSubjects.push(tpl);
            }
        });

        setSubjects(activeSubjects);
    }, [ninjaStats, user]);

    // 2. Fetch Bundles
    useEffect(() => {
        const fetchBundles = async () => {
            try {
                const q = query(collection(db, 'question_bundles'), orderBy('updatedAt', 'desc'));
                const snap = await getDocs(q);
                const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Bundle));
                setBundles(list);
            } catch (e) {
                console.error("Failed to fetch bundles", e);
            }
        };
        fetchBundles();
    }, []);

    // 3. Fetch Friends (Mock logic: Fetch students)
    useEffect(() => {
        const fetchFriends = async () => {
            try {
                // Ideally fetch from user.following, but for now fetch random students
                const q = query(collection(db, 'students'), where('role', '==', 'STUDENT')); // filtering might require index
                // fallback to simple get if index missing or just get first 20
                // For simplicity in this demo, let's assume we can just get some students
                // Note: This matches the user request to replace static friends list
                const snap = await getDocs(collection(db, 'students'));
                const list = snap.docs
                    .map(d => ({ id: d.id, ...d.data() } as UserModel))
                    .filter(u => u.id !== user?.uid) // Exclude self
                    .slice(0, 10); // Limit size
                setFriends(list);
            } catch (e) { console.error(e); }
        };
        if (user) fetchFriends();
    }, [user]);

    // 4. Listen to Active Challenges
    useEffect(() => {
        if (!user) return;
        const q = query(
            collection(db, 'challenges'),
            where('status', '==', 'active'),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snap) => {
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Challenge));
            // Client side filter for participants due to array containment complexity in Firestore sometimes
            const myChallenges = list.filter(c => c.participants.some(p => p.userId === user.uid || p.userId === user.email));
            setActiveChallenges(myChallenges);
        });
        return () => unsubscribe();
    }, [user]);

    // --- LOGIC HELPERS ---

    const totalCompletedToday = subjects.filter(s => s.completedToday).length;

    const auraPoints = useMemo(() => {
        let total = 0;
        subjects.forEach(s => s.modules.forEach((m: any) => m.atoms.forEach((a: any) => total += a.mastery)));
        return total;
    }, [subjects]);

    const filteredAtoms = useMemo(() => {
        if (!selectedSubject) return [];
        let atoms: any[] = [];
        selectedSubject.modules.forEach((mod: any) => {
            mod.atoms.forEach((atom: any) => {
                atoms.push({ ...atom, moduleName: mod.name });
            });
        });
        if (atomFilter) {
            return atoms.filter(a =>
                a.name.toLowerCase().includes(atomFilter.toLowerCase()) ||
                a.moduleName.toLowerCase().includes(atomFilter.toLowerCase())
            );
        }
        return atoms;
    }, [selectedSubject, atomFilter]);

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

            setChallengeName(prev => prev || generateRandomChallengeName());

            try {
                await addDoc(collection(db, 'challenges'), {
                    name: challengeName || generateRandomChallengeName(),
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
        <div className="min-h-screen bg-[#FAF9F6] text-[#4A4A4A] font-sans selection:bg-pink-100 overflow-x-hidden">

            {/* BACKGROUND DECORATION */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-pink-100/50 rounded-full blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[30vw] h-[30vw] bg-purple-100/40 rounded-full blur-[100px]"></div>
            </div>

            <div className="relative max-w-[1400px] mx-auto p-4 md:p-8 lg:p-12">

                {/* HEADER */}
                <header className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="bg-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-sm text-pink-400 border border-pink-50">{ninjaStats?.profile?.class || 7}th Grade Elite</span>
                            <span className="text-pink-300">✦</span>
                            <button
                                onClick={() => setCurrentView('dashboard')}
                                className={`text-[10px] uppercase font-bold tracking-[0.1em] transition-colors ${currentView === 'dashboard' ? 'text-gray-800' : 'text-gray-300'}`}
                            >
                                Main Desk
                            </button>
                            <span className="text-gray-300">/</span>
                            <button
                                onClick={() => { setCurrentView('challenges'); setArenaSubView('create'); }}
                                className={`text-[10px] uppercase font-bold tracking-[0.1em] transition-colors ${currentView === 'challenges' ? 'text-pink-400' : 'text-gray-300'}`}
                            >
                                Challenge Arena
                            </button>
                        </div>
                        <h1 className="text-4xl lg:text-5xl font-serif italic text-gray-800 tracking-tight leading-tight">
                            {currentView === 'dashboard' ? greeting : "Arena Era ⚔️"}
                        </h1>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="hidden lg:flex flex-col items-end">
                            <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Aura Vibe</p>
                            <div className="flex gap-1 mt-1">
                                {[...Array(6)].map((_, i) => (
                                    <div key={i} className={`w-1.5 h-4 rounded-full ${i < totalCompletedToday ? 'bg-pink-300' : 'bg-gray-100'}`}></div>
                                ))}
                            </div>
                        </div>
                        <div className="flex items-center gap-3 bg-white/40 backdrop-blur-xl p-2 pr-4 rounded-full border border-white/60 shadow-sm cursor-pointer" onClick={() => navigate('/profile')}>
                            <div className="w-12 h-12 bg-gradient-to-tr from-pink-200 to-rose-300 rounded-full flex items-center justify-center text-white shadow-inner border-2 border-white text-xl overflow-hidden">
                                {ninjaStats?.profile?.avatar ? <img src={ninjaStats.profile.avatar} alt="avatar" /> : '🧸'}
                            </div>
                            <div>
                                <p className="text-xs font-black text-gray-800 leading-none">{ninjaStats?.username || user?.displayName || 'Student Era'}</p>
                                <div className="flex items-center gap-1 mt-0.5">
                                    <Flame size={12} className="text-orange-400" fill="currentColor" />
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{ninjaStats?.streakCount || 0} Day Streak</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                {/* CONTENT SWITCHER */}
                {currentView === 'quiz' ? (
                    <div className="max-w-2xl mx-auto py-12 animate-in fade-in zoom-in duration-500">
                        <div className="flex justify-between items-center mb-12">
                            <button onClick={() => setCurrentView('dashboard')} className="p-3 bg-white rounded-full text-gray-400 hover:text-pink-500 transition-colors shadow-sm">
                                <X size={20} />
                            </button>
                            <div className="flex gap-2">
                                {[...Array(quizQuestions.length)].map((_, i) => (
                                    <div key={i} className={`w-3 h-3 rounded-full transition-colors ${i === currentQuestionIndex ? 'bg-pink-500 scale-125' : i < currentQuestionIndex ? 'bg-emerald-400' : 'bg-gray-200'}`} />
                                ))}
                            </div>
                            <div className="px-4 py-2 bg-white rounded-full shadow-sm text-xs font-black uppercase tracking-widest text-[#1A1A1A]">
                                Q{currentQuestionIndex + 1}
                            </div>
                        </div>

                        {quizQuestions[currentQuestionIndex] && (
                            <McqEraTemplate
                                question={quizQuestions[currentQuestionIndex]}
                                isSubmitting={false}
                                onAnswer={handleQuizAnswer}
                            />
                        )}
                    </div>
                ) : currentView === 'dashboard' ? (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-in fade-in duration-500">
                        {/* LEFT SECTION (Standard Dashboard) */}
                        <div className="lg:col-span-8 space-y-10">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* Daily Goals Panel */}
                                <div className="md:col-span-2 bg-white/60 backdrop-blur-2xl p-8 rounded-[2.5rem] border border-white/80 shadow-sm relative overflow-hidden">
                                    <div className="flex justify-between items-start mb-6">
                                        <div>
                                            <h3 className="text-xl font-serif italic text-gray-800">Daily Eras</h3>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                                                {totalCompletedToday} of 6 Completed
                                            </p>
                                        </div>
                                        <div className="bg-white p-2 rounded-2xl shadow-sm border border-gray-50 text-pink-400">
                                            <Sparkles size={20} />
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {subjects.map((s) => (
                                            <div key={s.id} className={`px-4 py-2 rounded-full border text-[10px] font-black uppercase tracking-wider transition-all duration-500 ${s.completedToday ? 'bg-white border-pink-100 text-pink-500 shadow-sm scale-105' : 'bg-gray-50/50 border-gray-100 text-gray-300'}`}>
                                                {s.icon} {s.name.split(' ')[0]}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                {/* XP Panel */}
                                <div className="bg-[#1A1A1A] text-white p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden flex flex-col justify-between group">
                                    <div className="relative z-10">
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Knowledge XP</p>
                                        <h4 className="text-4xl font-black mt-2 tracking-tighter">{auraPoints.toLocaleString()}</h4>
                                    </div>
                                    <div className="flex justify-between items-end relative z-10">
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-bold text-white/60">4 Challenges Won</p>
                                            <div className="flex gap-0.5">
                                                {[...Array(3)].map((_, i) => <Star key={i} size={10} fill="#FFD700" className="text-[#FFD700]" />)}
                                            </div>
                                        </div>
                                        <TrendingUp className="text-emerald-400" size={24} />
                                    </div>
                                </div>
                            </div>

                            {/* Subjects Grid */}
                            <div className="space-y-6">
                                <div className="flex items-center justify-between px-2">
                                    <h2 className="text-sm font-black uppercase tracking-[0.3em] text-gray-400">Main Curriculum</h2>
                                    <button onClick={() => { setCurrentView('challenges'); setArenaSubView('create'); }} className="text-[10px] font-bold text-pink-400 uppercase tracking-widest hover:underline decoration-2 underline-offset-4">Try Fun Challenges</button>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                                    {subjects.map((subject) => {
                                        const mastery = Math.round(subject.modules.reduce((a: any, b: any) => a + b.mastery, 0) / subject.modules.length);
                                        return (
                                            <button key={subject.id} onClick={() => { setSelectedSubject(subject); setViewMode('modules'); }} className={`group relative p-8 rounded-[3rem] border-2 text-left transition-all duration-500 overflow-hidden ${selectedSubject?.id === subject.id ? 'bg-white border-pink-200 shadow-xl' : 'bg-white/40 border-white hover:bg-white hover:border-pink-50 shadow-sm'}`}>
                                                <div className="flex justify-between items-start mb-8">
                                                    <div className={`w-14 h-14 rounded-[2rem] bg-gradient-to-br ${subject.color} flex items-center justify-center text-3xl shadow-sm group-hover:rotate-12 transition-transform duration-500`}>{subject.icon}</div>
                                                    {subject.completedToday && <div className="w-6 h-6 bg-pink-50 rounded-full flex items-center justify-center text-pink-400 border border-pink-100 shadow-sm"><CheckCircle2 size={14} fill="currentColor" stroke="white" /></div>}
                                                </div>
                                                <h4 className="font-serif italic text-lg text-gray-800 leading-tight group-hover:text-pink-500 transition-colors">{subject.name}</h4>
                                                <div className="mt-4"><ProgressBar value={mastery} color={subject.accent} /></div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* RIGHT SECTION (Journal View) */}
                        <div className="lg:col-span-4 sticky top-8 h-[700px]">
                            <div className="bg-white/70 backdrop-blur-3xl rounded-[3.5rem] border border-white shadow-xl h-full flex flex-col overflow-hidden">
                                {!selectedSubject ? (
                                    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-8 animate-in fade-in zoom-in duration-700">
                                        <div className="w-32 h-32 bg-pink-50 rounded-full flex items-center justify-center text-6xl shadow-inner border border-white">🎀</div>
                                        <h3 className="text-2xl font-serif italic text-gray-800">Choose an Era</h3>
                                        <p className="text-sm text-gray-400 font-medium">Select a subject to dive into the detailed concept map.</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col h-full animate-in slide-in-from-right-8 duration-500">
                                        <div className={`p-8 bg-gradient-to-br ${selectedSubject.color} relative overflow-hidden`}>
                                            <button onClick={() => setSelectedSubject(null)} className="bg-white/80 p-3 rounded-[1.25rem] text-gray-400 hover:text-pink-400 shadow-sm mb-8"><ChevronRight className="rotate-180" size={20} /></button>
                                            <div className="flex items-center gap-5 mb-8">
                                                <div className="text-5xl">{selectedSubject.icon}</div>
                                                <div>
                                                    <h3 className="text-3xl font-serif italic text-white leading-none tracking-tight">{selectedSubject.name}</h3>
                                                    <p className="text-white/70 text-[10px] font-black uppercase tracking-widest mt-2">{selectedSubject.modules.length} Modules</p>
                                                </div>
                                            </div>
                                            <div className="flex bg-black/5 rounded-2xl p-1.5 border border-white/20">
                                                <button onClick={() => setViewMode('modules')} className={`flex-1 py-3 rounded-[1rem] text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'modules' ? 'bg-white text-gray-800 shadow-sm' : 'text-white/60'}`}>Chapters</button>
                                                <button onClick={() => setViewMode('atoms')} className={`flex-1 py-3 rounded-[1rem] text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'atoms' ? 'bg-white text-gray-800 shadow-sm' : 'text-white/60'}`}>ATOMs</button>
                                            </div>
                                        </div>
                                        <div className="p-8 flex-1 overflow-y-auto">
                                            {viewMode === 'modules' ? (
                                                <div className="space-y-4">
                                                    {selectedSubject.modules.map((mod: any) => (
                                                        <div key={mod.id} className="p-6 bg-gray-50/40 rounded-[2rem] border border-gray-100 hover:bg-white transition-all group">
                                                            <div className="flex justify-between items-center mb-4">
                                                                <h5 className="font-serif italic text-gray-700 text-lg group-hover:text-pink-500">{mod.name}</h5>
                                                                <span className="text-xs font-black text-gray-800">{mod.mastery}%</span>
                                                            </div>
                                                            <ProgressBar value={mod.mastery} color={selectedSubject.accent} height="h-1.5" />
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="space-y-4">
                                                    <div className="relative mb-6">
                                                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                                                        <input type="text" placeholder="Search concepts..." className="w-full bg-gray-50/50 rounded-[1.5rem] py-4 pl-14 pr-6 text-xs font-bold transition-all outline-none" value={atomFilter} onChange={(e) => setAtomFilter(e.target.value)} />
                                                    </div>
                                                    {filteredAtoms.map((atom: any) => (
                                                        <div key={atom.id} className="p-5 bg-white rounded-[2rem] border border-gray-50 shadow-sm hover:border-pink-100 transition-all">
                                                            <p className="text-[9px] text-pink-300 font-black uppercase tracking-widest mb-1">{atom.moduleName}</p>
                                                            <h5 className="font-serif italic text-gray-700 leading-snug">{atom.name}</h5>
                                                            <div className="mt-4"><ProgressBar value={atom.mastery} color={selectedSubject.accent} height="h-1" /></div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <div className="p-8 border-t border-gray-50">
                                            <button onClick={handleStartQuiz} className="w-full py-5 bg-[#1A1A1A] text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-pink-500 transition-all active:scale-95">Start Quiz <Zap size={18} fill="currentColor" /></button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    /* --- CHALLENGE ARENA VIEW --- */
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-in slide-in-from-bottom-8 duration-500">
                        {/* LEFT: ARENA CONTENT */}
                        <div className="lg:col-span-8 space-y-10">

                            {/* ARENA NAVIGATION */}
                            <div className="flex bg-white/40 backdrop-blur-md p-1.5 rounded-[2rem] border border-white/60 w-fit">
                                <button
                                    onClick={() => setArenaSubView('create')}
                                    className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${arenaSubView === 'create' ? 'bg-[#1A1A1A] text-white shadow-lg' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                    <PlusCircle size={14} /> New Quest
                                </button>
                                <button
                                    onClick={() => setArenaSubView('active')}
                                    className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${arenaSubView === 'active' ? 'bg-[#1A1A1A] text-white shadow-lg' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                    <Timer size={14} /> Active {activeChallenges.length > 0 && `(${activeChallenges.length})`}
                                </button>
                                <button
                                    onClick={() => setArenaSubView('history')}
                                    className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${arenaSubView === 'history' ? 'bg-[#1A1A1A] text-white shadow-lg' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                    <History size={14} /> Hall of Slay
                                </button>
                            </div>

                            {/* BUILDER VIEW */}
                            {arenaSubView === 'create' && (
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
                            {arenaSubView === 'active' && (
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
                                            <button onClick={() => handleEnterArena(quest)} className="bg-[#1A1A1A] text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg hover:bg-pink-500 transition-all active:scale-95">
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
                            {arenaSubView === 'create' && (selectedBundles.length > 0 || selectedFriends.length > 0 || guestEmails.length > 0) && (
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
                                                    onClick={() => {
                                                        if (currentView === 'challenges') toggleFriend(f);
                                                    }}
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
                    </div>
                )}

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
                                    onClick={() => { setShowChallengeSent(false); setArenaSubView('active'); }}
                                    className="bg-pink-400 text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-pink-100"
                                >
                                    Track Active Quests
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* FLOATING DOCK */}
                <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-white/60 backdrop-blur-2xl border border-white rounded-full p-2 flex items-center gap-2 shadow-xl z-50">
                    <button onClick={() => setCurrentView('dashboard')} className={`w-12 h-12 flex items-center justify-center rounded-full transition-all ${currentView === 'dashboard' ? 'bg-gray-800 text-white shadow-lg' : 'text-gray-400 hover:text-pink-400'}`}><LayoutDashboard size={20} /></button>
                    <button onClick={() => { setCurrentView('challenges'); setArenaSubView('create'); }} className={`w-12 h-12 flex items-center justify-center rounded-full transition-all ${currentView === 'challenges' ? 'bg-gray-800 text-white shadow-lg' : 'text-gray-400 hover:text-pink-400'}`}><Trophy size={20} /></button>
                    <button className="w-12 h-12 flex items-center justify-center text-gray-400 hover:text-pink-400"><Users size={20} /></button>
                    <button className="w-12 h-12 flex items-center justify-center text-gray-400 hover:text-pink-400"><Packages size={20} /></button>
                </nav>
                <div className="h-24"></div>
            </div>
        </div>
    );
};

// Lucide icon fix
const Packages = ({ size }: { size: number }) => <Package size={size} />;

export default StudyEraDashboard;
