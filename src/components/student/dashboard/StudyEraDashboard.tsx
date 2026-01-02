import React, { useState, useEffect } from 'react';
import { useNinja } from '../../../context/NinjaContext';
import { useNavigate } from 'react-router-dom';
import coreCurriculum from '../../../data/cbse7_core_curriculum_v3.json';
import { collection, query, where, getDocs, onSnapshot, orderBy, doc, getDoc, limit } from 'firebase/firestore';
import { db } from '../../../services/db/firebase';
import { Bundle, Challenge, User as UserModel, Question } from '../../../types/models';
import { SUBJECT_TEMPLATE } from '../../../constants/studyEraData';

// Components
import { EraHeader } from './era/EraHeader';
import { EraSubjectGrid } from './era/EraSubjectGrid';
import { EraDetailPanel } from './era/EraDetailPanel';
import { EraArenaView } from './era/EraArenaView';
import { EraQuizView } from './era/EraQuizView';

const StudyEraDashboard = () => {
    const { user, ninjaStats } = useNinja();
    const navigate = useNavigate();

    // Navigation & View State
    const [currentView, setCurrentView] = useState<'dashboard' | 'challenges' | 'quiz'>('dashboard');
    const [arenaSubView, setArenaSubView] = useState<'create' | 'active' | 'history'>('create');
    const [selectedSubject, setSelectedSubject] = useState<any>(null);
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

    // --- ANIMATION STATE ---
    const [isExpanding, setIsExpanding] = useState(false);
    const [expandingSubject, setExpandingSubject] = useState<any>(null);
    const [expansionRect, setExpansionRect] = useState<{ top: number, left: number, width: number, height: number } | null>(null);

    // --- QUIZ HANDLERS ---

    const handleStartQuiz = async (subject?: any) => {
        const targetSubjectId = subject?.id || 'science';
        const querySubject = targetSubjectId.toLowerCase(); // 'gk', 'math', 'science'
        console.log(`🚀 Starting Quiz Sequence for: ${querySubject}`);
        console.log(`🔍 Strategy A: Checking Question Bundles (Grade 7)...`);

        try {
            let foundQuestions: Question[] = [];

            // --- STRATEGY A: FETCH FROM BUNDLES (Like MobileQuestDashboard) ---
            // This is likely where "loaded" questions live
            const bundlesRef = collection(db, 'question_bundles');
            const qBundle = query(
                bundlesRef,
                where('subject', '==', querySubject),
                where('grade', '==', 7), // Assuming Grade 7 context for StudyEra
                limit(1)
            );
            const bundleSnap = await getDocs(qBundle);

            if (!bundleSnap.empty) {
                const bundleDoc = bundleSnap.docs[0];
                console.log(`✅ Found Bundle: ${bundleDoc.id}`);

                // Fetch actual data from 'question_bundle_data'
                const dataRef = doc(db, 'question_bundle_data', bundleDoc.id);
                const dataSnap = await getDoc(dataRef);

                if (dataSnap.exists() && dataSnap.data().questions) {
                    const rawQuestions = dataSnap.data().questions;
                    // Map Simplified Bundle Format -> App Question Format
                    foundQuestions = Object.values(rawQuestions).map((sq: any) => ({
                        id: sq.id,
                        type: 'MCQ_SIMPLIFIED', // Force template
                        text: sq.question, // Legacy
                        content: {
                            prompt: { text: sq.question },
                            instruction: sq.instruction || "Select the best answer"
                        },
                        // Direct options property for template compatibility (added in recent McqEraTemplate update)
                        options: sq.options.map((o: string, i: number) => ({
                            id: String(i + 1),
                            text: o,
                            isCorrect: o === sq.answer
                        })).sort(() => 0.5 - Math.random()),

                        interaction: {
                            config: {
                                options: sq.options.map((o: string, i: number) => ({
                                    id: String(i + 1),
                                    text: o,
                                    isCorrect: o === sq.answer
                                })).sort(() => 0.5 - Math.random())
                            }
                        },
                        correctOptionId: null, // Logic handles via isCorrect in options
                        subject: querySubject,
                        explanation: sq.explanation,
                    } as unknown as Question));

                    // Limit to 20 Questions
                    if (foundQuestions.length > 20) {
                        foundQuestions = foundQuestions.sort(() => 0.5 - Math.random()).slice(0, 20);
                    }

                    console.log(`📦 Loaded ${foundQuestions.length} questions from Bundle (Limited to 20).`);
                }
            } else {
                console.log(`❌ No Bundles found for ${querySubject} (Grade 7)`);
            }

            // --- STRATEGY B: FETCH FROM DIRECT COLLECTION (Fallback) ---
            if (foundQuestions.length === 0) {
                console.log(`🔍 Strategy B: Checking 'questions' collection (MCQ_SIMPLIFIED)...`);
                const qDirect = query(
                    collection(db, 'questions'),
                    where('subject', '==', querySubject),
                    limit(10)
                );
                const directSnap = await getDocs(qDirect);
                if (!directSnap.empty) {
                    foundQuestions = directSnap.docs.map(d => ({ id: d.id, ...d.data() } as Question));
                    console.log(`📂 Found ${foundQuestions.length} questions in direct collection.`);
                }
            }

            // --- FINAL SETUP ---
            if (foundQuestions.length > 0) {
                const shuffled = foundQuestions.sort(() => Math.random() - 0.5);
                setQuizQuestions(shuffled);
            } else {
                console.warn(`⚠️ No questions found for ${querySubject} in Bundles OR Direct DB.`);
                // Fallback Mock (keeping it simple for now)
                setQuizQuestions([
                    {
                        id: 'mock_fail_1',
                        type: 'MCQ_SIMPLIFIED',
                        content: { prompt: { text: "No questions found in database. Please check Admin uploads." } },
                        interaction: { config: { options: [{ text: 'Okay', id: '1', isCorrect: true }] } },
                        subject: querySubject
                    } as any
                ]);
            }

        } catch (error) {
            console.error("🔥 Error loading quiz:", error);
            alert("Database connection failed. Check console.");
        }

        setCurrentQuestionIndex(0);
        setQuizScore(0);
        setCurrentView('quiz');
    };

    const handleEraClick = (subject: any, e: React.MouseEvent) => {
        // 1. Capture the bounding box of the clicked element
        const rect = e.currentTarget.getBoundingClientRect();

        // 2. Save coordinates for the "Ghost Card"
        setExpansionRect({
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
        });

        // 3. Trigger phases
        setExpandingSubject(subject);
        setIsExpanding(true);

        // 4. Handoff to Quiz View after animation (approx 900ms)
        setTimeout(() => {
            handleStartQuiz(subject);
            setIsExpanding(false);
            setExpandingSubject(null);
            // Don't set selectedSubject here to avoid panel flashing
        }, 900);
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

    // 1. Build Subjects
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
                hasAtoms: true,
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
        <div className="min-h-screen bg-[#FAF9F6] text-[#4A4A4A] font-sans selection:bg-pink-100 overflow-x-hidden relative">
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
            {expandingSubject && expansionRect && (
                <div
                    className="fixed z-[1000] pointer-events-none transition-all duration-[900ms] cubic-bezier"
                    style={{
                        top: isExpanding ? 0 : expansionRect.top,
                        left: isExpanding ? 0 : expansionRect.left,
                        width: isExpanding ? '100vw' : expansionRect.width,
                        height: isExpanding ? '100vh' : expansionRect.height,
                        borderRadius: isExpanding ? '0rem' : '3rem', // Matching Grid Card Radius
                    }}
                >
                    {/* The colored background matching the subject */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${expandingSubject.color}`} />

                    {/* The icon scaling up as the card grows */}
                    <div className={`absolute inset-0 flex items-center justify-center transition-all duration-[900ms] ${isExpanding ? 'scale-[3] opacity-20' : 'scale-1 opacity-100'}`}>
                        <span className="text-6xl">{expandingSubject.icon}</span>
                    </div>

                </div>
            )}

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
                                <div className="bg-white/60 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white h-full flex items-center justify-center text-center">
                                    <p className="text-gray-400 font-serif italic text-lg">Select an Era to view details<br />or start a quiz instantly.</p>
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
