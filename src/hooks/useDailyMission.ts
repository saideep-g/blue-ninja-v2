// @ts-nocheck
import { useState, useEffect, useCallback, useRef } from 'react';
import { useNinja } from '../context/NinjaContext';
import { Question } from '../types';
import { auth, db } from '../services/db/firebase';
import { missionsService } from '../services/missions';
import { logger } from '../services/logging';
import { questionBundlesCollection } from '../services/db/firestore';
import { getDocs, query, limit, doc, getDoc, where, orderBy, collection } from 'firebase/firestore';

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

    // VALIDATION: Global session history to prevent duplicates across multiple flights
    const servedIdsRef = useRef<Set<string>>(new Set());
    const loggedDailyQuestions = useRef<Set<string>>(new Set()); // Dedup per question execution

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
        if (!needsHydration) {
            // Register these IDs as served to prevent future duplicates
            skeletons.forEach(q => servedIdsRef.current.add(q.id));
            return skeletons;
        }

        // ALLOWED TEMPLATES (Daily Diagnostic Filter)
        // User requested restricting to specific stable templates.
        const ALLOWED_TEMPLATES = [
            'NUMERIC_AUTO',
            'MCQ_SIMPLIFIED',
            'NUMERIC_INPUT',
            // 'MATCHING',
            // 'MCQ_CONCEPT',
            // 'MCQ_SKILL',
            // 'CLASSIFY_SORT',
            // 'DRAG_DROP_MATCH',
            // 'NUMBER_LINE_PLACE',
            // 'NUMBER_LINE'
        ];

        console.log('[useDailyMission] Hydrating content from Firestore...');
        console.log('[DEBUG_HYDRATION] Templates Allowed:', ALLOWED_TEMPLATES);
        console.log('[DEBUG_HYDRATION] Input Skeletons:', skeletons.length, skeletons.map(s => `${s.id} (${s.type || s.templateId})`));

        try {
            // Fetch Math Bundles (Grade 7 Priority) - Using direct collection ref to match StudyEraDashboard
            const bundlesRef = collection(db, 'question_bundles');
            const q = query(
                bundlesRef,
                where('subject', '==', 'math'),
                // where('grade', '==', 7), // Optional: Filter by grade if index exists
                limit(5)
            );
            const snap = await getDocs(q);

            console.log(`[useDailyMission] Found ${snap.docs.length} bundles. IDs:`, snap.docs.map(d => d.id));

            const allAvailableItems: any[] = [];

            // Parallel fetch of optimized content
            await Promise.all(snap.docs.map(async (bundleDoc) => {
                try {
                    const dataRef = doc(db, 'question_bundle_data', bundleDoc.id);
                    const dataSnap = await getDoc(dataRef);

                    if (dataSnap.exists()) {
                        const data = dataSnap.data();
                        if (data.questions) {
                            // Helper to normalize question objects
                            const questions = Object.values(data.questions).map((q: any) => {
                                let normalized = {
                                    ...q,
                                    template_id: q.template_id || q.type || 'MCQ_SIMPLIFIED',
                                    item_id: q.id,
                                    atom_id: q.atom_id || q.atom
                                };

                                // NORMALIZE SIMPLIFIED FORMAT -> RICH FORMAT
                                // If 'content' is missing, likely simplified format
                                if (!normalized.content && normalized.question) {

                                    // 1. NUMERIC AUTO
                                    if (normalized.template_id === 'NUMERIC_AUTO' || normalized.template_id === 'NUMERIC_INPUT') {
                                        normalized.content = {
                                            prompt: { text: normalized.question },
                                            instruction: normalized.instruction
                                        };
                                        normalized.answerKey = {
                                            value: normalized.answer,
                                            tolerance: normalized.tolerance || 0.01
                                        };
                                        normalized.interaction = {
                                            config: { unit: normalized.unit }
                                        };
                                    }

                                    // 2. MCQ (Default if options exist)
                                    else if (normalized.options) {
                                        normalized.template_id = 'MCQ_SIMPLIFIED';

                                        const rawOpts = Array.isArray(normalized.options) ? normalized.options : [];
                                        const mappedOptions = rawOpts.map((o: any, i: number) => ({
                                            id: String(i + 1),
                                            text: typeof o === 'string' ? o : o.text,
                                            isCorrect: typeof o === 'string' ? o === normalized.answer : o.isCorrect
                                        }));

                                        // Special "Both A and B" handling (From StudentEraDashboard)
                                        const specialRegex = /both.*and|all of the|none of the|a and b|options a|neither|a and c|b and c/i;
                                        let finalOptions = mappedOptions;

                                        if (mappedOptions.some((o: any) => specialRegex.test(o.text))) {
                                            const special = mappedOptions.filter((o: any) => specialRegex.test(o.text));
                                            const normal = mappedOptions.filter((o: any) => !specialRegex.test(o.text));
                                            finalOptions = [...normal, ...special];
                                        } else {
                                            finalOptions = mappedOptions.sort(() => 0.5 - Math.random());
                                        }

                                        normalized.content = { prompt: { text: normalized.question } };
                                        normalized.interaction = { config: { options: finalOptions } };
                                    }
                                }

                                return normalized;
                            });
                            allAvailableItems.push(...questions);
                        }
                    }
                } catch (err) {
                    console.error(`[useDailyMission] Failed to load bundle ${bundleDoc.id}`, err);
                }
            }));

            // 0. Filter Available Items by Allowed Templates Upfront
            const validAvailableItems = allAvailableItems.filter(i => {
                const iType = (i.template_id || i.type || '').toUpperCase();
                // STRICT FILTER: Ignore simulation mode bypass to ensure only allowed templates (NUMERIC_AUTO) are used
                const isAllowed = ALLOWED_TEMPLATES.includes(iType);
                if (!isAllowed && idx === 0) { // Log once
                    // console.log(`[Hydration] Filtered out type: ${iType} (Atom: ${i.atom_id})`);
                }
                return isAllowed;
            });

            console.log(`[useDailyMission] Valid Candidate Items (Filtered): ${validAvailableItems.length}`);
            if (validAvailableItems.length > 0) {
                console.log('[DEBUG_HYDRATION] Sample Valid Item:', validAvailableItems[0].atom_id, validAvailableItems[0].template_id);
            }

            // Track used content to avoid duplication
            // INITIALIZE with ids served in previous flights in this session
            const usedContentIds = new Set<string>(servedIdsRef.current);

            const hydratedQuestions = skeletons.map((skel, idx) => {
                if (skel.content || skel.question_text) {
                    usedContentIds.add(skel.id);
                    return skel;
                }

                // DEBUG: Trace first skeleton matching
                if (idx === 0) {
                    console.log(`[DEBUG_HYDRATION] Tracing Match for Skeleton 0: ID=${skel.id}, ATOM=${skel.atom}`);
                }

                // 1. Try Strict Atom Match within Valid Bundle Content
                let match = validAvailableItems.find(i => {
                    if (usedContentIds.has(i.item_id || i.id)) return false;
                    return i.atom_id === skel.atom || i.atom === skel.atom;
                });

                // 2. Fallback: If no strict atom match, just pick ANY valid content
                // This solves the issue where "Plan" atoms (Strategies) don't match "Bundle" atoms (Chapters)
                if (!match) {
                    if (idx === 0) console.log(`   -> Strict Match Failed. Attempting Fallback...`);

                    // Find first unused valid item
                    match = validAvailableItems.find(i => !usedContentIds.has(i.item_id || i.id));

                    if (match && idx === 0) {
                        console.log(`   -> Fallback Match FOUND: ${match.item_id} (${match.template_id})`);
                    }
                }

                if (match) {
                    const contentId = match.item_id || match.id;
                    usedContentIds.add(contentId);

                    return {
                        ...skel,
                        ...match,
                        id: skel.id,
                        metadata: {
                            ...skel.metadata,
                            originalAtom: skel.atom,
                            matchedAtom: match.atom_id,
                            isFallback: !match.atom_id || (match.atom_id !== skel.atom && match.atom !== skel.atom)
                        },
                        content_hash: Math.random().toString(36)
                    };
                }

                return null;
            }).filter(Boolean); // Remove nulls (Truncate mission)

            console.log(`[useDailyMission] Final Ready Questions: ${hydratedQuestions.length} (From ${skeletons.length} Skeletons)`);

            // Sync local used status to global ref
            usedContentIds.forEach(id => servedIdsRef.current.add(id));

            return hydratedQuestions;

        } catch (e) {
            console.error('Hydration failed', e);
            return skeletons;
        }
    };

    const generateMission = useCallback(async (manualOverrides?: any) => {
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

            // --- PERSISTENCE GUARD (LocalStorage Cache) ---
            const todayKey = new Date(Date.now() + 90 * 60 * 1000).toISOString().split('T')[0];
            const cacheKey = `daily_mission_cache_v13_${user.uid}_${todayKey}`;
            const cachedData = localStorage.getItem(cacheKey);

            let fullyLoadedQuestions: any[] = [];
            let loadedFromCache = false;

            if (cachedData && !manualOverrides) {
                try {
                    const parsed = JSON.parse(cachedData);
                    if (parsed && Array.isArray(parsed.questions) && parsed.questions.length > 0) {
                        console.log('⚡ [useDailyMission] Hydrating from Local Cache');
                        fullyLoadedQuestions = parsed.questions;
                        loadedFromCache = true;
                    }
                } catch (e) {
                    console.error("Cache parse error", e);
                    localStorage.removeItem(cacheKey);
                }
            }

            if (!loadedFromCache) {
                const storedSimConfig = localStorage.getItem('BLUE_NINJA_SIM_CONFIG');
                const simConfig = storedSimConfig ? JSON.parse(storedSimConfig) : undefined;
                const isSimulation = !!simConfig || !!manualOverrides;

                if (simConfig) console.log('🧪 Simulation Active', simConfig);
                if (manualOverrides) console.log('🔄 Manual Override / New Session', manualOverrides);

                const finalOptions = { ...simConfig, ...manualOverrides };

                if (manualOverrides?.bypassHistory) {
                    setIsComplete(false);
                    setCurrentIndex(0);
                    setMissionQuestions([]);
                }

                const batch = await missionsService.generateDailyMissions({
                    userId: user.uid,
                    date: todayKey
                }, finalOptions);

                let extractedQuestions: any[] = [];
                if (batch && batch.missions) {
                    const sortedMissions = [...batch.missions].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

                    sortedMissions.forEach(mission => {
                        if (mission.questions) {
                            mission.questions.forEach((mq: any) => {
                                const qId = mq.questionId || mq.id;
                                const isQCompleted = mission.completedQuestionIds?.includes(qId);
                                const uiQ = {
                                    ...mq,
                                    id: qId,
                                    questionId: mq.questionId,
                                    atom: mq.atomId,
                                    type: mq.templateId || mq.type,
                                    difficulty: mq.difficulty === 1 ? "hard" : (mq.difficulty === 2 ? "medium" : "easy"),
                                    metadata: {
                                        missionId: mission.id,
                                        phase: mission.title,
                                        ...mq.analytics
                                    },
                                    status: isQCompleted ? 'COMPLETED' : mission.status
                                };
                                extractedQuestions.push(uiQ);
                            });
                        }
                    });
                }

                fullyLoadedQuestions = await hydrateQuestions(extractedQuestions, isSimulation);

                // Save to Cache
                if (fullyLoadedQuestions.length > 0) {
                    localStorage.setItem(cacheKey, JSON.stringify({
                        date: todayKey,
                        questions: fullyLoadedQuestions
                    }));
                }
            }

            console.log(`[useDailyMission] Final Ready Questions: ${fullyLoadedQuestions.length}`);
            setMissionQuestions(fullyLoadedQuestions);

            const firstUnanswered = fullyLoadedQuestions.findIndex((q: any) => q.status !== 'COMPLETED');

            if (firstUnanswered === -1 && fullyLoadedQuestions.length > 0) {
                console.log('[useDailyMission] All questions completed! Setting Complete State.');
                setIsComplete(true);
                setCurrentIndex(fullyLoadedQuestions.length);
            } else {
                const startIndex = firstUnanswered > 0 ? firstUnanswered : 0;
                console.log(`[useDailyMission] Resuming Daily Flight at Index: ${startIndex}`);
                setCurrentIndex(startIndex);
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
        speedRating: string,
        shouldAdvance = true // Log Separation
    ) => {
        if (!auth.currentUser) return;
        if (currentIndex >= missionQuestions.length) return;
        const currentQuestion = missionQuestions[currentIndex];

        // 1. Log (If not already logged)
        if (!loggedDailyQuestions.current.has(currentQuestion.id)) {
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
                mode: 'DAILY',
                selectionRationale: currentQuestion.metadata?.selectionRationale
            }, currentIndex);

            const gain = isCorrect ? 15 : (isRecovered ? 7 : 0);
            updatePower(gain);

            // Only update session flow metrics once per question
            setSessionResults(prev => ({
                ...prev,
                correctCount: isCorrect ? prev.correctCount + 1 : prev.correctCount,
                flowGained: prev.flowGained + gain,
                sprintCount: speedRating === 'SPRINT' ? prev.sprintCount + 1 : prev.sprintCount
            }));

            // Log completion in mission tracking
            if (currentQuestion.metadata?.missionId) {
                const missionId = currentQuestion.metadata.missionId;
                missionsService.markQuestionComplete(auth.currentUser.uid, missionId, currentQuestion.id).catch(console.error);
            }

            loggedDailyQuestions.current.add(currentQuestion.id);
        }

        // 2. Advance (If requested)
        if (shouldAdvance) {
            // Handle Mission Completion logic only on advance? Or on log? 
            // Usually on log is safer for data, but advancement handles the UI state.
            // We do mission status application here if it affects navigation flow (e.g. End of mission).

            if (currentQuestion.metadata?.missionId) {
                const missionId = currentQuestion.metadata.missionId;
                const questionsInThisMission = missionQuestions.filter(q => q.metadata?.missionId === missionId);
                const myIndexInMission = questionsInThisMission.findIndex(q => q === currentQuestion);
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

            if (currentIndex >= missionQuestions.length - 1) {
                setIsComplete(true);
                await syncToCloud(true);
                await refreshSessionLogs();
            } else {
                setCurrentIndex(prev => prev + 1);
                setQuestionStartTime(Date.now());
            }
        }
    };

    const startNewSession = () => {
        loggedDailyQuestions.current.clear();
        generateMission({ bypassHistory: true });
    };

    return {
        currentQuestion: missionQuestions[currentIndex],
        currentIndex,
        totalQuestions: missionQuestions.length,
        isLoading,
        isComplete,
        sessionResults,
        submitDailyAnswer,
        startNewSession,
        generateMission,
        questions: missionQuestions
    };
}