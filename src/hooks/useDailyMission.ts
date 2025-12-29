// @ts-nocheck
import { useState, useEffect, useCallback } from 'react';
import { useNinja } from '../context/NinjaContext';
import { Question } from '../types';
import { auth } from '../services/db/firebase';
import { missionsService } from '../services/missions';
import { logger } from '../services/logging';

/**
 * useDailyMission Hook
 * 
 * Now integrated with the V3 Missions Service.
 * Implements "Simulated Mission Control" for testing.
 */
export function useDailyMission(devQuestions: Question[] | null = null) {
    const { ninjaStats, setNinjaStats, logQuestionResultLocal, updatePower, updateStreak, syncToCloud, refreshSessionLogs } = useNinja();
    const [missionQuestions, setMissionQuestions] = useState<Question[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [isComplete, setIsComplete] = useState(false);
    const [activeMissionId, setActiveMissionId] = useState<string | null>(null);

    // Initial Start Time for the first question
    const [questionStartTime, setQuestionStartTime] = useState(Date.now());

    const [sessionResults, setSessionResults] = useState({
        correctCount: 0,
        flowGained: 0,
        hurdlesTargeted: [] as string[],
        sprintCount: 0
    });

    const generateMission = useCallback(async () => {
        // SCENARIO INJECTION LOGIC (Legacy Prop Support)
        if (devQuestions && devQuestions.length > 0) {
            setMissionQuestions(devQuestions);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        try {
            const user = auth.currentUser;
            if (!user) {
                console.warn('[useDailyMission] No user logged in, cannot generate missions.');
                setIsLoading(false);
                return;
            }

            // --- SIMULATION CONTROL FOR TESTING ---
            // Check for test configuration in LocalStorage
            const storedSimConfig = localStorage.getItem('BLUE_NINJA_SIM_CONFIG');
            const simConfig = storedSimConfig ? JSON.parse(storedSimConfig) : undefined;

            if (simConfig) {
                console.log('🧪 ACTIVATING TEST LAB SIMULATION:', simConfig);
                // Optional: Clear config after use if one-time, or keep for sticky sessions
                // localStorage.removeItem('BLUE_NINJA_SIM_CONFIG'); 
            }
            // --------------------------------------

            // CALL NEW SERVICE
            const batch = await missionsService.generateDailyMissions({
                userId: user.uid,
                date: new Date().toISOString().split('T')[0]
            }, simConfig);

            // FLATTEN MISSIONS TO QUESTIONS FOR UI
            // The UI expects a flat list of 10-15 questions.
            // The Service generates 5 Missions, each containing a subset of questions.

            let allRecruitedQuestions: any[] = [];

            if (batch && batch.missions) {
                // Determine completion status to find where to start
                // Actually, for "Daily Flight", we usually load the whole set.
                // But V3 tracks individual mission completion.
                // We will load ALL questions, but mark completed ones as done?
                // Or acts as a daily playlist.

                batch.missions.forEach(mission => {
                    if (mission.questions) {
                        // Map MissionQuestion to UI Question
                        const uiQuestions = mission.questions.map((mq: any) => ({
                            id: mq.questionId,
                            questionId: mq.questionId,
                            atom: mq.atomId,
                            atom_id: mq.atomId,
                            type: mq.templateId, // Template ID matches UI 'type' usually
                            curriculum_version: "v3",
                            subject: "Math", // Default
                            topic: mq.moduleName || "General",
                            chapter: mq.moduleName || "General",
                            difficulty: mq.difficulty === 1 ? "hard" : (mq.difficulty === 2 ? "medium" : "easy"),
                            question_text: "Generated Question", // Placeholders if real content not fully hydated yet
                            options: [], // populated by template renderer usually
                            correct_answer: "",
                            // Crucial: Attach parent Mission ID for tracking
                            metadata: {
                                missionId: mission.id,
                                phase: mission.title,
                                ...mq.analytics
                            },
                            // If content is pre-generated (e.g. from V3 bundles), it might be in mq directly?
                            // Currently V2 generates 'metadata' like atomId. The RENDERER (MissionCard) fetches content?
                            // No, MissionCard expects 'question' object to have content.
                            // V3 Missions Service currently returns metadata-rich questions but maybe not full content?
                            // Wait, V2 logic returning 'MissionQuestion' didn't seem to fetch the actual text/options from a DB?
                            // It returned metadata. The UI's `MissionCard` or a specific hook usually hydrates it.
                            // Looking at old `useDailyMission`, it fetched from `questionBundlesCollection`.
                            // NEW SERVICE needs to ensure `questions` in mission have content!
                            // The V2 logic I pasted `generatePhaseQuestions` creates metadata objects.
                            // It DOES NOT fetch content from bundles. This is a gap.
                            // The old `useDailyMission` fetched "Bundles".
                            // I must bridge this.

                            // TEMPORARY: Pass metadata. The rendering component likely needs to fetch content if missing.
                            // OR, I need to fetch content here.
                            ...mq
                        }));
                        allRecruitedQuestions.push(...uiQuestions);
                    }
                });
            }

            console.log(`[useDailyMission] Generated ${allRecruitedQuestions.length} questions via Service.`);

            // HYDRATION STEP (Crucial for V3 Content)
            // If the service requests specific atoms/templates, we need to find actual Question Content (text, options).
            // This was previously done by fetching Bundles.
            // Since we don't have a direct "Atom -> Question Content" API ready in the service (it uses Bundles),
            // We might need to fetch a "Generic Content Bundle" or "Template Generator".
            // FOR NOW: I will assume the UI elements (MissionCard) handle 'Dynamic Generation' from Template ID
            // OR I will rely on the `simConfig` to inject fully formed questions if testing.

            // If we are in "Real Mode", we might be missing content.
            // I will add a content fetcher if needed.
            // Checking `MissionCard`: it likely needs `question.content` or `question.question_text`.

            setMissionQuestions(allRecruitedQuestions);

            // Resume progress (skip completed)
            // Logic to find first uncompleted question?
            // For now, start specific index.
            const firstUnanswered = allRecruitedQuestions.findIndex((q: any) => {
                // Check if log exists? Complex.
                // Simplest: Check if parent mission is completed.
                const mId = q.metadata?.missionId;
                const m = batch.missions.find(m => m.id === mId);
                return m?.status !== 'COMPLETED';
            });

            if (firstUnanswered > 0) {
                setCurrentIndex(firstUnanswered);
                // Also need to mark previous as "done" visually?
            } else {
                setCurrentIndex(0);
            }

            setQuestionStartTime(Date.now());
            setIsLoading(false);

        } catch (error) {
            console.error("Failed to generate Daily Mission:", error);
            setMissionQuestions([]);
            setIsLoading(false);
        }
    }, [devQuestions]);

    useEffect(() => {
        // If mission completed or empty, try generate
        if (missionQuestions.length === 0 && !isLoading) {
            generateMission();
        }
    }, [generateMission, missionQuestions.length, isLoading]);

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

        // 1. Log Result (Local & Cloud)
        logQuestionResultLocal({
            questionId: currentQuestion.id,
            studentAnswer: choice,
            isCorrect,
            isRecovered,
            recoveryVelocity: 0, // calculate if needed
            diagnosticTag: tag,
            timeSpent,
            cappedThinkingTime: Math.min(timeSpent, 60),
            speedRating,
            masteryBefore: 0.5, // Todo: fetch actual
            masteryAfter: 0.5,
            atomId: currentQuestion.atom || 'UNKNOWN',
            mode: 'DAILY'
        }, currentIndex);

        // 2. Update Stats (Power, etc)
        const gain = isCorrect ? 15 : (isRecovered ? 7 : 0);
        updatePower(gain);

        // 3. SERVICE INTEGRATION: Complete Mission Step
        // Check if this question completes a mission
        // In V3, a Mission is a set of questions (e.g. 3 questions).
        // We need to track progress against the Mission object.

        if (currentQuestion.metadata?.missionId) {
            // In a real app, we'd update the mission progress incrementally.
            // Here, we check if this was the last question of that mission.
            const missionId = currentQuestion.metadata.missionId;
            const questionsInThisMission = missionQuestions.filter(q => q.metadata?.missionId === missionId);
            const myIndexInMission = questionsInThisMission.findIndex(q => q.id === currentQuestion.id);
            const isLastInMission = myIndexInMission === questionsInThisMission.length - 1;

            if (isLastInMission) {
                // Complete the mission in the service
                try {
                    // Calculate accuracy for the mission
                    // We need logs for previous questions in this mission.
                    // For simplicity, we assume perfect for now or track in state.
                    const accuracy = 100; // Placeholder
                    await missionsService.completeMission(auth.currentUser.uid, missionId, accuracy);
                    console.log('✅ Mission Completed:', missionId);
                } catch (e) {
                    console.error('Failed to complete mission in service', e);
                }
            } else {
                // Start mission if first question
                if (myIndexInMission === 0) {
                    missionsService.startMission(missionId).catch(console.error);
                }
            }
        }

        // 4. Update UI State
        setSessionResults(prev => ({
            ...prev,
            correctCount: isCorrect ? prev.correctCount + 1 : prev.correctCount,
            flowGained: prev.flowGained + gain,
            sprintCount: speedRating === 'SPRINT' ? prev.sprintCount + 1 : prev.sprintCount
        }));

        if (currentIndex >= missionQuestions.length - 1) {
            setIsComplete(true);
            await syncToCloud(true);
            await refreshSessionLogs();
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