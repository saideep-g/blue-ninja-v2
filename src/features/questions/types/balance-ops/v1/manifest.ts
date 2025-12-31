import { QuestionManifest, PlatinumAnalytics, RawInteractionLog } from '../../../domain';
import { BalanceOpsSchemaV1, BalanceOpsDataV1 } from './schema';
import { BalanceOpsComponentV1 } from './Component';

export const BalanceOpsManifestV1: QuestionManifest<BalanceOpsDataV1> = {
  id: 'balance-ops',
  version: 1,
  name: 'Balance Operations (Algebra)',
  description: 'Interactive linear equation solver focusing on inverse operations.',

  schema: BalanceOpsSchemaV1,

  component: BalanceOpsComponentV1,

  aiContext: {
    description: "Algebra equation solver. Students perform operations to both sides.",
    generationPrompt: `Generate a JSON object for BalanceOps:
    {
      "template": "BALANCE_OPS",
      "prompt": "Solve for x",
      "interaction": {
        "config": {
          "equation_latex": "2x + 6 = 20"
        }
      }
    }`
  },

  analytics: {
    computeMetrics: (data: BalanceOpsDataV1, logs: RawInteractionLog[], context): PlatinumAnalytics => {
      const startLog = logs.find(l => l.type === 'mount');
      const submitLog = logs.find(l => l.type === 'submit');
      const startTime = startLog?.timestamp || 0;
      const endTime = submitLog?.timestamp || Date.now();
      const timeSpent = Math.max(0, endTime - startTime);

      const result = submitLog?.payload || {};
      const isCorrect = !!result.isCorrect;
      const stepsTaken = result.steps || 0;

      // --- Heuristic for Optimal Steps ---
      // If we can parse the equation, we can guess optimal steps
      let optimalSteps = 2; // Default for ax+b=c
      // TODO: Parse 'data.interaction.config.equation_latex' to refine this.
      // For now, assuming 2 is standard for linear eq.

      const efficiency = stepsTaken <= optimalSteps ? 1.0 : (optimalSteps / stepsTaken);

      // Speed
      const expectedTime = 15000;
      let speedRating: PlatinumAnalytics['speedRating'] = 'STEADY';
      if (timeSpent < expectedTime * 0.4) speedRating = 'RUSHED';
      else if (timeSpent > expectedTime * 2.0) speedRating = 'SLOW';

      // Distraction
      const blurLogs = logs.filter(l => l.type === 'blur');
      const distractionScore = Math.min(100, blurLogs.length * 20);

      // Cognitive Load (based on resets or many steps)
      const resetLogs = logs.filter(l => l.type === 'click' && l.payload?.action === 'reset');
      let cognitiveLoad: PlatinumAnalytics['cognitiveLoad'] = 'LOW';
      if (stepsTaken > 5 || resetLogs.length > 0) cognitiveLoad = 'MEDIUM';
      if (timeSpent > 45000) cognitiveLoad = 'HIGH';

      return {
        questionId: data.id || `q_${Date.now()}`,
        sessionId: context.sessionId,
        atomId: (data.metadata?.atomId as string) || 'UNKNOWN_ATOM',
        timestamp: Date.now(),

        studentAnswer: { steps: stepsTaken, efficiency: efficiency.toFixed(2) },
        correctAnswer: "Variable Isolated",
        isCorrect,

        timeSpent,
        speedRating,
        attemptNumber: (context.atomHistory?.length || 0) + 1,

        diagnosticTag: !isCorrect ? 'FAILED_TO_ISOLATE' : null,
        isRecovered: false, // Calc outside
        recoveryVelocity: null,

        suggestedIntervention: !isCorrect ? 'HINT' : 'NONE',

        cognitiveLoad,
        distractionScore,
        focusConsistency: 1.0,
        confidenceGap: 0,

        peerPercentile: 50,
        masteryBefore: 0.5,
        masteryAfter: isCorrect ? 0.6 : 0.5,
        spaceRepetitionDue: Date.now() + 86400000,
        dataQuality: 'VALID'
      };
    }
  }
};
