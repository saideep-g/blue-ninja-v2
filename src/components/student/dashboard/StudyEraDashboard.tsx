import React, { useState, useEffect, useRef } from 'react';
import { useNinja } from '../../../context/NinjaContext';
import { useNavigate } from 'react-router-dom';
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
import { useSubjectData } from './era/hooks/useSubjectData';
import { useDailyProgressSync } from './era/hooks/useDailyProgressSync';


const StudyEraDashboard = () => {
    const { user, ninjaStats } = useNinja();
    const navigate = useNavigate();

    // Navigation & View State
    const [currentView, setCurrentView] = useState<'dashboard' | 'challenges' | 'quiz'>('dashboard');
    const [arenaSubView, setArenaSubView] = useState<'create' | 'active' | 'history'>('create');
    const [selectedSubject, setSelectedSubject] = useState<any>(null);

    // Ref to control Quiz View
    const quizViewRef = useRef<EraQuizViewHandle>(null);

    // --- BACK BUTTON MANAGEMENT ---
    useEffect(() => {
        if (currentView === 'quiz' || currentView === 'challenges') {
            // Push a state so that "Back" stays in the app but goes to dashboard
            window.history.pushState({ view: currentView }, '', window.location.pathname);

            const handlePopState = (event: PopStateEvent) => {
                // If in Quiz view, trigger confirmation instead of immediate exit
                if (currentView === 'quiz' && quizViewRef.current) {
                    event.preventDefault(); // Try to prevent default (though popstate is post-event)
                    window.history.pushState({ view: 'quiz' }, '', window.location.pathname); // Re-push state to stay on page
                    quizViewRef.current.triggerExitConfirmation();
                    return;
                }

                // Default behavior for other views or if ref missing
                event.preventDefault();
                setCurrentView('dashboard');
            };

            // Warn on Browser Exit/Refresh
            const handleBeforeUnload = (e: BeforeUnloadEvent) => {
                if (currentView === 'quiz') {
                    e.preventDefault();
                    e.returnValue = ''; // Standard browser confirmation text
                }
            };

            window.addEventListener('popstate', handlePopState);
            window.addEventListener('beforeunload', handleBeforeUnload);

            return () => {
                window.removeEventListener('popstate', handlePopState);
                window.removeEventListener('beforeunload', handleBeforeUnload);
            };
        }
    }, [currentView]);
    const [greeting, setGreeting] = useState("Loading vibes...");
    const [quizSubject, setQuizSubject] = useState<string | null>(null);

    // Math Mission Hook - REMOVED (Replaced by EraSessionService)
    // const dailyMission = useDailyMission();

    // Quiz State
    const [quizQuestions, setQuizQuestions] = useState<Question[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [quizScore, setQuizScore] = useState(0);
    const [showCelebration, setShowCelebration] = useState(false);
    const [celebrationMessage, setCelebrationMessage] = useState("");
    const [completedSubjects, setCompletedSubjects] = useState<Set<string>>(new Set());

    // --- 4 AM RESET & PERSISTENCE LOGIC ---
    useDailyProgressSync(user, setCompletedSubjects);

    // Data State
    // const [subjects, setSubjects] = useState<any[]>([]); // Refactored to hook
    const [bundles, setBundles] = useState<Bundle[]>([]);
    const [friends, setFriends] = useState<UserModel[]>([]);
    const [activeChallenges, setActiveChallenges] = useState<Challenge[]>([]);

    // --- ANIMATION STATE ---
    const [isExpanding, setIsExpanding] = useState(false);
    const [expandingSubject, setExpandingSubject] = useState<any>(null);
    const [expansionRect, setExpansionRect] = useState<{ top: number, left: number, width: number, height: number } | null>(null);

    // --- QUIZ HANDLERS ---

    // --- DATA FETCHING (Separated) ---
    // --- DATA FETCHING (Delegated to Service) ---
    // fetchQuestions removed - migrated to eraSessionService.ts

    const handleStartQuiz = async () => {
        if (!selectedSubject) return;

        console.log(`🚀 Manual Start Quiz for: ${selectedSubject.id}`);

        if (user) {
            const session = await eraSessionService.startOrResumeSession(user.uid, selectedSubject.id);
            setQuizQuestions(session.questions);
            setCurrentQuestionIndex(session.currentIndex);
            setQuizScore(session.score);
            setQuizSubject(selectedSubject.id);
            setCurrentView('quiz');
        }
    };

    const handleEraClick = async (subject: any, e: React.MouseEvent) => {
        // 1. Capture & Start Expansion
        const rect = e.currentTarget.getBoundingClientRect();
        setExpansionRect({ top: rect.top, left: rect.left, width: rect.width, height: rect.height });
        setExpandingSubject(subject);

        // Tick to allow render of initial state before animating to full
        setTimeout(() => setIsExpanding(true), 10);

        // 2. Parallel: Fetch Data AND Wait for Animation
        const targetId = subject.id || 'science';
        // const isMath = targetId === 'math' || targetId === 'mathematics';

        // UNIFIED ENGINE with PERSISTENCE via Service
        const [session, _] = await Promise.all([
            eraSessionService.startOrResumeSession(user?.uid || 'guest', targetId),
            new Promise(resolve => setTimeout(resolve, 800))
        ]);

        setQuizSubject(targetId);
        setQuizQuestions(session.questions);
        setCurrentQuestionIndex(session.currentIndex);
        setQuizScore(session.score);

        // 3. Smooth Handoff
        setCurrentView('quiz');

        // 4. Fade out overlay
        setExpandingSubject(null);
        setIsExpanding(false);
    };

    const handleQuizAnswer = (result: any) => {
        const isCorrect = result.isCorrect;
        let newScore = quizScore;
        if (isCorrect) newScore = quizScore + 10;
        setQuizScore(newScore);

        if (currentQuestionIndex < quizQuestions.length - 1) {
            const newIndex = currentQuestionIndex + 1;
            setCurrentQuestionIndex(newIndex);

            // Save Progress
            if (user && quizSubject) {
                eraSessionService.updateProgress(user.uid, quizSubject, {
                    currentIndex: newIndex,
                    score: newScore
                });
            }
        } else {
            // Finish
            if (user && quizSubject) {
                eraSessionService.clearSession(user.uid, quizSubject);
            }
            triggerCelebration();
        }
    };

    const triggerCelebration = () => {
        // Mark as completed for this session
        if (quizSubject) {
            setCompletedSubjects(prev => new Set(prev).add(quizSubject));

            // Persist to Firestore (Daily Counts)
            if (user) {
                const keyMap: Record<string, string> = {
                    'math': 'Math', 'science': 'Science',
                    'vocabulary': 'Words', 'english': 'Words',
                    'gk': 'World', 'tables': 'Tables'
                };
                const dbKey = keyMap[quizSubject];
                if (dbKey) {
                    const docRef = doc(db, 'students', user.uid);
                    updateDoc(docRef, {
                        [`daily.${dbKey}`]: increment(10), // Assume ~10 questions per era session
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
            setCurrentView('dashboard');
        }, 4000);
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
        // Randomly select a Gen Z greeting each session
        const randomGreeting = GEN_Z_GREETINGS[Math.floor(Math.random() * GEN_Z_GREETINGS.length)];
        setGreeting(randomGreeting);
    }, []);

    // Math Completion Listener - REMOVED (Handled internally by handleQuizAnswer)
    /* 
    useEffect(() => {
        if (quizSubject === 'math' && dailyMission.isComplete && currentView === 'quiz' && !showCelebration) { 
            triggerCelebration();
        }
    }, [dailyMission.isComplete, quizSubject, currentView]); 
    */

    // 1. Build Subjects
    // 1. Build Subjects (Refactored to Hook)
    const subjects = useSubjectData(ninjaStats, user, completedSubjects);

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

    // 3. Fetch Friends
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
            const myChallenges = list.filter(c => c.participants.some(p => p.userId === user.uid || p.userId === user.email));
            setActiveChallenges(myChallenges);
        });
        return () => unsubscribe();
    }, [user]);

    // --- COMPUTED ---

    const totalCompletedToday = subjects.filter(s => s.completedToday).length;

    // Recalculate auraPoints here
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
                .cubic-bezier {
                    transition-timing-function: cubic-bezier(0.8, 0, 0.2, 1);
                }
                .dashboard-zoom-out {
                    transform: scale(0.9);
                    filter: blur(24px);
                    opacity: 0.2;
                    transition: all 900ms cubic-bezier(0.4, 0, 0.2, 1);
                }
                `}
            </style>

            {/* EXPANSION OVERLAY */}
            {/* EXPANSION OVERLAY (Framer Motion) */}
            {/* EXPANSION OVERLAY */}
            <EraExpansionOverlay
                isExpanding={isExpanding}
                expandingSubject={expandingSubject}
                expansionRect={expansionRect}
            />

            {/* CELEBRATION OVERLAY */}
            {/* CELEBRATION OVERLAY */}
            <EraCelebration
                showCelebration={showCelebration}
                celebrationMessage={celebrationMessage}
            />

            {/* BACKGROUND DECORATION */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-pink-100/50 rounded-full blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[30vw] h-[30vw] bg-purple-100/40 rounded-full blur-[100px]"></div>
            </div>

            <div className={`relative max-w-[1400px] mx-auto p-4 md:p-8 lg:p-12 transition-all duration-[900ms] ${isExpanding ? 'dashboard-zoom-out' : ''}`}>
                {currentView !== 'quiz' && (
                    <EraHeader
                        currentView={currentView}
                        setCurrentView={setCurrentView}
                        setArenaSubView={setArenaSubView}
                        ninjaStats={ninjaStats}
                        user={user}
                        greeting={greeting}
                        totalCompletedToday={totalCompletedToday}
                        navigate={navigate}
                    />
                )}

                {/* CONTENT SWITCHER */}
                {currentView === 'quiz' ? (
                    <EraQuizView
                        ref={quizViewRef}
                        questions={quizQuestions}
                        currentQuestionIndex={currentQuestionIndex}
                        onAnswer={handleQuizAnswer}
                        onClose={() => setCurrentView('dashboard')}
                    />
                ) : currentView === 'dashboard' ? (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-in fade-in duration-500">
                        <EraSubjectGrid
                            subjects={subjects}
                            totalCompletedToday={totalCompletedToday}
                            auraPoints={auraPoints}
                            onOpenArena={() => { setCurrentView('challenges'); setArenaSubView('create'); }}
                            onSelectSubject={handleEraClick}
                            selectedSubjectId={selectedSubject?.id}
                            onOpenTables={() => navigate('/tables')}
                        />

                        <div className="lg:col-span-4 sticky top-8 h-[700px]">
                            {/* We keep DetailPanel but it effectively disappears when we switch views */}
                            {selectedSubject && !isExpanding && (
                                <EraDetailPanel
                                    selectedSubject={selectedSubject}
                                    onClose={() => setSelectedSubject(null)}
                                    // Using handleStartQuiz with no arg uses mock/existing questions
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
                ) : ( // Challenges View
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
                )}
            </div>
        </div>
    );
};

export default StudyEraDashboard;
