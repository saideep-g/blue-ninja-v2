import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    BookOpen,
    Beaker,
    Table,
    MessageSquare,
    Globe,
    Star,
    CheckCircle2,
    ArrowLeft,
    Trophy,
    Flame,
    Award,
    Sparkles,
    Lock,
    Play,
    User,
    Settings,
    Calendar,
    Zap,
    Medal
} from 'lucide-react';
import { useNinja } from '../../context/NinjaContext';
import { collection, query, where, limit, getDocs } from 'firebase/firestore';
import { db } from '../../services/db/firebase';
import { Question } from '../../types';
import { getStudentTableStats } from '../../features/multiplication-tables/services/tablesFirestore';

// --- Static Metadata (Icons/Colors) ---
const SUBJECT_METADATA: Record<string, { name: string, short: string, icon: React.ReactNode, color: string }> = {
    'math': { name: 'Math', short: '123', icon: <BookOpen />, color: 'from-pink-400 to-rose-500' },
    'science': { name: 'Science', short: 'Lab', icon: <Beaker />, color: 'from-cyan-400 to-blue-500' },
    'tables': { name: 'Tables', short: '7×8', icon: <Table />, color: 'from-emerald-400 to-teal-500' },
    'vocabulary': { name: 'Words', short: 'A-Z', icon: <MessageSquare />, color: 'from-amber-400 to-orange-500' },
    'gk': { name: 'World', short: 'GK', icon: <Globe />, color: 'from-indigo-400 to-purple-500' },
    // Default fallback
    'default': { name: 'General', short: 'Gen', icon: <Star />, color: 'from-gray-400 to-gray-500' }
};

const BADGES = [
    { id: 1, name: '7 Day Streak', icon: '🔥', earned: true, desc: '7 days in a row!' },
    { id: 2, name: 'Math Whiz', icon: '🔢', earned: true, desc: '50 Math quests.' },
    { id: 3, name: 'Early Bird', icon: '☀️', earned: true, desc: 'Done before 8 AM.' },
    { id: 4, name: 'Science Star', icon: '🧪', earned: false, desc: 'Master Science.' },
    { id: 5, name: 'Word Master', icon: '📚', earned: false, desc: '100 new words.' },
    { id: 6, name: 'Global Scout', icon: '🌍', earned: false, desc: 'Perfect World GK.' },
];

