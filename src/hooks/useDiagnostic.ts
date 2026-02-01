// @ts-nocheck
import { useState, useEffect, useRef } from 'react';
import { db, auth } from '../services/db/firebase';
import { getDocs, updateDoc } from 'firebase/firestore'; // Removed raw doc/collection
import { useNinja } from '../context/NinjaContext';
import { Question } from '../types';
import { diagnosticQuestionsCollection, getStudentRef } from '../services/db/firestore';

/**
 * useDiagnostic Hook
 * Manages the "Ninja Entrance Exam" logic flow.
 */
export function useDiagnostic(injectedQuestions: Question[] | null = null) {
    const { logQuestionResult, setNinjaStats } = useNinja();
    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [masteryData, setMasteryData] = useState<Record<string, number>>({});
    const [isComplete, setIsComplete] = useState(false);

    // Track specific misconceptions (Hurdles) for the Boss Level tracker
    const [hurdles, setHurdles] = useState<Record<string, number>>({});

    // High-precision timing refs for Recovery Velocity analytics
    const questionStartTime = useRef(Date.now());
    const branchStartTime = useRef<number | null>(null);

    // Initial load: Fetch all diagnostic missions from Firestore
    useEffect(() => {
        const loadQuestions = async () => {
            if (injectedQuestions && injectedQuestions.length > 0) {
                setQuestions(injectedQuestions);
            } else {
                try {
                    // USE TYPED REF
                    const qSnap = await getDocs(diagnosticQuestionsCollection);
                    if (qSnap.empty) {
                        console.warn("No questions found");
                        setQuestions([]);
                        return;
                    }
                    // Type-safe map
                    const sortedQs = qSnap.docs
                        .map(doc => {
                            const data = doc.data() as Question;
                            return { ...data, id: doc.id };
                        })
                        .sort((a, b) => ((a.difficulty as number) || 0) - ((b.difficulty as number) || 0));
                    setQuestions(sortedQs);

                } catch (error) {
                    console.error("Error loading diagnostic questions:", error);
                    setQuestions([]);
                }
            }
            questionStartTime.current = Date.now();
        };
        loadQuestions();
    }, [injectedQuestions]);

    useEffect(() => {
        const saveCompletion = async () => {
            if (isComplete && auth.currentUser) {
                // USE TYPED REF
                const userRef = getStudentRef(auth.currentUser.uid);

                let finalMastery = masteryData;
                if (Object.keys(masteryData).length === 0) {
                    console.warn('[useDiagnostic] ⚠️ masteryData is empty, using default values');
                    finalMastery = {
                        'A1': 0.5, 'A2': 0.5, 'A3': 0.5, 'A4': 0.5, 'A5': 0.5
                    };
                }

                try {
                    // Update partial NinjaStats
                    await updateDoc(userRef, {
                        currentQuest: 'COMPLETED',
                        mastery: finalMastery,
                        hurdles: hurdles,
                        lastMissionDate: new Date().toISOString() // lastUpdated -> lastMissionDate to match interface or add lastUpdated to interface
                    });

                    setNinjaStats(prev => ({
                        ...prev,
                        currentQuest: 'COMPLETED',
                        mastery: finalMastery,
                        hurdles: hurdles
                    }));

                    localStorage.setItem(`ninja_session_${auth.currentUser.uid}`, JSON.stringify({
                        stats: {
                            powerPoints: 0,
                            heroLevel: 1,
                            mastery: finalMastery,
                            hurdles: hurdles,
                            consecutiveBossSuccesses: {},
                            completedMissions: 0,
                            currentQuest: 'COMPLETED',
                            streakCount: 0,
                            lastMissionDate: null
                        },
                        buffer: { logs: [], pointsGained: 0 },
                        role: 'STUDENT'
                    }));

                } catch (error) {
                    console.error("[useDiagnostic] 🔴 Failed to save quest completion:", error);
                }
            }
        };
        saveCompletion();
    }, [isComplete, masteryData, hurdles, setNinjaStats]);

    const startRecoveryTimer = () => {
        branchStartTime.current = Date.now();
    };

    const submitAnswer = async (
        questionId: string,
        isCorrect: boolean,
        atomId: string,
        isRecovered: boolean,
        diagnosticTag: string,
        studentAnswer: string | number,
        correctAnswer: string | number,
        timeSpentSeconds?: number
    ) => {
        // const currentQuestion = questions[currentIndex]; // unused
        console.log('[useDiagnostic] submitAnswer called:', { questionId, isCorrect });

        let timeSpent: number;
        if (timeSpentSeconds !== undefined) {
            timeSpent = timeSpentSeconds;
        } else {
            const timeSpentMs = Date.now() - questionStartTime.current;
            timeSpent = Math.round(timeSpentMs / 1000);
        }

        const currentScore = masteryData[atomId] || 0.5;
        const speedRating = timeSpent < 3 ? 'SPRINT' : (timeSpent < 15 ? 'STEADY' : 'DEEP');

        let recoveryVelocity = 0;
        if (isRecovered && branchStartTime.current) {
            const initialTimeMs = branchStartTime.current - questionStartTime.current;
            const branchTimeMs = Date.now() - branchStartTime.current;
            if (initialTimeMs > 0) {
                recoveryVelocity = (initialTimeMs - branchTimeMs) / initialTimeMs;
                recoveryVelocity = Math.max(0, Math.min(1, recoveryVelocity));
            }
        }

        if (!isCorrect && diagnosticTag) {
            setHurdles(prev => ({
                ...prev,
                [diagnosticTag]: (prev[diagnosticTag] || 0) + 1
            }));
        }

        let updateAmount = -0.1;
        if (isCorrect) updateAmount = 0.1;
        else if (isRecovered) updateAmount = recoveryVelocity > 0.5 ? 0.08 : 0.03;

        const updatedScore = Math.min(0.99, Math.max(0.1, currentScore + updateAmount));
        const newMastery = { ...masteryData, [atomId]: updatedScore };

        await logQuestionResult({
            questionId,
            studentAnswer,
            isCorrect,
            isRecovered,
            recoveryVelocity,
            diagnosticTag,
            timeSpent,
            speedRating,
            atomId,
            masteryBefore: currentScore,
            masteryAfter: updatedScore,
            subject: 'diagnostic',
            questionType: 'MCQ',
            mode: injectedQuestions ? 'DEV_TEST' : 'DIAGNOSTIC'
        });

        setMasteryData(newMastery);
        questionStartTime.current = Date.now();
        branchStartTime.current = null;

        const avgMastery = Object.values(newMastery).reduce((a, b) => a + b, 0) / (Object.keys(newMastery).length || 1);

        if (avgMastery > 0.85 || currentIndex >= questions.length - 1) {
            setIsComplete(true);
        } else {
            setCurrentIndex(prev => prev + 1);
        }
    };

    return {
        currentQuestion: questions[currentIndex],
        currentIndex,
        totalQuestions: questions.length,
        submitAnswer,
        startRecoveryTimer,
        isComplete,
        masteryData,
        hurdles
    };
}
