import { functions } from './db/firebase';
import { httpsCallable } from 'firebase/functions';
import { updateDoc, arrayUnion, setDoc } from 'firebase/firestore';
import { getMonthlyLogRef, getAdminMonitoringLogRef } from './db/firestore';

export interface AIEvaluationResult {
    score: number;
    results: {
        criterion: string;
        passed: boolean;
        feedback: string;
    }[];
    summary: string;
}

export interface EvaluationResponse {
    isSuccess: boolean;
    data?: AIEvaluationResult;
    error?: string;
    metrics?: {
        latency: number;
        inputTokens?: number;
        outputTokens?: number;
    };
}

export const aiEvaluationService = {
    // Deduplication map
    pendingRequests: new Map<string, Promise<EvaluationResponse>>(),

    /**
     * Calls the Cloud Function to evaluate a short answer.
     */
    async evaluateShortAnswer(
        userId: string,
        studentName: string,
        question: any,
        studentAnswer: string
    ): Promise<EvaluationResponse> {
        // Create a unique key for this request to prevent duplicates
        const requestKey = `${userId}-${question.id}-${studentAnswer.length}`; // Use answer length to allow retries if answer changes

        if (this.pendingRequests.has(requestKey)) {
            console.log(`[AIEvaluation] Returned cached promise for ${requestKey}`);
            return this.pendingRequests.get(requestKey)!;
        }

        const evaluationPromise = (async () => {
            const startTime = Date.now();
            const evaluateFn = httpsCallable(functions, 'evaluateShortAnswer');

            try {
                const result = await evaluateFn({
                    question: question.question_text || question.content?.prompt?.text || question.question || 'Question Text Missing',
                    question_id: question.id,
                    subject: question.subject || question.metadata?.subject || question.bundle?.subject || 'General',
                    student_answer: studentAnswer,
                    evaluation_criteria: question.evaluation_criteria || [],
                    max_points: question.max_points || 3,
                    student_name: studentName,
                    user_id: userId
                });

                const data = result.data as any;
                const latency = Date.now() - startTime;

                // Client-side logging restored to capture true E2E latency
                this.logInteraction(userId, studentName, question, studentAnswer, data, true, latency);

                return {
                    isSuccess: true,
                    data: data.evaluation, // Assuming Cloud Function wraps it this way
                    metrics: {
                        latency,
                        inputTokens: data.usage?.input_tokens,
                        outputTokens: data.usage?.output_tokens
                    }
                };
            } catch (error: any) {
                const latency = Date.now() - startTime;
                console.error('[AIEvaluation] Error:', error);

                // Log failure on client side too
                this.logInteraction(userId, studentName, question, studentAnswer, null, false, latency, error.message).catch(err =>
                    console.warn('[AIEvaluation] Background failure logging warning:', err)
                );

                return {
                    isSuccess: false,
                    error: error.message || 'Unknown evaluation error'
                };
            }
        })();

        this.pendingRequests.set(requestKey, evaluationPromise);

        try {
            return await evaluationPromise;
        } finally {
            this.pendingRequests.delete(requestKey);
        }
    },

    /**
     * Logs the interaction to both student monthly logs and admin monitoring.
     */
    async logInteraction(
        userId: string,
        studentName: string,
        question: any,
        studentAnswer: string,
        aiResponse: any,
        isSuccess: boolean,
        latency: number,
        errorMessage?: string
    ) {
        const now = new Date();
        const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        // Quarter Key logic: JAN-MAR, APR-JUN, JUL-SEP, OCT-DEC
        const quarter = Math.floor(now.getMonth() / 3);
        const quarters = ['JAN-MAR', 'APR-JUN', 'JUL-SEP', 'OCT-DEC'];
        const quarterKey = `${now.getFullYear()}-${quarters[quarter]}`;

        const logEntry = {
            date: now.toISOString(),
            timestamp: now.getTime(),
            questionId: question.id || 'unknown',
            questionText: question.question_text || question.content?.prompt?.text || question.question || 'No Question Text',
            subject: question.subject || question.metadata?.subject || question.bundle?.subject || 'General',
            questionType: 'SHORT_ANSWER',
            inputText: studentAnswer || '',
            outputText: aiResponse ? JSON.stringify(aiResponse) : null,
            aiFeedback: aiResponse?.evaluation || null,
            score: aiResponse?.evaluation?.score ?? 0, // Use ?? for 0
            isCorrect: Boolean(aiResponse?.evaluation?.score === (question.max_points || 3)),
            responseTime: latency || 0,
            inputTokensCount: aiResponse?.usage?.input_tokens ?? 0,
            outputTokensCount: aiResponse?.usage?.output_tokens ?? 0,
            thoughtsTokenCount: aiResponse?.usage?.thoughts_tokens ?? 0,
            isSuccess: Boolean(isSuccess), // Ensure boolean
            isValid: !!aiResponse?.evaluation,
            errorMessage: errorMessage || null, // null instead of undefined
            studentId: userId || 'anonymous',
            studentName: studentName || 'Student'
        };

        // 1. Student Monthly Log (Personal - should allow write)
        try {
            const studentLogRef = getMonthlyLogRef(userId, monthKey);
            await setDoc(studentLogRef, {
                entries: arrayUnion(logEntry),
                lastUpdated: now.toISOString()
            }, { merge: true });
        } catch (e) {
            console.warn('[AIEvaluation] Student logging failed:', e);
        }

        // 2. Admin Monitoring Log (System - might fail for students due to permissions)
        try {
            const adminLogRef = getAdminMonitoringLogRef(quarterKey);
            await setDoc(adminLogRef, {
                entries: arrayUnion(logEntry),
                lastUpdated: now.toISOString()
            }, { merge: true });
        } catch (e) {
            // Check if permission error, suppress it for students so UI doesn't look broken
            // But log to console for debugging
            if ((e as any).code === 'permission-denied') {
                console.log('[AIEvaluation] Admin logging skipped (permission denied)');
            } else {
                console.warn('[AIEvaluation] Admin logging failed:', e);
            }
        }
    },

    /**
     * Logs a manual/self-evaluation.
     */
    async logSelfEvaluation(
        userId: string,
        studentName: string,
        question: any,
        studentAnswer: string,
        score: number
    ) {
        const now = new Date();
        const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        const logEntry = {
            date: now.toISOString(),
            timestamp: now.getTime(),
            questionId: question.id,
            questionText: question.question_text || question.content?.prompt?.text,
            subject: question.subject || question.metadata?.subject || question.bundle?.subject || 'General',
            questionType: 'SHORT_ANSWER',
            inputText: studentAnswer,
            aiFeedback: null,
            score: score,
            isCorrect: score === (question.max_points || 3),
            isSuccess: true,
            isSelfEvaluated: true,
            studentId: userId,
            studentName
        };

        const studentLogRef = getMonthlyLogRef(userId, monthKey);
        await setDoc(studentLogRef, {
            entries: arrayUnion(logEntry),
            lastUpdated: now.toISOString()
        }, { merge: true });
    }
};