export default function MobileQuestDashboard() {
    const { ninjaStats, user, updatePower, logQuestionResult } = useNinja();
    const navigate = useNavigate();

    const [view, setView] = useState('home');
    const [activeSubject, setActiveSubject] = useState<{ id: string, name: string, color: string, icon: React.ReactNode } | null>(null);

    // Real stats from Context
    const stars = ninjaStats.powerPoints || 0;
    const streak = ninjaStats.streakCount || 0;

    // Progress State (Mocked for now, but could be mapped to mastery)
    const [progress, setProgress] = useState<Record<string, number>>({ math: 0, science: 0, tables: 0, vocabulary: 0, gk: 0 });

    // Quiz State
    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentQIndex, setCurrentQIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
    const [loadingQuestions, setLoadingQuestions] = useState(false);

    // Determine Enrolled Subjects
    const enrolledSubjectIds = ninjaStats.enrolledSubjects && ninjaStats.enrolledSubjects.length > 0
        ? ninjaStats.enrolledSubjects
        : ['math', 'science', 'tables', 'vocabulary', 'gk']; // Default if none assigned

    const visibleSubjects = enrolledSubjectIds.map(id => {
        const meta = SUBJECT_METADATA[id] || { ...SUBJECT_METADATA['default'], name: id };
        return { id, ...meta };
    });

    const completedCount = visibleSubjects.filter(s => progress[s.id] === 100).length;
    const totalSubjects = visibleSubjects.length;

    useEffect(() => {
        if (user?.uid) {
            getStudentTableStats(user.uid).then(stats => {
                // "Once they complete 20-25 questions... mark as complete"
                // Use 20 as the target threshold for "Daily Table Work"
                const totalAttempts = stats.reduce((acc, s) => acc + s.totalAttempts, 0);
                const percent = Math.min(100, Math.round((totalAttempts / 20) * 100));
                setProgress(prev => ({ ...prev, tables: percent }));
            });
        }
    }, [user]);

    const startQuest = async (sub: any) => {
        if (sub.id === 'tables') {
            navigate('/tables');
            return;
        }

        setActiveSubject(sub);
        setCurrentQIndex(0);
        setScore(0);
        setView('quiz');
        window.scrollTo(0, 0);
        await fetchQuestions(sub.id);
    };

    const fetchQuestions = async (subjectId: string) => {
        setLoadingQuestions(true);
        try {
            // PROD: Query Firestore for real questions
            // Mapping 'math', 'science' to likely Firestore 'subject' fields or using simple mapping
            // Note: Data in DB might be uppercase like 'Math', 'Science'
            const subjectQueryCased = subjectId.charAt(0).toUpperCase() + subjectId.slice(1);

            const qRef = collection(db, 'questions');
            const q = query(
                qRef,
                where('subject', '==', subjectQueryCased), // Try to match 'Math', 'Science'
                limit(10)
            );

            const snapshot = await getDocs(q);
            const fetchedQuestions = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Question));

            if (fetchedQuestions.length > 0) {
                setQuestions(fetchedQuestions);
            } else {
                // Fallback to dummy if DB empty for this subject
                console.warn(`No questions found for ${subjectQueryCased}, using placeholders.`);
                setQuestions(Array.from({ length: 10 }, (_, i) => ({
                    id: `dummy-${i}`,
                    question_text: `Quest ${i + 1}: Solve the ${subjectId} challenge!`,
                    correct_answer: "Option A",
                    options: [
                        { id: 'a', text: "Option A", isCorrect: true },
                        { id: 'b', text: "Option B", isCorrect: false },
                        { id: 'c', text: "Option C", isCorrect: false },
                        { id: 'd', text: "Option D", isCorrect: false }
                    ],
                    curriculum_version: 'v3',
                    subject: subjectId,
                    topic: 'General',
                    chapter: 'General',
                    difficulty: 'easy',
                    type: 'MCQ'
                })));
            }
        } catch (err) {
            console.error("Error fetching questions:", err);
        } finally {
            setLoadingQuestions(false);
        }
    };

    const handleAnswer = (optText: string) => {
        const currentQ = questions[currentQIndex];
        // Find if correct based on Option Object or Text matching (Legacy vs New)
        const matchesCorrect = optText === currentQ.correct_answer;
        // Or check if option object has isCorrect (Standard V3)
        // For this UI, we just receive the text clicked.

        // Simple validation (assuming backend correct_answer matches text)
        const isCorrect = matchesCorrect;

        setFeedback(isCorrect ? 'correct' : 'wrong');
        if (isCorrect) setScore(s => s + 1);

        // Logging
        logQuestionResult({
            questionId: currentQ.id,
            studentAnswer: optText,
            isCorrect,
            timestamp: new Date()
        });

        setTimeout(() => {
            setFeedback(null);
            if (currentQIndex < questions.length - 1) {
                setCurrentQIndex(q => q + 1);
            } else {
                // Finish
                if (activeSubject) {
                    setProgress(prev => ({ ...prev, [activeSubject.id]: 100 }));
                }
                updatePower(score * 10);
                setView('results');
            }
        }, 600);
    };

    return (
        <div className="min-h-screen w-full bg-[#F9F6FF] font-sans text-slate-800 select-none pb-28">

            {/* --- SHARED HEADER --- */}
            {['home', 'awards', 'profile'].includes(view) && (
                <header className="px-6 pt-8 pb-4 flex justify-between items-center animate-in fade-in duration-500">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-400 to-pink-400 border-2 border-white shadow-lg flex-shrink-0 flex items-center justify-center overflow-hidden">
                            <img src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${user?.displayName || 'Mimi'}`} alt="Avatar" className="w-full h-full scale-110" />
                        </div>
                        <div>
                            <h1 className="text-lg font-black text-purple-900 leading-none">{user?.displayName?.split(' ')[0] || "Explorer"}'s Quest</h1>
                            <p className="text-[10px] font-bold text-purple-400 uppercase tracking-widest mt-1">Explorer Rank: Gold</p>
                        </div>
                    </div>
                    <div className="bg-white px-3 py-1.5 rounded-2xl flex items-center gap-1.5 shadow-sm border border-purple-100">
                        <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                        <span className="text-sm font-black text-slate-700">{stars}</span>
                    </div>
                </header>
            )}

            {/* --- HOME VIEW --- */}
            {view === 'home' && (
                <div className="px-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="mb-8">
                        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-[2.5rem] p-6 shadow-xl shadow-purple-200 text-white flex flex-col sm:flex-row items-center gap-6">
                            <div className="relative w-24 h-24 flex-shrink-0">
                                <svg className="w-full h-full -rotate-90">
                                    <circle cx="48" cy="48" r="42" fill="transparent" stroke="rgba(255,255,255,0.2)" strokeWidth="8" />
                                    <circle
                                        cx="48" cy="48" r="42" fill="transparent" stroke="#FACC15" strokeWidth="8"
                                        strokeDasharray={263.8}
                                        strokeDashoffset={263.8 - (263.8 * completedCount / totalSubjects)}
                                        strokeLinecap="round"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center text-2xl font-black">{completedCount}/{totalSubjects}</div>
                            </div>
                            <div className="text-center sm:text-left">
                                <h2 className="font-black text-xl mb-1">Daily Journey</h2>
                                <p className="text-xs text-purple-100 font-medium opacity-90 leading-relaxed">
                                    {completedCount === totalSubjects ? "Incredible! You've mastered today's goals!" : "Finish all subjects to unlock your Daily Treasure Chest."}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {visibleSubjects.map((sub) => {
                            const isDone = progress[sub.id] === 100;
                            return (
                                <button
                                    key={sub.id}
                                    onClick={() => startQuest(sub)}
                                    className={`relative p-6 rounded-[2rem] text-left transition-all active:scale-95 border-b-8 h-44 flex flex-col justify-end
                    ${isDone
                                            ? `bg-gradient-to-br ${sub.color} text-white border-black/10`
                                            : 'bg-white text-slate-700 border-slate-100 shadow-xl shadow-purple-50/50'
                                        }`}
                                >
                                    <div className={`absolute top-6 left-6 w-12 h-12 rounded-2xl flex items-center justify-center shadow-md
                    ${isDone ? 'bg-white/20' : 'bg-slate-50 text-slate-400'}`}>
                                        {React.cloneElement(sub.icon as React.ReactElement<any>, { size: 24 })}
                                    </div>
                                    <div>
                                        <h3 className={`font-black text-lg ${isDone ? 'text-white' : 'text-slate-800'}`}>{sub.name}</h3>
                                        <p className={`text-[11px] font-bold uppercase tracking-widest ${isDone ? 'text-white/80' : 'text-slate-400'}`}>
                                            {isDone ? 'Quest Claimed' : `${sub.short} Quest Available`}
                                        </p>
                                    </div>
                                    <div className="absolute top-6 right-6">
                                        {isDone ? <CheckCircle2 size={24} className="text-white" /> : <Play size={22} className="text-purple-200" fill="currentColor" />}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* --- AWARDS VIEW --- */}
            {view === 'awards' && (
                <div className="px-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="mb-6">
                        <h2 className="text-3xl font-black text-purple-900 leading-tight">Trophy Room</h2>
                        <p className="text-sm font-medium text-slate-500">Your collection of explorer achievements.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-8">
                        {BADGES.map((badge) => (
                            <div
                                key={badge.id}
                                className={`p-6 rounded-[2.5rem] flex flex-col items-center text-center border-b-4 transition-all
                  ${badge.earned ? 'bg-white border-amber-200 shadow-xl shadow-amber-50' : 'bg-slate-100 border-slate-200 grayscale opacity-60'}
                `}
                            >
                                <div className="text-5xl mb-3">{badge.icon}</div>
                                <h3 className="font-black text-sm text-slate-800 leading-tight mb-1">{badge.name}</h3>
                                <p className="text-[10px] font-bold text-slate-400 leading-tight">{badge.desc}</p>
                                {badge.earned && <div className="mt-3 bg-amber-400 text-white text-[8px] px-2.5 py-1 rounded-full font-black uppercase tracking-wider">Unlocked</div>}
                            </div>
                        ))}
                    </div>

                    <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[2.5rem] p-8 text-white text-center shadow-xl shadow-purple-200 overflow-hidden relative">
                        <Sparkles className="absolute top-0 right-0 w-24 h-24 text-white/10 -translate-y-6 translate-x-6" />
                        <Lock size={32} className="mx-auto mb-4 opacity-50" />
                        <h3 className="font-black text-xl mb-2">Mystery Reward</h3>
                        <p className="text-sm text-indigo-100 opacity-80 mb-6">Complete 10 more quests to unlock this chest!</p>
                        <div className="w-full bg-white/20 h-3 rounded-full overflow-hidden">
                            <div className="h-full bg-yellow-400 w-2/3 shadow-[0_0_10px_rgba(250,204,21,0.5)]" />
                        </div>
                    </div>
                </div>
            )}

            {/* --- PROFILE VIEW --- */}
            {view === 'profile' && (
                <div className="px-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex flex-col items-center mb-10 pt-4">
                        <div className="relative">
                            <div className="w-28 h-28 rounded-[2.5rem] bg-gradient-to-tr from-purple-400 to-pink-500 p-1 shadow-2xl">
                                <div className="w-full h-full bg-white rounded-[2.3rem] overflow-hidden">
                                    <img src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${user?.displayName || 'Mimi'}`} alt="Avatar" className="w-full h-full scale-125 translate-y-3" />
                                </div>
                            </div>
                            <button className="absolute -bottom-2 -right-2 bg-white p-2.5 rounded-2xl shadow-lg border border-purple-100">
                                <Settings size={20} className="text-purple-600" />
                            </button>
                        </div>
                        <h2 className="mt-6 text-3xl font-black text-purple-900 leading-none">{user?.displayName || "Explorer"}</h2>
                        <p className="text-xs font-bold text-purple-400 uppercase tracking-widest mt-3">Adventurer since 2024</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-8">
                        {[
                            { label: 'Total Stars', val: stars, icon: <Star className="text-amber-500" fill="currentColor" />, bg: 'bg-amber-50' },
                            { label: 'Day Streak', val: streak, icon: <Flame className="text-orange-500" fill="currentColor" />, bg: 'bg-orange-50' },
                            { label: 'Courses Done', val: '12', icon: <Medal className="text-blue-500" />, bg: 'bg-blue-50' },
                            { label: 'Energy Points', val: '450', icon: <Zap className="text-purple-500" fill="currentColor" />, bg: 'bg-purple-50' },
                        ].map((stat, i) => (
                            <div key={i} className={`${stat.bg} rounded-[2rem] p-6 flex flex-col items-center justify-center text-center shadow-sm border border-black/5`}>
                                <div className="mb-3 scale-110">{stat.icon}</div>
                                <span className="text-2xl font-black text-slate-700 leading-none">{stat.val}</span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase mt-2">{stat.label}</span>
                            </div>
                        ))}
                    </div>

                    <div className="bg-white rounded-[2.5rem] p-7 shadow-xl shadow-purple-50 mb-8 border border-purple-50/50">
                        <h3 className="font-black text-xl text-purple-900 mb-6 flex items-center gap-3">
                            <Calendar size={22} className="text-purple-400" />
                            Learning Activity
                        </h3>
                        <div className="space-y-6">
                            {[
                                { day: 'Monday', task: 'Math & Words Mastery', score: '+150' },
                                { day: 'Tuesday', task: 'Science Exploration', score: '+80' },
                                { day: 'Wednesday', task: 'Tables Challenge', score: '+120' },
                            ].map((item, i) => (
                                <div key={i} className="flex justify-between items-center border-l-4 border-purple-200 pl-4 py-1">
                                    <div>
                                        <p className="text-sm font-black text-slate-800 leading-none mb-1">{item.day}</p>
                                        <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">{item.task}</p>
                                    </div>
                                    <span className="text-base font-black text-emerald-500">{item.score}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* --- QUIZ OVERLAY (Stays focused) --- */}
            {view === 'quiz' && activeSubject && (
                <div className="fixed inset-0 bg-white z-[60] flex flex-col animate-in slide-in-from-bottom duration-500">
                    <div className="p-6 flex items-center gap-4 flex-shrink-0">
                        <button onClick={() => setView('home')} className="p-2 -ml-2"><ArrowLeft size={28} className="text-slate-400" /></button>
                        <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full bg-gradient-to-r ${activeSubject.color} transition-all duration-300`} style={{ width: `${(currentQIndex + 1) * 10}%` }} />
                        </div>
                        <span className="text-xs font-black text-slate-400">{currentQIndex + 1}/10</span>
                    </div>

                    <div className="flex-1 flex flex-col p-8 items-center justify-center text-center overflow-y-auto pb-12">

                        {loadingQuestions ? (
                            <div className="animate-pulse">Loading Quest...</div>
                        ) : questions.length > 0 ? (
                            <>
                                <div className={`w-20 h-20 rounded-[2rem] bg-gradient-to-br ${activeSubject.color} text-white flex items-center justify-center mb-10 shadow-2xl flex-shrink-0`}>
                                    {activeSubject.icon}
                                </div>
                                <h2 className="text-2xl font-black mb-12 leading-tight text-slate-800 px-2 max-w-sm">
                                    {questions[currentQIndex]?.question_text}
                                </h2>

                                <div className="w-full grid gap-4 max-w-xs">
                                    {questions[currentQIndex]?.options.map((opt: any, i: number) => (
                                        <button
                                            key={i}
                                            disabled={!!feedback}
                                            onClick={() => handleAnswer(opt.text)}
                                            className={`w-full p-5 rounded-[1.5rem] text-lg font-bold border-b-4 transition-all active:translate-y-1 active:border-b-0
                        ${!feedback ? 'bg-white border-slate-100 shadow-md text-slate-700' :
                                                    opt.text === questions[currentQIndex].correct_answer ? 'bg-emerald-500 border-emerald-700 text-white' : 'bg-slate-50 border-slate-100 opacity-50'}
                    `}
                                        >
                                            {opt.text}
                                        </button>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div>No questions available.</div>
                        )}

                    </div>
                </div>
            )}

            {/* --- RESULTS OVERLAY --- */}
            {view === 'results' && (
                <div className="fixed inset-0 bg-purple-600 z-[70] flex flex-col items-center justify-center p-8 text-white text-center animate-in zoom-in-95 duration-500">
                    <div className="relative mb-8">
                        <Sparkles className="w-28 h-28 text-yellow-300 animate-pulse" />
                        <Trophy size={40} className="absolute inset-0 m-auto text-white" />
                    </div>
                    <h2 className="text-4xl font-black mb-3">Quest Mastery!</h2>
                    <p className="text-purple-100 text-lg mb-10 leading-snug max-w-xs mx-auto">You've unlocked a piece of today's treasure map!</p>

                    <div className="bg-white/10 backdrop-blur-2xl rounded-[3rem] p-10 w-full max-w-sm mb-12 border border-white/20 shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <span className="font-bold text-purple-100 text-lg">Subject Complete</span>
                            <span className="text-2xl font-black">10/10</span>
                        </div>
                        <div className="h-px bg-white/20 mb-6" />
                        <div className="flex justify-between items-center">
                            <span className="font-bold text-yellow-300 flex items-center gap-3 text-lg">
                                <Star size={24} fill="currentColor" /> Stars
                            </span>
                            <span className="text-4xl font-black text-yellow-300">+{score * 10}</span>
                        </div>
                    </div>

                    <button
                        onClick={() => { setView('home'); window.scrollTo(0, 0); }}
                        className="w-full max-w-xs bg-white text-purple-700 py-6 rounded-[2.5rem] text-xl font-black shadow-2xl active:scale-95 transition-all"
                    >
                        Collect & Continue
                    </button>
                </div>
            )}

            {/* --- PERSISTENT BOTTOM NAV --- */}
            {['home', 'awards', 'profile'].includes(view) && (
                <nav className="fixed bottom-0 left-0 right-0 h-24 bg-white/80 backdrop-blur-2xl border-t border-purple-50 px-10 flex items-center justify-around pb-6 z-50">
                    <button onClick={() => { setView('home'); window.scrollTo(0, 0); }} className={`flex flex-col items-center gap-1.5 transition-all ${view === 'home' ? 'text-purple-600 scale-110' : 'text-slate-300'}`}>
                        <div className={`p-2.5 rounded-2xl transition-colors ${view === 'home' ? 'bg-purple-100' : ''}`}>
                            <Play size={24} fill={view === 'home' ? "currentColor" : "none"} />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest">Play</span>
                    </button>

                    <button onClick={() => { setView('awards'); window.scrollTo(0, 0); }} className={`flex flex-col items-center gap-1.5 transition-all ${view === 'awards' ? 'text-amber-500 scale-110' : 'text-slate-300'}`}>
                        <div className={`p-2.5 rounded-2xl transition-colors ${view === 'awards' ? 'bg-amber-100' : ''}`}>
                            <Trophy size={24} fill={view === 'awards' ? "currentColor" : "none"} />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest">Awards</span>
                    </button>

                    <button onClick={() => { setView('profile'); window.scrollTo(0, 0); }} className={`flex flex-col items-center gap-1.5 transition-all ${view === 'profile' ? 'text-indigo-600 scale-110' : 'text-slate-300'}`}>
                        <div className={`p-2.5 rounded-2xl transition-colors ${view === 'profile' ? 'bg-indigo-100' : ''}`}>
                            <User size={24} fill={view === 'profile' ? "currentColor" : "none"} />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest">Profile</span>
                    </button>
                </nav>
            )}

        </div>
    );
}
