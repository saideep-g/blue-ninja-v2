import { collection, query, where, limit, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from './db/firebase';
import { Question } from '../types/models';

export interface EraSession {
    subjectId: string;
    questions: Question[];
    currentIndex: number;
    score: number;
    completedQuestionIds: string[];
    date: string;
    version: number;
}

const SESSION_VERSION = 3; // Bumped to force refresh for SVG updates
const SESSION_CACHE_PREFIX = 'era_session_v1_'; // Prefix can stay same or change, checking prop is safer

export const eraSessionService = {
    /**
     * persistentFetch:
     * Checks localStorage for an active session for today.
     * If found, returns it.
     * If not, fetches new questions from Firestore and saves a new session.
     */
    async startOrResumeSession(userId: string, subjectId: string): Promise<EraSession> {
        const today = new Date().toISOString().split('T')[0];
        const cacheKey = `${SESSION_CACHE_PREFIX}${userId}_${subjectId}_${today}`;

        // 1. Try Local Cache
        try {
            const cached = localStorage.getItem(cacheKey);
            if (cached) {
                const session = JSON.parse(cached) as EraSession;

                // Version Check
                if (session.version !== SESSION_VERSION) {
                    console.log(`[EraSession] Cache version mismatch (Cached: ${session.version}, Current: ${SESSION_VERSION}). Invalidating.`);
                    localStorage.removeItem(cacheKey);
                }
                // Safety check: ensure questions exist
                else if (session.questions && session.questions.length > 0) {
                    console.log(`[EraSession] Resumed ${subjectId} session from cache.`);
                    return session;
                }
            }
        } catch (e) {
            console.error('[EraSession] Cache read failed', e);
        }

        // 2. Fetch Fresh Data
        console.log(`[EraSession] generating new ${subjectId} session...`);
        const questions = await this.fetchQuestionsInternal(subjectId);

        // 3. Create Session
        const newSession: EraSession = {
            subjectId,
            questions,
            currentIndex: 0,
            score: 0,
            completedQuestionIds: [],
            date: today,
            version: SESSION_VERSION
        };

        // 4. Save to Cache
        try {
            localStorage.setItem(cacheKey, JSON.stringify(newSession));
        } catch (e) {
            console.error('[EraSession] Cache save failed', e);
        }

        return newSession;
    },

    /**
     * Updates the local progress (index, score)
     */
    updateProgress(userId: string, subjectId: string, updates: Partial<EraSession>) {
        const today = new Date().toISOString().split('T')[0];
        const cacheKey = `${SESSION_CACHE_PREFIX}${userId}_${subjectId}_${today}`;

        try {
            const cached = localStorage.getItem(cacheKey);
            if (cached) {
                const session = JSON.parse(cached) as EraSession;
                const updatedSession = { ...session, ...updates };
                localStorage.setItem(cacheKey, JSON.stringify(updatedSession));
            }
        } catch (e) {
            console.error('[EraSession] Progress update failed', e);
        }
    },

    /**
     * Clears the session (e.g. after full completion)
     */
    clearSession(userId: string, subjectId: string) {
        const today = new Date().toISOString().split('T')[0];
        const cacheKey = `${SESSION_CACHE_PREFIX}${userId}_${subjectId}_${today}`;
        localStorage.removeItem(cacheKey);
    },

    /**
     * INTERNAL: The exact logic migrated from StudyEraDashboard
     */
    async fetchQuestionsInternal(targetSubjectId: string): Promise<Question[]> {
        const querySubject = targetSubjectId.toLowerCase();
        let foundQuestions: Question[] = [];

        try {
            // Strategy A: Bundles (Priority)
            const bundlesRef = collection(db, 'question_bundles');
            // Hardcoded Grade 7 priority as per previous logic
            const qBundle = query(bundlesRef, where('subject', '==', querySubject), where('grade', '==', 7), limit(1));
            const bundleSnap = await getDocs(qBundle);

            if (!bundleSnap.empty) {
                const bundleDoc = bundleSnap.docs[0];
                const dataRef = doc(db, 'question_bundle_data', bundleDoc.id);
                const dataSnap = await getDoc(dataRef);

                if (dataSnap.exists() && dataSnap.data().questions) {
                    const rawQuestions = dataSnap.data().questions;
                    foundQuestions = Object.values(rawQuestions).map((sq: any) => {
                        // 1. NUMERIC AUTO / INPUT (Preserve Type OR Infer if no options)
                        const isNumericType = sq.type === 'NUMERIC_AUTO' || sq.type === 'NUMERIC_INPUT' || sq.template_id === 'NUMERIC_AUTO';
                        const isInferredNumeric = (!sq.options || sq.options.length === 0) && (sq.answer || sq.correct_answer);

                        if (isNumericType || isInferredNumeric) {
                            return {
                                id: sq.id,
                                type: 'NUMERIC_AUTO',
                                options: [],
                                content: {
                                    prompt: { text: sq.question },
                                    instruction: sq.instruction || "Calculate the answer"
                                },
                                visualType: sq.visualType,
                                visualData: sq.visualData,
                                imageUrl: sq.imageUrl,
                                answerKey: {
                                    value: sq.answer || sq.correct_answer,
                                    tolerance: sq.tolerance || 0.01
                                },
                                interaction: {
                                    config: { unit: sq.unit, placeholder: 'Enter answer...' }
                                },
                                subject: querySubject,
                                explanation: sq.explanation
                            } as unknown as Question;
                        }

                        // 2. MCQ (Default)
                        const mappedOptions = sq.options?.map((o: string, i: number) => ({
                            id: String(i + 1),
                            text: o,
                            isCorrect: o === sq.answer
                        })) || [];

                        const specialRegex = /both.*and|all of the|none of the|a and b|options a|neither|a and c|b and c/i;
                        const hasSpecial = mappedOptions.some((o: any) => specialRegex.test(o.text));

                        let finalOptions = mappedOptions;
                        if (!hasSpecial) {
                            finalOptions = mappedOptions.sort(() => 0.5 - Math.random());
                        } else {
                            const special = mappedOptions.filter((o: any) => specialRegex.test(o.text));
                            const normal = mappedOptions.filter((o: any) => !specialRegex.test(o.text));
                            finalOptions = [...normal, ...special];
                        }

                        // Determine Correct ID after shuffle/construction
                        const correctObj = finalOptions.find((o: any) => o.isCorrect);
                        const correctId = correctObj ? correctObj.id : null;

                        return {
                            id: sq.id,
                            type: 'MCQ_SIMPLIFIED',
                            text: sq.question,
                            content: { prompt: { text: sq.question }, instruction: sq.instruction || "Select the best answer" },
                            interaction: {
                                config: { options: finalOptions }
                            },
                            correctOptionId: correctId,
                            answerKey: { correctOptionId: correctId },
                            subject: querySubject,
                            explanation: sq.explanation,
                        } as unknown as Question;
                    });

                    // Shuffle and limit to 20
                    if (foundQuestions.length > 20) foundQuestions = foundQuestions.sort(() => 0.5 - Math.random()).slice(0, 20);
                }
            }

            // Strategy B: Direct Questions Collection (Fallback)
            if (foundQuestions.length === 0) {
                const qDirect = query(collection(db, 'questions'), where('subject', '==', querySubject), limit(10));
                const directSnap = await getDocs(qDirect);
                if (!directSnap.empty) foundQuestions = directSnap.docs.map(d => ({ id: d.id, ...d.data() } as Question));
            }

        } catch (e) {
            console.error("Failed to fetch questions", e);
        }

        // Fallback Mock
        if (foundQuestions.length === 0) {
            foundQuestions = [{
                id: 'mock_fail_1', type: 'MCQ_SIMPLIFIED',
                content: { prompt: { text: "No questions found. Check internet or admin uploads." } },
                interaction: { config: { options: [{ text: 'Okay', id: '1', isCorrect: true }] } },
                subject: querySubject
            } as any];
        }

        // Shuffle one last time if not already handled
        // (Bundle logic handles it, Direct logic doesn't, so safe to shuffle here if length > 1)
        // return foundQuestions.sort(() => Math.random() - 0.5);
        return foundQuestions; // Preserving internal sort
    }
};
