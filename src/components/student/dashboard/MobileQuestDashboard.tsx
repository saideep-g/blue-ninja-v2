import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNinja } from '../../../context/NinjaContext';
import { collection, query, where, limit, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { db } from '../../../services/db/firebase';
import { Question } from '../../../types';
import { getStudentTableStats } from '../../../features/multiplication-tables/services/tablesFirestore';
import { CHAPTERS } from '../../../constants/chapters';

// Support
import 'katex/dist/katex.min.css';

// Components
import { StudentHeader } from './StudentHeader';
import { HomeView } from './HomeView';
import { AwardsView } from './AwardsView';
import { ProfileView } from './ProfileView';
import { MobileChallengeArena } from '../challenges/MobileChallengeArena';

// Quest Components
import { QuestQuizView } from './quest/QuestQuizView';
import { QuestResultsView } from './quest/QuestResultsView';
import { QuestBottomNav } from './quest/QuestBottomNav';


export default function MobileQuestDashboard() {
    const { ninjaStats, user, updatePower, logQuestionResult } = useNinja();
    const navigate = useNavigate();

    const [view, setView] = useState('home'); // home, awards, profile, quiz, results

    // --- STATE ---
    // Persistent stats
    const [dailyProgress, setDailyProgress] = useState<Record<string, number>>({ Math: 0, Science: 0, Words: 0, World: 0, Tables: 0 });
    const [currentStreak, setCurrentStreak] = useState(0);
    const [totalPoints, setTotalPoints] = useState(0);

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

    // History Management for Back Button
    useEffect(() => {
        if (view === 'quiz' || view === 'results') {
            // Push a state so the back button doesn't exit the app
            window.history.pushState({ panel: view }, '', window.location.href);

            const handlePopState = (event: PopStateEvent) => {
                // Intercept back button and go Home
                setView('home');
            };

            window.addEventListener('popstate', handlePopState);

            return () => {
                window.removeEventListener('popstate', handlePopState);
            };
        }
    }, [view]);

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
                        if (data.points !== undefined) setTotalPoints(data.points);
                        if (data.streak !== undefined) setCurrentStreak(data.streak);

                        // 4 AM Reset Logic
                        // Check if lastActive is before today's 4 AM cutoff
                        const lastDate = data.lastActive?.toDate();
                        if (lastDate) {
                            const now = new Date();
                            const resetTime = new Date();
                            resetTime.setHours(4, 0, 0, 0); // 4:00 AM today

                            // If currently 2 AM, the reset time was yesterday 4 AM
                            if (now < resetTime) {
                                resetTime.setDate(resetTime.getDate() - 1);
                            }

                            if (lastDate < resetTime) {
                                console.log("New Day Detected: Resetting Daily Progress & Updating Streak");

                                // Streak Logic
                                const yesterdayReset = new Date(resetTime);
                                yesterdayReset.setDate(yesterdayReset.getDate() - 1);

                                let newStreak = (data.streak || 0);
                                if (lastDate >= yesterdayReset) {
                                    newStreak += 1; // Consecutive login
                                } else {
                                    newStreak = 1; // Reset to 1 (active today)
                                }

                                const zeros = { Math: 0, Science: 0, Words: 0, World: 0, Tables: 0 };
                                setDailyProgress(zeros);
                                setCurrentStreak(newStreak);
                                updateDoc(docRef, {
                                    daily: zeros,
                                    lastActive: new Date(),
                                    streak: newStreak
                                }).catch(console.error);
                            }
                        }
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
                const gradeToFetch = subject === 'GK' ? 7 : 2;
                const bundlesRef = collection(db, 'question_bundles');
                const qBundle = query(
                    bundlesRef,
                    where('subject', '==', subject.toLowerCase()),
                    where('grade', '==', gradeToFetch),
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

        // Sound played in view component wrapper now
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
                    stats={{ stars: totalPoints || 0, streak: currentStreak || 0, powerPoints: totalPoints || 0 }}
                    onUpdateProfile={handleProfileUpdate}
                />
            )}

            {/* Quiz & Results Overlays */}
            {/* --- QUIZ view --- */}
            {view === 'quiz' && (
                <QuestQuizView
                    questions={questions}
                    currentQIndex={currentQIndex}
                    selectedAnswer={selectedAnswer}
                    feedback={feedback}
                    onAnswer={handleAnswer}
                    onNext={handleNext}
                    onBack={() => window.history.back()}
                />
            )}

            {view === 'results' && (
                <QuestResultsView
                    score={score}
                    onContinue={() => { setView('home'); window.scrollTo(0, 0); }}
                />
            )}


            {/* --- CHALLENGES View --- */}
            {view === 'challenges' && (
                <div className="fixed inset-0 z-[60] bg-white animate-in slide-in-from-right duration-300">
                    <MobileChallengeArena onBack={() => setView('home')} />
                </div>
            )}

            {/* Bottom Nav */}
            {
                ['home', 'awards', 'profile', 'challenges'].includes(view) && (
                    <QuestBottomNav currentView={view} setView={setView} />
                )
            }

        </div >
    );
}
