import { QuestionManifest, PlatinumAnalytics, RawInteractionLog } from '../../../domain';
import { MCQSchemaV1, MCQDataV1 } from './schema';
import { MCQComponentV1 } from './Component';

export const MCQManifestV1: QuestionManifest<MCQDataV1> = {
    id: 'multiple-choice',
    version: 1,
    name: 'Multiple Choice (Standard)',
    description: 'Single-select multiple choice question with text or image options.',

    schema: MCQSchemaV1,

    component: MCQComponentV1,

    aiContext: {
        description: "Standard 4-option multiple choice question.",
        generationPrompt: `Generate a JSON object compliant with the V1 schema:
    {
      "type": "multiple_choice",
      "prompt": "Question text...",
      "options": [{"id": "a", "text": "Option A"}, ...],
      "correctOptionId": "a",
      "explanation": "Why A is correct..."
    }`
    },

    analytics: {
        computeMetrics: (data: MCQDataV1, logs: RawInteractionLog[], context): PlatinumAnalytics => {
            // 1. EXTRACT BASIC SIGNALS
            const startLog = logs.find(l => l.type === 'mount');
            const submitLog = logs.find(l => l.type === 'submit');
            const startTime = startLog?.timestamp || 0;
            const endTime = submitLog?.timestamp || Date.now();
            const timeSpent = Math.max(0, endTime - startTime);

            const lastAnswer = submitLog?.payload?.selectedIndex; // Assuming payload has index
            const correctOptionId = data.correctOptionId;
            // Need to map index to ID. Assuming data.options order matches usage.
            const selectedOption = lastAnswer !== undefined ? data.options[lastAnswer] : null;
            const isCorrect = selectedOption?.id === correctOptionId;

            // 2. CALCULATE DERIVED METRICS

            // Speed Rating (Heuristic: 10s per question is "Steady")
            const expectedTime = 10000;
            let speedRating: PlatinumAnalytics['speedRating'] = 'STEADY';
            if (timeSpent < expectedTime * 0.3) speedRating = 'RUSHED';
            else if (timeSpent < expectedTime * 0.7) speedRating = 'FAST';
            else if (timeSpent > expectedTime * 1.5) speedRating = 'SLOW';

            // Distraction (Blur events)
            const blurLogs = logs.filter(l => l.type === 'blur');
            const distractionScore = Math.min(100, blurLogs.length * 20); // 20 pts per tab switch

            // Cognitive Load (Answer changes)
            const selections = logs.filter(l => l.type === 'answer_select');
            const changes = selections.length;
            let cognitiveLoad: PlatinumAnalytics['cognitiveLoad'] = 'LOW';
            if (changes > 2) cognitiveLoad = 'MEDIUM';
            if (changes > 4 || timeSpent > expectedTime * 2) cognitiveLoad = 'HIGH';

            // Recovery (Did they fail previous attempts on this atom?)
            const recentHistory = context.atomHistory?.slice(-3) || [];
            const wasFailing = recentHistory.some((h: any) => !h.isCorrect);
            const isRecovered = wasFailing && isCorrect;
            const attemptCount = (context.atomHistory?.length || 0) + 1;

            // 3. CONSTRUCT PLATINUM RECORD
            return {
                questionId: data.id || `q_${Date.now()}`, // Fallback if ID missing in V1
                sessionId: context.sessionId,
                atomId: (data.metadata?.atomId as string) || 'UNKNOWN_ATOM',

                timestamp: Date.now(),

                studentAnswer: selectedOption?.text || 'NO_ANSWER',
                correctAnswer: data.options.find(o => o.id === correctOptionId)?.text || 'UNKNOWN',
                isCorrect,

                timeSpent,
                speedRating,
                attemptNumber: attemptCount,

                diagnosticTag: !isCorrect
                    ? ((data.metadata?.errorTag as string) || 'GENERAL_ERROR') // V1 metadata
                    : null,

                isRecovered,
                recoveryVelocity: null, // specific calc logic needed across sessions

                suggestedIntervention: !isCorrect && attemptCount > 2 ? 'SCAFFOLD' : 'NONE',

                cognitiveLoad,
                distractionScore,
                focusConsistency: Math.max(0, 1.0 - (blurLogs.length * 0.1)),
                confidenceGap: 0, // Needs 'confidence' input from user (e.g. "I'm sure") which V1 lacks
                correctnessPattern: 'STABLE', // Placeholder or calc from history
                conceptualCohesion: [],
                peerPercentile: 50, // Backend aggregate

                // Mastery context (placeholders or passed through)
                masteryBefore: 0.5, // Fetched from context ideally
                masteryAfter: isCorrect ? 0.55 : 0.45,
                spaceRepetitionDue: Date.now() + 86400000,

                dataQuality: timeSpent < 100 ? 'ANOMALY' : 'VALID'
            };
        }
    }
};
