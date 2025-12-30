// @ts-nocheck
import { useState, useEffect, useCallback } from 'react';
import { useNinja } from '../context/NinjaContext';
import { Question } from '../types';
import { auth } from '../services/db/firebase';
import { missionsService } from '../services/missions';
import { logger } from '../services/logging';
import { questionBundlesCollection } from '../services/db/firestore';
import { getDocs, query, limit } from 'firebase/firestore';

/**
 * useDailyMission Hook (V3.2 - Content Re-Hydration)
 * 
 * fixes 'Skeleton Question' issue by aggressively fetching content 
 * for algorithmically generated plans.
 */
export function useDailyMission(devQuestions: Question[] | null = null) {
    const { logQuestionResultLocal, updatePower, syncToCloud, refreshSessionLogs } = useNinja();
    const [missionQuestions, setMissionQuestions] = useState<Question[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(false); // Start false to allow trigger
    const [isComplete, setIsComplete] = useState(false);

    const [questionStartTime, setQuestionStartTime] = useState(Date.now());
    const [sessionResults, setSessionResults] = useState({
        correctCount: 0,
        flowGained: 0,
        hurdlesTargeted: [] as string[],
        sprintCount: 0
    });

    // --- CONTENT FETCHER ---
    const hydrateQuestions = async (skeletons: any[], isSimulation: boolean): Promise<any[]> => {
        if (skeletons.length === 0) return [];

        // If the skeletons already have content (Simulation Bundle Mode), pass them through.
        const needsHydration = skeletons.some(q => !q.content && !q.question_text);
        if (!needsHydration) return skeletons;

        // ALLOWED TEMPLATES (Daily Diagnostic Filter)
        // User requested restricting to specific stable templates.
        const ALLOWED_TEMPLATES = [
            'MATCHING',
            'MCQ_CONCEPT',
            'MCQ_SKILL',
            'NUMERIC_INPUT',
            'CLASSIFY_SORT',
            'DRAG_DROP_MATCH',
            'NUMBER_LINE_PLACE',
            'NUMBER_LINE' // Handle alias
        ];

        console.log('[useDailyMission] Hydrating content from Firestore...');

        try {
            // Fetch a broad set of recent bundles (Cache this in a real app)
            // We fetch 5 bundles to find matching items.
            const q = query(questionBundlesCollection, limit(5));
            const snap = await getDocs(q);

            const allAvailableItems: any[] = [];
            snap.docs.forEach(doc => {
                const items = doc.data().items || [];
                allAvailableItems.push(...items);
            });

            console.log(`[useDailyMission] Found ${allAvailableItems.length} candidate items in bundles.`);

            // Track used content to avoid duplication
            const usedContentIds = new Set<string>();

            const hydratedQuestions = skeletons.map((skel, idx) => {
                // FILTER: Remove experimental templates unless in Simulation Mode
                const sType = (skel.type || skel.templateId || '').toUpperCase();
                if (!isSimulation && !ALLOWED_TEMPLATES.includes(sType)) {
                    // console.log(`[Hydrator] Skipped experimental template: ${sType}`);
                    return null;
                }

                if (skel.content || skel.question_text) return skel;

                // 1. Try Strict Atom Match (Must also match requested Template Type)
                let match = allAvailableItems.find(i => {
                    // Skip if already used
                    if (usedContentIds.has(i.item_id || i.id)) return false;

                    const saneAtom = i.atom_id === skel.atom || i.atom === skel.atom;
                    if (!saneAtom) return false;

                    const iType = (i.type || i.template_id || '').toUpperCase();
                    // Match type
                    return iType === sType;
                });

                // 2. Try Template Match (Random Selection from Unused)
                if (!match) {
                    const candidates = allAvailableItems.filter(i => {
                        if (usedContentIds.has(i.item_id || i.id)) return false;

                        const iType = (i.type || i.template_id || '').toUpperCase();

                        // Check Type
                        if (iType !== sType) return false;

                        // VALIDATION
                        const cfg = i.interaction?.config || i.content?.interaction?.config || {};

                        if (iType === 'MATCHING') {
                            const hasPairs = (cfg.left && cfg.right) || (cfg.pairs && cfg.pairs.length > 0);
                            if (!hasPairs) return false;
                        }

                        if (iType === 'CLASSIFY_SORT' || iType === 'DRAG_DROP_MATCH') {
                            const hasBuckets = (cfg.buckets && cfg.buckets.length > 0) || (cfg.bins && cfg.bins.length > 0);
                            const hasItems = (cfg.items && cfg.items.length > 0) || (cfg.cards && cfg.cards.length > 0);

                            if (!hasBuckets || !hasItems) {
                                return false;
                            }
                        }

                        return true;
                    });

                    if (candidates.length > 0) {
                        // Pick random from unused
                        match = candidates[Math.floor(Math.random() * candidates.length)];
                    }
                }

                if (match) {
                    const contentId = match.item_id || match.id;
                    usedContentIds.add(contentId);

                    return {
                        ...skel,
                        ...match,
                        id: skel.id,
                        content_hash: Math.random().toString(36)
                    };
                }

                // If NO unique content found, return null to signal removal
                return null;
            }).filter(Boolean); // Remove nulls (Truncate mission)

            console.log(`[useDailyMission] Final Ready Questions: ${hydratedQuestions.length} (Truncated duplicates/experimental)`);
            return hydratedQuestions;

        } catch (e) {
            console.error('Hydration failed', e);
            return skeletons;
        }
    };

    const generateMission = useCallback(async () => {
        if (devQuestions && devQuestions.length > 0) {
            setMissionQuestions(devQuestions);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        try {
            const user = auth.currentUser;
            if (!user) {
                setIsLoading(false);
                return;
            }

            const storedSimConfig = localStorage.getItem('BLUE_NINJA_SIM_CONFIG');
            const simConfig = storedSimConfig ? JSON.parse(storedSimConfig) : undefined;
            const isSimulation = !!simConfig;

            if (simConfig) console.log('🧪 Simulation Active', simConfig);

            // 1. Generate Plan (Skeleton or Bundle)
            const batch = await missionsService.generateDailyMissions({
                userId: user.uid,
                date: new Date().toISOString().split('T')[0]
            }, simConfig);

            let extractedQuestions: any[] = [];
            if (batch && batch.missions) {
                batch.missions.forEach(mission => {
                    if (mission.questions) {
                        mission.questions.forEach((mq: any) => {
                            const uiQ = {
                                id: mq.questionId || mq.id,
                                questionId: mq.questionId,
                                atom: mq.atomId,
                                type: mq.templateId || mq.type,
                                difficulty: mq.difficulty === 1 ? "hard" : (mq.difficulty === 2 ? "medium" : "easy"),
                                metadata: {
                                    missionId: mission.id,
                                    phase: mission.title,
                                    ...mq.analytics
                                },
                                status: mission.status,
                                ...mq
                            };
                            extractedQuestions.push(uiQ);
                        });
                    }
                });
            }

            // 2. Hydrate Content
            const fullyLoadedQuestions = await hydrateQuestions(extractedQuestions, isSimulation);

            console.log(`[useDailyMission] Final Ready Questions: ${fullyLoadedQuestions.length}`);
            setMissionQuestions(fullyLoadedQuestions);

            const firstUnanswered = fullyLoadedQuestions.findIndex((q: any) => q.status !== 'COMPLETED');
            const startIndex = firstUnanswered > 0 ? firstUnanswered : 0;
            console.log(`[useDailyMission] Resuming Daily Flight at Index: ${startIndex} (Questions Completed: ${firstUnanswered > 0 ? firstUnanswered : 0})`);
            setCurrentIndex(startIndex);

            setQuestionStartTime(Date.now());
            setIsLoading(false);

        } catch (error) {
            console.error("Failed to generate Daily Mission:", error);
            setMissionQuestions([]);
            setIsLoading(false);
        }
    }, [devQuestions]);

    useEffect(() => {
        if (missionQuestions.length === 0 && !isLoading) {
            generateMission();
        }
    }, []);

    useEffect(() => {
        if (!devQuestions && missionQuestions.length === 0 && !isLoading) {
            generateMission();
        }
    }, [devQuestions]);


    const submitDailyAnswer = async (
        isCorrect: boolean,
        choice: string | number,
        isRecovered: boolean,
        tag: string,
        timeSpent: number,
        speedRating: string
    ) => {
        if (!auth.currentUser) return;
        if (currentIndex >= missionQuestions.length) return;
        const currentQuestion = missionQuestions[currentIndex];

        logQuestionResultLocal({
            questionId: currentQuestion.id,
            studentAnswer: choice,
            isCorrect,
            isRecovered,
            recoveryVelocity: 0,
            diagnosticTag: tag,
            timeSpent,
            cappedThinkingTime: Math.min(timeSpent, 60),
            speedRating,
            masteryBefore: 0.5,
            masteryAfter: 0.5,
            atomId: currentQuestion.atom || 'UNKNOWN',
            mode: 'DAILY'
        }, currentIndex);

        const gain = isCorrect ? 15 : (isRecovered ? 7 : 0);
        updatePower(gain);

        if (currentQuestion.metadata?.missionId) {
            const missionId = currentQuestion.metadata.missionId;
            const questionsInThisMission = missionQuestions.filter(q => q.metadata?.missionId === missionId);
            const myIndexInMission = questionsInThisMission.findIndex(q => q.id === currentQuestion.id);
            const isLastInMission = myIndexInMission === questionsInThisMission.length - 1;

            if (isLastInMission) {
                try {
                    await missionsService.completeMission(auth.currentUser.uid, missionId, 100);
                } catch (e) {
                    console.error('Failed to complete mission in service', e);
                }
            } else if (myIndexInMission === 0) {
                missionsService.startMission(missionId).catch(console.error);
            }
        }

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