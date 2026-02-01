import React, { useState, useEffect, useRef } from 'react';
import { useNinja } from '../../../context/NinjaContext';
import { useNavigate, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { collection, query, where, getDocs, onSnapshot, orderBy, doc, getDoc, limit, updateDoc, increment } from 'firebase/firestore';
import { db } from '../../../services/db/firebase';
import { Bundle, Challenge, User as UserModel, Question } from '../../../types/models';
import { GEN_Z_GREETINGS } from '../../../constants/studyEraData';
import { eraSessionService } from '../../../services/eraSessionService';

// Components
import { EraHeader } from './era/EraHeader';
import { EraSubjectGrid } from './era/EraSubjectGrid';
import { EraDetailPanel } from './era/EraDetailPanel';
import { EraArenaView } from './era/EraArenaView';
import { EraQuizView, EraQuizViewHandle } from './era/EraQuizView';
import { EraExpansionOverlay } from './era/EraExpansionOverlay';
import { EraCelebration } from './era/EraCelebration';
import { MonthlyLogsView } from './logs/MonthlyLogsView';
import { useSubjectData } from './era/hooks/useSubjectData';
import { useDailyProgressSync } from './era/hooks/useDailyProgressSync';


const StudyEraDashboard = () => {
    const { user, ninjaStats, logQuestionResultLocal, syncToCloud } = useNinja();
    const navigate = useNavigate();
    const location = useLocation();

    // Derive view from URL
    const currentView = (() => {
        if (location.pathname.includes('/quiz')) return 'quiz';
        if (location.pathname.includes('/arena')) return 'challenges';
        if (location.pathname.includes('/history')) return 'logs';
        return 'dashboard';
    })();

    const [arenaSubView, setArenaSubView] = useState<'create' | 'active' | 'history'>('create');
    const [selectedSubject, setSelectedSubject] = useState<any>(null);

    // Ref to control Quiz View
    const quizViewRef = useRef<EraQuizViewHandle>(null);

    // --- BROWSER NAVIGATION MANAGEMENT ---
    useEffect(() => {
        // Handle physical back button/exit confirmation for Quiz
        const handlePopState = (event: PopStateEvent) => {
            if (currentView === 'quiz' && quizViewRef.current) {
                // Stay on page and show confirmation
                window.history.pushState({ view: 'quiz' }, '', window.location.pathname);
                quizViewRef.current.triggerExitConfirmation();
                return;
            }
        };

        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (currentView === 'quiz') {
                e.preventDefault();
                e.returnValue = '';
            }
        };

        window.addEventListener('popstate', handlePopState);
        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('popstate', handlePopState);
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [currentView]);

    const [greeting, setGreeting] = useState("Loading vibes...");
    const [quizSubject, setQuizSubject] = useState<string | null>(null);

    // Quiz State
    const [quizQuestions, setQuizQuestions] = useState<Question[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [quizScore, setQuizScore] = useState(0);
    const [showCelebration, setShowCelebration] = useState(false);
    const [celebrationMessage, setCelebrationMessage] = useState("");
    const [completedSubjects, setCompletedSubjects] = useState<Set<string>>(new Set());
    const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
    const [loggedQuestions] = useState<Set<string>>(new Set()); // Dedup Logs per session

    // --- 4 AM RESET & PERSISTENCE LOGIC ---
    useDailyProgressSync(user, setCompletedSubjects);

    // Data State
    const [bundles, setBundles] = useState<Bundle[]>([]);
    const [friends, setFriends] = useState<UserModel[]>([]);
    const [activeChallenges, setActiveChallenges] = useState<Challenge[]>([]);

    // --- ANIMATION STATE ---
    const [isExpanding, setIsExpanding] = useState(false);
    const [expandingSubject, setExpandingSubject] = useState<any>(null);
    const [expansionRect, setExpansionRect] = useState<{ top: number, left: number, width: number, height: number } | null>(null);

    const handleStartQuiz = async () => {
        if (!selectedSubject) return;
        if (user) {
            const session = await eraSessionService.startOrResumeSession(user.uid, selectedSubject.id);
            setQuizQuestions(session.questions);
            setCurrentQuestionIndex(session.currentIndex);
            setQuizScore(session.score);
            setQuizSubject(selectedSubject.id);
            setQuizSubject(selectedSubject.id);
            setQuestionStartTime(Date.now());
            loggedQuestions.clear();
            navigate('/quiz');
        }
    };

    const handleEraClick = async (subject: any, e: React.MouseEvent) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setExpansionRect({ top: rect.top, left: rect.left, width: rect.width, height: rect.height });
        setExpandingSubject(subject);
        setTimeout(() => setIsExpanding(true), 10);

        const targetId = subject.id || 'science';
        const [session] = await Promise.all([
            eraSessionService.startOrResumeSession(user?.uid || 'guest', targetId),
            new Promise(resolve => setTimeout(resolve, 800))
        ]);

        setQuizSubject(targetId);
        setQuizQuestions(session.questions);
        setCurrentQuestionIndex(session.currentIndex);
        setQuizScore(session.score);

        setQuestionStartTime(Date.now());
        loggedQuestions.clear();
        navigate('/quiz');
        setExpandingSubject(null);
        setIsExpanding(false);
    };

    const handleQuizAnswer = (result: any, shouldAdvance = true) => {
        const isCorrect = result.isCorrect;
        const currentQuestion = quizQuestions[currentQuestionIndex];
        const qId = currentQuestion?.id || `q-${currentQuestionIndex}`;

        // 1. Log Result (If not already logged)
        if (currentQuestion && !loggedQuestions.has(qId)) {
            let newScore = quizScore;
            if (isCorrect) newScore = quizScore + 10;
            if (shouldAdvance) setQuizScore(newScore); // Only update score on advance or immediate? Usually score updates on correct.

            // Robust extraction of correct answer for various question types
            const extractCorrectAnswer = () => {
                if (result.correctAnswerText) return result.correctAnswerText;

                // Fallback for non-updated templates or numeric questions
                const answerKey = currentQuestion.answerKey || (currentQuestion as any).answer_key || {};
                const rawCorrectValue = answerKey.correctValue ??
                    answerKey.value ??
                    (currentQuestion as any).correctAnswer ??
                    (currentQuestion as any).correct_answer ??
                    (currentQuestion as any).answer;

                if (rawCorrectValue !== undefined && rawCorrectValue !== null) {
                    return String(rawCorrectValue);
                }

                // MCQ Fallback
                const options = (currentQuestion as any).options ||
                    (currentQuestion as any).content?.interaction?.config?.options ||
                    (currentQuestion as any).interaction?.config?.options;

                if (options && Array.isArray(options)) {
                    const correctOption = options.find((opt: any) => opt.isCorrect);
                    if (correctOption) return correctOption.text;

                    const correctOptionId = (currentQuestion as any).correctOptionId || currentQuestion.answerKey?.correctOptionId;
                    if (correctOptionId) {
                        const found = options.find(o => String(o.id) === String(correctOptionId));
                        if (found) return found.text;
                    }
                }

                return 'N/A';
            };

            const duration = result.durationSeconds !== undefined ? result.durationSeconds : (Date.now() - questionStartTime) / 1000;

            if (logQuestionResultLocal) {
                logQuestionResultLocal({
                    questionId: qId,
                    questionText: currentQuestion.question_text || (currentQuestion as any).question || currentQuestion.content?.prompt?.text || 'Question',
                    studentAnswer: result.studentAnswerText || result.value || result.selectedValue || 'Answer',
                    correctAnswer: extractCorrectAnswer(),
                    isCorrect: isCorrect,
                    timestamp: new Date(),
                    subject: (quizSubject || 'unknown').toLowerCase() === 'english' ? 'vocabulary' : (quizSubject || 'unknown').toLowerCase(),
                    timeSpent: duration,
                    questionType: (() => {
                        const q = currentQuestion as any;
                        let type = q.type || q.templateId || q.template_id || q.template;

                        if (!type) {
                            const hasAnswer = q.answer || q.correct_answer || q.correctAnswer || (q.answerKey && (q.answerKey.correctValue || q.answerKey.value));
                            const hasOptions = q.options && Array.isArray(q.options) && q.options.length > 0;
                            type = (hasAnswer && !hasOptions) ? 'NUMERIC_AUTO' : 'MCQ_SIMPLIFIED';
                        }

                        return typeof type === 'string' ? type.toUpperCase() : 'UNKNOWN';
                    })()
                }, currentQuestionIndex);

                loggedQuestions.add(qId);
            }
        }

        // 2. Advance Question (Optional)
        if (shouldAdvance) {
            // Update score visually here if we want strict flow
            if (isCorrect) setQuizScore(s => s + 10);

            if (currentQuestionIndex < quizQuestions.length - 1) {
                const newIndex = currentQuestionIndex + 1;
                setCurrentQuestionIndex(newIndex);
                setQuestionStartTime(Date.now());
                if (user && quizSubject) {
                    eraSessionService.updateProgress(user.uid, quizSubject, {
                        currentIndex: newIndex,
                        score: quizScore + (isCorrect ? 10 : 0)
                    });
                }
            } else {
                if (user && quizSubject) {
                    eraSessionService.clearSession(user.uid, quizSubject);
                }
                // Trigger Final Sync when Quiz completes
                syncToCloud(true).catch(e => console.error("Final sync failed", e));
                triggerCelebration();
            }
        }
    };

    const handleExitQuiz = () => {
        // Sync remaining logs before exiting
        syncToCloud(true).catch(e => console.error("Exit sync failed", e));
        navigate('/');
    };

    const triggerCelebration = () => {
        if (quizSubject) {
            setCompletedSubjects(prev => new Set(prev).add(quizSubject));
            if (user) {
                const keyMap: Record<string, string> = {
                    'math': 'Math', 'science': 'Science',
                    'vocabulary': 'Words', 'english': 'Words',
                    'gk': 'World', 'tables': 'Tables',
                    'geography': 'Geography'
                };
                const dbKey = keyMap[quizSubject];
                if (dbKey) {
                    const docRef = doc(db, 'students', user.uid);
                    updateDoc(docRef, {
                        [`daily.${dbKey}`]: increment(10),
                        lastActive: new Date()
                    }).catch(e => console.error("Failed to save daily progress", e));
                }
            }
        }

        const genZPraises = ["SLAYED IT! 💅", "NO CRUMBS LEFT 🍪", "MAIN CHARACTER ENERGY ✨", "W RIZZ 👑", "ATE THAT UP 🔥"];
        setCelebrationMessage(genZPraises[Math.floor(Math.random() * genZPraises.length)]);
        setShowCelebration(true);

        setTimeout(() => {
            setShowCelebration(false);
            navigate('/');
        }, 4000);
    };

    const handleEnterArena = async (challenge: Challenge) => {
        try {
            const allQuestions: Question[] = [];
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
                const shuffled = allQuestions.sort(() => Math.random() - 0.5);
                setQuizQuestions(shuffled);
                setCurrentQuestionIndex(0);
                setQuizScore(0);
                navigate('/quiz');
            } else {
                alert("This arena seems empty! No questions found.");
            }
        } catch (e) {
            console.error("Failed to enter arena", e);
            alert("Failed to load arena questions.");
        }
    };

    useEffect(() => {
        const randomGreeting = GEN_Z_GREETINGS[Math.floor(Math.random() * GEN_Z_GREETINGS.length)];
        setGreeting(randomGreeting);
    }, []);

    const subjects = useSubjectData(ninjaStats, user, completedSubjects);

    useEffect(() => {
        const fetchBundles = async () => {
            try {
                const q = query(collection(db, 'question_bundles'), orderBy('updatedAt', 'desc'));
                const snap = await getDocs(q);
                const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Bundle));
                setBundles(list);
            } catch (e) { console.error(e); }
        };
        fetchBundles();
    }, []);

    useEffect(() => {
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
        if (user) fetchFriends();
    }, [user]);

    useEffect(() => {
        if (!user) return;
        const q = query(
            collection(db, 'challenges'),
            where('status', '==', 'active'),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snap) => {
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Challenge));
            const myChallenges = list.filter(c => c.participants.some(p => p.userId === user.uid || p.userId === user.email));
            setActiveChallenges(myChallenges);
        });
        return () => unsubscribe();
    }, [user]);

    const totalCompletedToday = subjects.filter(s => s.completedToday).length;
    const auraPoints = subjects.reduce((total, s) => {
        let subjTotal = 0;
        s.modules.forEach((m: any) => {
            if (m.atoms) {
                m.atoms.forEach((a: any) => subjTotal += a.mastery);
            } else {
                subjTotal += m.mastery || 0;
            }
        });
        return total + subjTotal;
    }, 0);

    return (
        <div className="min-h-screen bg-theme-bg text-theme-text font-sans selection:bg-pink-100 overflow-x-hidden relative transition-colors duration-300">
            <style>
                {`
                .cubic-bezier { transition-timing-function: cubic-bezier(0.8, 0, 0.2, 1); }
                .dashboard-zoom-out { transform: scale(0.9); filter: blur(24px); opacity: 0.2; transition: all 900ms cubic-bezier(0.4, 0, 0.2, 1); }
                `}
            </style>

            <EraExpansionOverlay isExpanding={isExpanding} expandingSubject={expandingSubject} expansionRect={expansionRect} />
            <EraCelebration showCelebration={showCelebration} celebrationMessage={celebrationMessage} />

            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-pink-100/50 rounded-full blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[30vw] h-[30vw] bg-purple-100/40 rounded-full blur-[100px]"></div>
            </div>

            <div className={`relative max-w-[1400px] mx-auto p-4 md:p-8 lg:p-12 transition-all duration-[900ms] ${isExpanding ? 'dashboard-zoom-out' : ''}`}>
                {currentView !== 'quiz' && (
                    <EraHeader
                        currentView={currentView}
                        setArenaSubView={setArenaSubView}
                        ninjaStats={ninjaStats}
                        user={user}
                        greeting={greeting}
                        totalCompletedToday={totalCompletedToday}
                        navigate={navigate}
                    />
                )}

                <Routes>
                    <Route path="/" element={
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-in fade-in duration-500">
                            <EraSubjectGrid
                                subjects={subjects}
                                totalCompletedToday={totalCompletedToday}
                                auraPoints={auraPoints}
                                onOpenArena={() => navigate('/arena')}
                                onSelectSubject={handleEraClick}
                                selectedSubjectId={selectedSubject?.id}
                                onOpenTables={() => navigate('/tables')}
                            />

                            <div className="lg:col-span-4 sticky top-8 h-[700px]">
                                {selectedSubject && !isExpanding && (
                                    <EraDetailPanel
                                        selectedSubject={selectedSubject}
                                        onClose={() => setSelectedSubject(null)}
                                        onStartQuiz={() => handleStartQuiz()}
                                    />
                                )}
                                {!selectedSubject && !isExpanding && (
                                    <div className="bg-theme-card/60 backdrop-blur-xl p-8 rounded-[2.5rem] border border-theme-border h-full flex items-center justify-center text-center">
                                        <p className="text-color-text-secondary font-serif italic text-lg">Select an Era to view details<br />or start a quiz instantly.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    } />

                    <Route path="/arena" element={
                        <EraArenaView
                            subView={arenaSubView}
                            setSubView={setArenaSubView}
                            bundles={bundles}
                            activeChallenges={activeChallenges}
                            friends={friends}
                            user={user}
                            ninjaStats={ninjaStats}
                            onEnterArena={handleEnterArena}
                        />
                    } />

                    <Route path="/history" element={<MonthlyLogsView />} />

                    <Route path="/quiz" element={
                        <EraQuizView
                            ref={quizViewRef}
                            questions={quizQuestions}
                            currentQuestionIndex={currentQuestionIndex}
                            onAnswer={handleQuizAnswer}
                            onClose={handleExitQuiz}
                        />
                    } />

                    {/* Fallback */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </div>
        </div>
    );
};

export default StudyEraDashboard;
