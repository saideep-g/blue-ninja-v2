import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trophy, Play, User, Sparkles } from 'lucide-react'; // Basic icons
import { useNinja } from '../../context/NinjaContext';
import { collection, query, where, limit, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { db } from '../../services/db/firebase';
import { Question } from '../../types';
import { getStudentTableStats } from '../../features/multiplication-tables/services/tablesFirestore';
import { CHAPTERS } from '../../constants/chapters';

// LaTeX Support
import 'katex/dist/katex.min.css';
import { InlineMath } from 'react-katex';

// New Components
import { StudentHeader } from './dashboard/StudentHeader';
import { HomeView } from './dashboard/HomeView';
import { AwardsView } from './dashboard/AwardsView';
import { ProfileView } from './dashboard/ProfileView';

// ... (existing code)

// Helper for LaTeX
const renderLatexContent = (text: string) => {
    if (!text) return '';
    // Split by $...$ to find math segments
    const parts = text.split(/\$(.*?)\$/);
    return parts.map((part, index) => {
        // Odd indices match the captured group (the math content)
        return index % 2 === 1 ?
            <InlineMath key={index} math={part} /> :
            <span key={index}>{part}</span>;
    });
};

// ... (inside Render for Quiz)
// <h2 ...>{renderLatexContent(questions[currentQIndex]?.question_text)}</h2>
// ...
// {questions[currentQIndex]?.options.map(...
//    ... {renderLatexContent(opt.text)} ...

export default function MobileQuestDashboard() {
    const { ninjaStats, user, updatePower, logQuestionResult } = useNinja();
    const navigate = useNavigate();

    const [view, setView] = useState('home'); // home, awards, profile, quiz, results

    // --- STATE ---
    // Persistent stats
    const [dailyProgress, setDailyProgress] = useState<Record<string, number>>({ Math: 0, Science: 0, Words: 0, World: 0 });
    const [chapterProgress, setChapterProgress] = useState<Record<string, any>>({
        // Default unlocked starter chapters
        "Adding up to 20": { correct: 0, total: 0, unlocked: true, mastered: false },
        "Living vs Non-Living": { correct: 0, total: 0, unlocked: true, mastered: false },
        "Common Nouns": { correct: 0, total: 0, unlocked: true, mastered: false },
        "Continents": { correct: 0, total: 0, unlocked: true, mastered: false },
    });

    // Quiz Session
    const [activePathSubject, setActivePathSubject] = useState<string>('Math');
    const [activeChapter, setActiveChapter] = useState<any | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentQIndex, setCurrentQIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
    const [loadingQuestions, setLoadingQuestions] = useState(false);

    // --- EFFECTS ---

    // Reset selection on question change
    useEffect(() => {
        setSelectedAnswer(null);
        setFeedback(null);
    }, [currentQIndex]);

    useEffect(() => {
        if (user?.uid) {
            const fetchProgress = async () => {
                try {
                    const docRef = doc(db, 'students', user.uid);
                    const snap = await getDoc(docRef);
                    if (snap.exists()) {
                        const data = snap.data();
                        if (data.mastery) setChapterProgress(prev => ({ ...prev, ...data.mastery })); // Merge
                        if (data.daily) setDailyProgress(prev => ({ ...prev, ...data.daily }));
                    }
                } catch (e) {
                    console.error("Error loading progress", e);
                }
            };
            fetchProgress();

            getStudentTableStats(user.uid).then(stats => {
                // Table stats sync could go here
            });
        }
    }, [user]);

    // --- ACTIONS ---

    const handleProfileUpdate = async (name: string, avatarSeed: string) => {
        if (!user) return;
        try {
            const avatarUrl = avatarSeed
                ? `https://api.dicebear.com/7.x/adventurer/svg?seed=${avatarSeed}`
                : user.photoURL;

            await updateProfile(user, { displayName: name, photoURL: avatarUrl });
            const studentRef = doc(db, 'students', user.uid);
            await updateDoc(studentRef, {
                username: name,
                'profile.name': name,
                'profile.avatar': avatarUrl
            });
            // Force reload or state update if needed, but Firebase auth changes usually propagate
        } catch (e) {
            console.error("Profile update failed", e);
        }
    };

    const handlePlaySubject = async (subject: string) => {
        // Auto-find next chapter
        const subjChapters = CHAPTERS[subject as keyof typeof CHAPTERS] || [];
        let target = subjChapters[0];
        // Search for first unlocked & !mastered
        for (const ch of subjChapters) {
            const p = chapterProgress[ch.n];
            if (!p) { target = ch; break; } // Not even started -> it's the one
            if (p.unlocked && !p.mastered) {
                target = ch;
                break;
            }
        }

        // Start Quiz
        setActivePathSubject(subject);
        setActiveChapter(target);
        setCurrentQIndex(0);
        setScore(0);
        setView('quiz');
        window.scrollTo(0, 0);
        await fetchQuestions(subject, target.n);
    };

    const handlePlaySpecificChapter = async (subject: string, chapter: any) => {
        setActivePathSubject(subject);
        setActiveChapter(chapter);
        setCurrentQIndex(0);
        setScore(0);
        setView('quiz');
        window.scrollTo(0, 0);
        await fetchQuestions(subject, chapter.n);
    };

    // Cache loaded questions to prevent repeated reads
    const questionCache = React.useRef<Record<string, Question[]>>({});

    const fetchQuestions = async (subject: string, topic?: string) => {
        setLoadingQuestions(true);
        try {
            // 1. Check Cache
            let subjectQuestions = questionCache.current[subject];

            // 2. Fetch if not in cache (Single Read per Subject)
            if (!subjectQuestions) {
                console.log(`Fetching bundle for ${subject}...`);

                // Find Bundle Metadata
                const bundlesRef = collection(db, 'question_bundles');
                const qBundle = query(
                    bundlesRef,
                    where('subject', '==', subject.toLowerCase()),
                    where('grade', '==', 2),
                    limit(1)
                );
                const bundleSnap = await getDocs(qBundle);

                if (!bundleSnap.empty) {
                    const bundleId = bundleSnap.docs[0].id;

                    // Fetch Full Content from Parallel Collection
                    const dataRef = doc(db, 'question_bundle_data', bundleId);
                    const dataSnap = await getDoc(dataRef);

                    if (dataSnap.exists() && dataSnap.data().questions) {
                        // Map internal SimplifiedQuestion to app Question type
                        subjectQuestions = Object.values(dataSnap.data().questions).map((sq: any) => ({
                            id: sq.id,
                            question_text: sq.question,
                            options: sq.options.map((o: string, i: number) => ({
                                id: String(i + 1),
                                text: o,
                                isCorrect: o === sq.answer
                            })).sort(() => 0.5 - Math.random()),
                            correct_answer: sq.answer,
                            type: 'MCQ',
                            subject: subject,
                            difficulty: (sq.difficulty as 'easy' | 'medium' | 'hard') || 'medium',
                            explanation: sq.explanation,
                            // Store simplified raw data for matching
                            chapter_id: sq.chapter_id,
                            chapter: sq.chapter // Legacy field support
                        } as unknown as Question));
                    }
                }

                // Update Cache (even if empty to prevent retries)
                questionCache.current[subject] = subjectQuestions || [];
            }

            // 3. Filter for Specific Chapter
            // Heuristic: Map Chapter Index to ID (m1, m2... s1, s2...)
            const subjChapters = CHAPTERS[subject as keyof typeof CHAPTERS] || [];
            const chapterIndex = subjChapters.findIndex(c => c.n === topic);

            // Construct probable IDs based on Subject first letter + Index+1
            // Math -> m1, Science -> s1, Words -> w1, World -> g1/w1? 
            // Let's use first char lowercased.
            // Construct probable IDs
            // Math -> m, Science -> s, Words -> w, World -> g
            let shortCode = subject.charAt(0).toLowerCase();
            if (subject === 'World') shortCode = 'g';

            const targetId = `${shortCode}${chapterIndex + 1}`;

            const relevantQuestions = (questionCache.current[subject] || []).filter((q: any) => {
                // Strong Match: ID
                if (q.chapter_id === targetId) return true;
                // Fallback Match: Topic Name
                if (q.chapter === topic) return true;
                // If chapter_id is missing in data, maybe use 'General' fallback for unassigned
                return false;
            });

            if (relevantQuestions.length > 0) {
                // Shuffle and pick 10
                const shuffled = relevantQuestions.sort(() => 0.5 - Math.random()).slice(0, 10);
                setQuestions(shuffled);
            } else {
                // Fallback to Dummy if no real questions found for this specific chapter
                console.warn(`No questions found for ${subject} chapter ${topic} (Target ID: ${targetId}). Using placeholders.`);
                const fetched = Array.from({ length: 10 }, (_, i) => ({
                    id: `gen-${i}`,
                    question_text: `Challenge: ${topic || subject} Question ${i + 1}`,
                    correct_answer: "Correct Option",
                    options: [
                        { id: '1', text: "Correct Option", isCorrect: true },
                        { id: '2', text: "Wrong Answer", isCorrect: false },
                        { id: '3', text: "Not this one", isCorrect: false },
                        { id: '4', text: "Try again", isCorrect: false }
                    ],
                    type: 'MCQ',
                    subject: subject,
                    difficulty: 'easy' as const,
                    curriculum_version: 'v3',
                    topic: topic || 'General',
                    chapter: 'General'
                }));
                setQuestions(fetched as Question[]);
            }

        } catch (e) {
            console.error("Fetch error", e);
            setQuestions([]);
        } finally {
            setLoadingQuestions(false);
        }
    };

    // Sound Feedback Helper using Web Audio API
    const playFeedbackSound = (type: 'correct' | 'wrong') => {
        try {
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            if (!AudioContext) return;

            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.connect(gain);
            gain.connect(ctx.destination);

            if (type === 'correct') {
                // Pleasant "Ding"
                osc.type = 'sine';
                osc.frequency.setValueAtTime(600, ctx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
                gain.gain.setValueAtTime(0.3, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
                osc.start();
                osc.stop(ctx.currentTime + 0.5);
            } else {
                // Gentle "Oops"
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(200, ctx.currentTime);
                osc.frequency.linearRampToValueAtTime(100, ctx.currentTime + 0.2);
                gain.gain.setValueAtTime(0.3, ctx.currentTime);
                gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.2);
                osc.start();
                osc.stop(ctx.currentTime + 0.2);
            }
        } catch (e) {
            console.error("Audio playback failed", e);
        }
    };

    const handleNext = () => {
        setFeedback(null);
        setSelectedAnswer(null);
        if (currentQIndex < questions.length - 1) {
            setCurrentQIndex(q => q + 1);
        } else {
            finishQuiz(score); // Score already updated in handleAnswer if correct
        }
    };

    const handleAnswer = (answerId: string, isCorrect: boolean) => {
        if (selectedAnswer) return; // Prevent double taps
        setSelectedAnswer(answerId);
        const currentQ = questions[currentQIndex];

        playFeedbackSound(isCorrect ? 'correct' : 'wrong');
        setFeedback(isCorrect ? 'correct' : 'wrong');

        if (isCorrect) {
            setScore(s => s + 1);
        }

        const ansText = currentQ.options.find(o => o.id === answerId)?.text || answerId;
        logQuestionResult({
            questionId: currentQ.id as string,
            studentAnswer: ansText,
            isCorrect,
            timestamp: new Date()
        });

        // Auto-advance only if correct, otherwise wait for user to read explanation
        if (isCorrect) {
            setTimeout(() => {
                handleNext();
            }, 1500);
        }
    };

    // ... finishQuiz remains same ...

    // --- RENDER ---
    // ...

    {/* Options Grid */ }


    const finishQuiz = (finalScore: number) => {
        const sessionQuestions = questions.length;
        const currentDaily = dailyProgress[activePathSubject] || 0;
        const newDailyTotal = currentDaily + sessionQuestions;

        setDailyProgress(prev => ({ ...prev, [activePathSubject]: newDailyTotal }));

        if (activeChapter) {
            setChapterProgress(prev => {
                const current = prev[activeChapter.n] || { correct: 0, total: 0, unlocked: true, questionsAnswered: 0 };
                const newCorrect = current.correct + (finalScore * 20);
                const newTotalPoints = current.total + (sessionQuestions * 20);
                const newQuestionsAnswered = (current.questionsAnswered || 0) + sessionQuestions;
                const accuracy = newCorrect / (newTotalPoints || 1);

                const reqQuestions = activeChapter.req || 50;
                const isMastered = (newQuestionsAnswered >= reqQuestions) && (accuracy >= 0.8);

                if (isMastered) {
                    const subjChapters = CHAPTERS[activePathSubject as keyof typeof CHAPTERS];
                    const idx = subjChapters.findIndex(c => c.n === activeChapter.n);
                    if (idx !== -1 && idx < subjChapters.length - 1) {
                        const nextChapter = subjChapters[idx + 1];
                        if (prev[nextChapter.n]) {
                            prev[nextChapter.n] = { ...prev[nextChapter.n], unlocked: true };
                        } else {
                            prev[nextChapter.n] = { correct: 0, total: 0, unlocked: true, mastered: false, questionsAnswered: 0 };
                        }
                    }
                }

                const newState = {
                    ...prev,
                    [activeChapter.n]: {
                        correct: newCorrect,
                        total: newTotalPoints,
                        questionsAnswered: newQuestionsAnswered,
                        unlocked: true,
                        mastered: isMastered
                    }
                };

                if (user?.uid) {
                    const studentRef = doc(db, 'students', user.uid);
                    // Note: Flattening nested updates for Firestore dot notation requires care or just merging 'mastery' field map? 
                    // To properly update a MAP field key without overwriting the whole map, we need 'mastery.chapterName'.
                    // newState[activeChapter.n] ... this assumes 'mastery' is a flat map of ChapterNames.
                    // Ideally structure is students/{id}/progress/{chapterId} but here we store in student doc.
                    updateDoc(studentRef, {
                        [`mastery.${activeChapter.n}`]: newState[activeChapter.n],
                        [`daily.${activePathSubject}`]: newDailyTotal,
                        lastActive: new Date()
                    }).catch(e => console.error(e));
                }

                return newState;
            });
        }

        updatePower(finalScore * 20);
        setView('results');
    };

    // --- RENDER ---
    return (
        <div className="min-h-screen w-full bg-[#F9F6FF] font-sans text-slate-800 select-none pb-28">

            {/* Header */}
            {view !== 'quiz' && view !== 'results' && (
                <StudentHeader user={user} stars={ninjaStats.powerPoints || 0} />
            )}

            {/* Views */}
            {view === 'home' && (
                <HomeView
                    dailyProgress={dailyProgress}
                    chapterProgress={chapterProgress}
                    onPlaySubject={handlePlaySubject}
                    onPlayTables={() => navigate('/tables')}
                />
            )}

            {view === 'awards' && (
                <AwardsView
                    masteryProgress={chapterProgress}
                    onPlayChapter={handlePlaySpecificChapter}
                />
            )}

            {view === 'profile' && (
                <ProfileView
                    user={user}
                    stats={{ stars: ninjaStats.powerPoints || 0, streak: ninjaStats.streakCount || 0, powerPoints: 0 }}
                    onUpdateProfile={handleProfileUpdate}
                />
            )}

            {/* Quiz & Results Overlays */}
            {/* --- QUIZ view --- */}
            {view === 'quiz' && (
                <div className="flex flex-col h-full relative z-10">
                    <div className="flex-1 flex flex-col justify-center items-center px-6 max-w-xl mx-auto w-full">
                        {/* Question Card */}
                        <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-8 shadow-xl w-full border-4 border-indigo-100 min-h-[300px] flex flex-col justify-center items-center text-center relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400" />

                            {/* Decorative Icon */}
                            <div className="mb-6 bg-indigo-50 p-4 rounded-full">
                                <Sparkles className="text-indigo-400 w-8 h-8" />
                            </div>

                            <h2 className="text-2xl md:text-3xl font-black text-indigo-900 leading-snug mb-2">
                                {renderLatexContent(questions[currentQIndex]?.question_text)}
                            </h2>
                        </div>

                        {/* Options Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full mt-8">
                            {questions[currentQIndex]?.options.map((opt) => {
                                let btnClass = "bg-white text-indigo-900 border-white/50 hover:bg-indigo-50";

                                if (feedback) {
                                    if (opt.isCorrect) {
                                        // Always highlight correct answer
                                        btnClass = "bg-emerald-500 text-white border-emerald-400 ring-4 ring-emerald-200 scale-105";
                                    } else if (selectedAnswer === opt.id) {
                                        // Highlight wrong selection
                                        btnClass = "bg-rose-500 text-white border-rose-400 ring-4 ring-rose-200 opacity-100";
                                    } else {
                                        // Dim others
                                        btnClass = "bg-white/50 text-indigo-900/40 border-transparent opacity-50 cursor-not-allowed";
                                    }
                                }

                                return (
                                    <button
                                        key={opt.id}
                                        onClick={() => handleAnswer(opt.id, opt.isCorrect)}
                                        disabled={!!selectedAnswer}
                                        className={`
                                            p-6 rounded-2xl font-black text-xl shadow-lg border-b-4 transition-all
                                            transform active:scale-95 disabled:active:scale-100 disabled:cursor-not-allowed
                                            ${btnClass}
                                        `}
                                    >
                                        {renderLatexContent(opt.text)}
                                        {feedback && opt.isCorrect && <span className="ml-2 absolute right-4">✅</span>}
                                        {feedback && selectedAnswer === opt.id && !opt.isCorrect && <span className="ml-2 absolute right-4">❌</span>}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Explanation / Feedback Overlay */}
                        {feedback === 'wrong' && (
                            <div className="mt-8 bg-white/90 backdrop-blur-md rounded-3xl p-6 border-l-8 border-rose-500 shadow-2xl animate-in slide-in-from-bottom-4 w-full text-left relative">
                                <h3 className="text-rose-600 font-extrabold text-lg uppercase tracking-wider mb-2">Not Quite...</h3>
                                <p className="text-slate-700 font-medium text-lg leading-relaxed mb-6">
                                    {renderLatexContent(questions[currentQIndex]?.explanation || "The correct answer is highlighted in green.")}
                                </p>
                                <button
                                    onClick={handleNext}
                                    className="w-full py-4 bg-rose-500 text-white rounded-2xl font-black text-xl shadow-lg shadow-rose-200 active:scale-95 transition-all flex items-center justify-center gap-2"
                                >
                                    Got it! Next <ArrowLeft className="rotate-180" size={24} />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Back Button */}
                    <div className="p-4 flex justify-center pb-8">
                        <button onClick={() => setView('home')} className="flex items-center gap-2 text-white/80 font-bold hover:text-white hover:bg-white/10 px-6 py-3 rounded-full transition-all">
                            <ArrowLeft size={18} /> Quit Mission
                        </button>
                    </div>
                </div>
            )}

            {view === 'results' && (
                <div className="fixed inset-0 bg-purple-600 z-[70] flex flex-col items-center justify-center p-8 text-white text-center animate-in zoom-in-95 duration-500">
                    <div className="relative mb-8">
                        <Sparkles className="w-28 h-28 text-yellow-300 animate-pulse" />
                        <Trophy size={40} className="absolute inset-0 m-auto text-white" />
                    </div>
                    <h2 className="text-4xl font-black mb-3">Excellent Work!</h2>
                    <p className="text-purple-100 text-lg mb-10 leading-snug max-w-xs mx-auto">
                        You earned {score * 20} Power Points!
                    </p>

                    <button
                        onClick={() => { setView('home'); window.scrollTo(0, 0); }}
                        className="w-full max-w-xs bg-white text-purple-700 py-6 rounded-[2.5rem] text-xl font-black shadow-2xl active:scale-95 transition-all"
                    >
                        Collect & Continue
                    </button>
                </div>
            )}

            {/* Bottom Nav */}
            {
                ['home', 'awards', 'profile'].includes(view) && (
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
                            <span className="text-[10px] font-black uppercase tracking-widest">Map</span>
                        </button>

                        <button onClick={() => { setView('profile'); window.scrollTo(0, 0); }} className={`flex flex-col items-center gap-1.5 transition-all ${view === 'profile' ? 'text-indigo-600 scale-110' : 'text-slate-300'}`}>
                            <div className={`p-2.5 rounded-2xl transition-colors ${view === 'profile' ? 'bg-indigo-100' : ''}`}>
                                <User size={24} fill={view === 'profile' ? "currentColor" : "none"} />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest">Me</span>
                        </button>
                    </nav>
                )
            }

        </div >
    );
}
