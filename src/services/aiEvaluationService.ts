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
    /**
     * Calls the Cloud Function to evaluate a short answer.
     */
    async evaluateShortAnswer(
        userId: string,
        studentName: string,
        question: any,
        studentAnswer: string
    ): Promise<EvaluationResponse> {
        const startTime = Date.now();
        const evaluateFn = httpsCallable(functions, 'evaluateShortAnswer');

        try {
            const result = await evaluateFn({
                question: question.question_text || question.content?.prompt?.text,
                student_answer: studentAnswer,
                evaluation_criteria: question.evaluation_criteria,
                max_points: question.max_points || 3
            });

            const data = result.data as any;
            const latency = Date.now() - startTime;

            // Log successful response
            await this.logInteraction(userId, studentName, question, studentAnswer, data, true, latency);

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

            // Log failure
            await this.logInteraction(userId, studentName, question, studentAnswer, null, false, latency, error.message);

            return {
                isSuccess: false,
                error: error.message || 'Unknown evaluation error'
            };
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
            questionId: question.id,
            questionText: question.question_text || question.content?.prompt?.text,
            subject: question.subject,
            questionType: 'SHORT_ANSWER',
            inputText: studentAnswer,
            outputText: aiResponse ? JSON.stringify(aiResponse) : null,
            aiFeedback: aiResponse?.evaluation || null,
            score: aiResponse?.evaluation?.score || 0,
            isCorrect: (aiResponse?.evaluation?.score === (question.max_points || 3)),
            responseTime: latency,
            inputTokensCount: aiResponse?.usage?.input_tokens || 0,
            outputTokensCount: aiResponse?.usage?.output_tokens || 0,
            isSuccess,
            isValid: !!aiResponse?.evaluation,
            errorMessage: errorMessage || null,
            studentId: userId,
            studentName
        };

        try {
            // 1. Student Monthly Log (arrayUnion)
            const studentLogRef = getMonthlyLogRef(userId, monthKey);
            await setDoc(studentLogRef, {
                entries: arrayUnion(logEntry),
                lastUpdated: now.toISOString()
            }, { merge: true });

            // 2. Admin Monitoring Log (arrayUnion)
            const adminLogRef = getAdminMonitoringLogRef(quarterKey);
            await setDoc(adminLogRef, {
                entries: arrayUnion(logEntry),
                lastUpdated: now.toISOString()
            }, { merge: true });

        } catch (e) {
            console.error('[AIEvaluation] Logging failed:', e);
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
            subject: question.subject,
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
