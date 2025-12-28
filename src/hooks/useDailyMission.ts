// @ts-nocheck
import { useState, useEffect, useCallback } from 'react';
import { db, auth } from '../services/firebase'; // db still needed for some direct ops? Maybe not if we use service completely.
import { getDocs, doc, updateDoc, collection, query, limit, orderBy } from 'firebase/firestore';
import { useNinja } from '../context/NinjaContext';
import { Question } from '../types';
import { diagnosticQuestionsCollection, getStudentRef, questionBundlesCollection } from '../services/db';

/**
 * useDailyMission Hook
 * Implements the Phase 2.0 "3-4-3" Selection Algorithm.
 */
export function useDailyMission(devQuestions: Question[] | null = null) {
    const { ninjaStats, setNinjaStats, logQuestionResultLocal, updatePower, updateStreak, syncToCloud, refreshSessionLogs } = useNinja();
    const [missionQuestions, setMissionQuestions] = useState<Question[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [isComplete, setIsComplete] = useState(false);

    // Initial Start Time for the first question
    const [questionStartTime, setQuestionStartTime] = useState(Date.now());

    const [sessionResults, setSessionResults] = useState({
        correctCount: 0,
        flowGained: 0,
        hurdlesTargeted: [] as string[],
        sprintCount: 0
    });

    const generateMission = useCallback(async () => {
        // SCENARIO INJECTION LOGIC
        if (devQuestions && devQuestions.length > 0) {
            setMissionQuestions(devQuestions);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        try {
            // V3: Fetch Bundle
            let allQuestions: Question[] = [];
            const bundlesRef = questionBundlesCollection;
            // Fetch any available bundle (optimized for 0 reads if cached, but here we query once)
            // Ideally we'd cache this in IDB, but for now we fetch fresh.
            const bundleQuery = query(bundlesRef, limit(1));
            const bundleSnap = await getDocs(bundleQuery);

            if (!bundleSnap.empty) {
                const bundleData = bundleSnap.docs[0].data();
                const rawItems = bundleData.items || [];
                // Map V3 items to internal Question interface
                allQuestions = rawItems.map((item: any) => ({
                    ...item,
                    id: item.item_id || item.id,
                    atom: item.atom_id || item.atom, // Normalize for logic
                    type: item.template_id || item.type
                }));
                console.log(`[useDailyMission] Loaded ${allQuestions.length} items from V3 Bundle.`);
            } else {
                console.warn("[useDailyMission] No V3 Bundles found. Falling back to legacy collection.");
                // Legacy Fallback
                const qSnap = await getDocs(diagnosticQuestionsCollection);
                if (qSnap.empty) {
                    setMissionQuestions([]);
                    setIsLoading(false);
                    return;
                }
                allQuestions = qSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Question));
            }

            const mastery = ninjaStats.mastery || {};
            const hurdles = ninjaStats.hurdles || {};

            // Category 1: Warm-ups (3 Questions)
            const warmUps = allQuestions
                .filter(q => (mastery[q.atom || ''] || 0) > 0.7)
                .sort(() => Math.random() - 0.5)
                .slice(0, 3);

            // Category 2: Hurdle-Killers (4 Questions) - Match active hurdle tags
            const activeHurdleTags = Object.keys(hurdles).filter(tag => hurdles[tag] > 0);
            const hurdleKillers = allQuestions
                .filter(q => {
                    // Assuming q.distractors exists in new Question model? 
                    // Wait, models.ts Question interface doesn't have distractors.
                    // It says "Legacy/Support fields".
                    // Assuming Question interface allows 'any' extra props or I need to add it.
                    // I will check the model. Question interface has `metadata?: any`. 
                    // But if these are document properties, they should be in the interface.
                    // For now, I'll access it as any to avoid strict error if prop missing from interface.
                    const qAny = q as any;
                    return qAny.distractors?.some((d: any) => activeHurdleTags.includes(d.diagnostic_tag));
                })
                .sort(() => Math.random() - 0.5)
                .slice(0, 4);

            // Category 3: Cool-downs/Frontier (3 Questions) - Mastery < 0.4 or New
            const coolDowns = allQuestions
                .filter(q => !mastery[q.atom || ''] || mastery[q.atom || ''] < 0.4)
                .sort(() => Math.random() - 0.5)
                .slice(0, 3);

            const final10 = [...warmUps, ...hurdleKillers, ...coolDowns];

            if (final10.length < 10) {
                const usedIds = new Set(final10.map(q => q.id));
                const extras = allQuestions
                    .filter(q => !usedIds.has(q.id))
                    .sort(() => Math.random() - 0.5)
                    .slice(0, 10 - final10.length);
                final10.push(...extras);
            }

            setMissionQuestions(final10.sort(() => Math.random() - 0.5));
            setQuestionStartTime(Date.now());
            setIsLoading(false);
        } catch (error) {
            console.error("Failed to generate Daily 10:", error);
            setMissionQuestions([]);
            setIsLoading(false);
        }
    }, [ninjaStats.mastery, ninjaStats.hurdles, devQuestions]);

    useEffect(() => {
        if (ninjaStats.currentQuest === 'COMPLETED' && missionQuestions.length === 0) {
            generateMission();
        }
    }, [generateMission, ninjaStats.currentQuest, missionQuestions.length]);

    const submitDailyAnswer = async (
        isCorrect: boolean,
        choice: string | number,
        isRecovered: boolean,
        tag: string,
        timeSpent: number,
        speedRating: string
    ) => {
        if (!auth.currentUser) return;
        const currentQuestion = missionQuestions[currentIndex];
        // USE TYPED REF
        const studentRef = getStudentRef(auth.currentUser.uid);
        const isTestUser = auth.currentUser?.uid.includes('test_user');

        const cappedThinkingTime = Math.min(timeSpent, 60);

        const currentAtom = currentQuestion.atom || (currentQuestion as any).atom_id || 'UNKNOWN_ATOM';
        const masteryBefore = ninjaStats.mastery[currentAtom] || 0.5;
        let masteryChange = isCorrect ? 0.05 : (isRecovered ? 0.02 : -0.05);
        const masteryAfter = Math.min(0.99, Math.max(0.1, masteryBefore + masteryChange));

        let recoveryVelocity = 0;
        if (isRecovered) {
            const totalMissionTime = (Date.now() - questionStartTime) / 1000;
            const recoveryTime = totalMissionTime - timeSpent;
            recoveryVelocity = Math.max(0, (timeSpent - recoveryTime) / timeSpent);
        }

        const updatedHurdles = { ...ninjaStats.hurdles };
        const updatedConsecutive = { ...ninjaStats.consecutiveBossSuccesses };

        if (tag) {
            if (isCorrect) {
                const newStreak = (updatedConsecutive[tag] || 0) + 1;
                updatedConsecutive[tag] = newStreak;

                if (newStreak >= 3) {
                    updatedHurdles[tag] = 0;
                    updatedConsecutive[tag] = 0;
                }
            } else {
                updatedConsecutive[tag] = 0;
            }
        }

        setNinjaStats(prev => ({
            ...prev,
            mastery: { ...prev.mastery, [currentAtom]: masteryAfter },
            hurdles: updatedHurdles,
            consecutiveBossSuccesses: updatedConsecutive
        }));

        logQuestionResultLocal({
            questionId: currentQuestion.id,
            studentAnswer: choice,
            isCorrect,
            isRecovered,
            recoveryVelocity,
            diagnosticTag: tag,
            timeSpent,
            cappedThinkingTime,
            speedRating,
            masteryBefore,
            masteryAfter,
            atomId: currentAtom,
            mode: 'DAILY'
        }, currentIndex);

        const currentAtomMastery = ninjaStats.mastery[currentAtom] || 0.5;
        const newAtomMastery = Math.min(0.99, Math.max(0.1, currentAtomMastery + masteryChange));

        const gain = isCorrect ? 15 : (isRecovered ? 7 : 0);
        updatePower(gain);

        if (!isTestUser) {
            await updateDoc(studentRef, {
                [`mastery.${currentAtom}`]: newAtomMastery,
                hurdles: updatedHurdles,
                consecutiveBossSuccesses: updatedConsecutive
            });
        }

        setSessionResults(prev => ({
            ...prev,
            correctCount: isCorrect ? prev.correctCount + 1 : prev.correctCount,
            flowGained: prev.flowGained + gain,
            hurdlesTargeted: tag ? [...new Set([...prev.hurdlesTargeted, tag])] : prev.hurdlesTargeted,
            sprintCount: speedRating === 'SPRINT' ? prev.sprintCount + 1 : prev.sprintCount
        }));

        if (currentIndex >= missionQuestions.length - 1) {
            setIsComplete(true);

            if (!isTestUser) {
                try {
                    const streakUpdateSuccess = await updateStreak();

                    if (streakUpdateSuccess) {
                        console.log('[useDailyMission] ✅ Streak updated, syncing to cloud...');
                        await syncToCloud(true);
                    } else {
                        console.warn('[useDailyMission] ⚠️ Streak update failed, but syncing logs anyway...');
                        await syncToCloud(true);
                    }

                    console.log('[useDailyMission] Refreshing analytics...');
                    await refreshSessionLogs();

                } catch (error) {
                    console.error('[useDailyMission] Error during completion:', error);
                    try {
                        await refreshSessionLogs();
                    } catch (refreshError) {
                        console.error('[useDailyMission] Failed to refresh logs:', refreshError);
                    }
                }
            } else {
                await syncToCloud(true);
                await refreshSessionLogs();
            }
        } else {
            setCurrentIndex(prev => prev + 1);
            setQuestionStartTime(Date.now());
        }

    };

    return {
        currentQuestion: missionQuestions[currentIndex],
        currentIndex,
        totalQuestions: missionQuestions.length,
        isLoading,
        isComplete,
        sessionResults,
        submitDailyAnswer
    };
}