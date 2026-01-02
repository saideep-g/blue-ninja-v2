import React, { useState, useEffect } from 'react';
import { useNinja } from '../../../context/NinjaContext';
import { useNavigate } from 'react-router-dom';
import coreCurriculum from '../../../data/cbse7_core_curriculum_v3.json';
import { collection, query, where, getDocs, onSnapshot, orderBy, doc, getDoc } from 'firebase/firestore';
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

    // --- QUIZ HANDLERS ---

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

    // Recalculate auraPoints here or in Grid? Grid is better but we also use it in Header?
    // Wait, Header uses totalCompletedToday (the bars), not auraPoints specifically (XP).
    // The bars in header: `i < totalCompletedToday`.
    // The XP is in Grid.
    // So Grid can calculate auraPoints itself!
    // But wait, Grid props interface `auraPoints: number`. I'll calculate it here to pass it down.
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
        <div className="min-h-screen bg-[#FAF9F6] text-[#4A4A4A] font-sans selection:bg-pink-100 overflow-x-hidden">

            {/* BACKGROUND DECORATION */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-pink-100/50 rounded-full blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[30vw] h-[30vw] bg-purple-100/40 rounded-full blur-[100px]"></div>
            </div>

            <div className="relative max-w-[1400px] mx-auto p-4 md:p-8 lg:p-12">
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
                            onSelectSubject={setSelectedSubject}
                            selectedSubjectId={selectedSubject?.id}
                        />

                        <div className="lg:col-span-4 sticky top-8 h-[700px]">
                            <EraDetailPanel
                                selectedSubject={selectedSubject}
                                onClose={() => setSelectedSubject(null)}
                                onStartQuiz={handleStartQuiz}
                            />
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
