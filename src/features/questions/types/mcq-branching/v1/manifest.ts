import { QuestionManifest, PlatinumAnalytics, RawInteractionLog } from '../../../domain';
import { MCQBranchingSchemaV1, MCQBranchingDataV1 } from './schema';
import { MCQBranchingComponent } from './Component';

export const MCQBranchingManifestV1: QuestionManifest<MCQBranchingDataV1> = {
  id: 'mcq-branching',
  version: 1, // First version of THIS plugin, even if user calls it v3 data
  name: 'Adaptive Branching MCQ',
  description: 'Multi-stage question with conditional logic, remediation loops, and scaffolding.',

  schema: MCQBranchingSchemaV1,

  component: MCQBranchingComponent,

  aiContext: {
    description: "Multi-stage adaptive question (FSM).",
    generationPrompt: `
You are an expert curriculum designer. Generate a 'mcq-branching' question JSON.
The structure must follow the V1 Schema.
TEMPLATE:
{
  "item_id": "UNIQUE_ID",
  "atom_id": "CURRICULUM_ATOM_ID",
  "difficulty": 2,
  "context_tags": ["tag1", "tag2"],
  "flow": { "mode": "branching", "entry_stage_id": "ST1" },
  "stages": [
    {
      "stage_id": "ST1",
      "intent": "INITIAL",
      "prompt": { "text": "Question Text?" },
      "interaction": {
        "type": "mcq_concept",
        "config": {
          "options": [
            { 
               "id": "A", "text": "Wrong", 
               "feedback": "Hint...", 
               "next": { "type": "branch", "target": "REPAIR_ST1" } 
            },
            { 
               "id": "B", "text": "Correct", 
               "is_correct": true,
               "feedback": "Good job!", 
               "next": { "type": "exit", "outcome": "pass" } 
            }
          ]
        }
      }
    }
    // Add REPAIR_ST1 stage here...
  ]
}
`
  },

  analytics: {
    computeMetrics: (data, logs, context): PlatinumAnalytics => {
      // 1. TIMING
      const start = logs.find(l => l.type === 'view')?.timestamp || logs[0]?.timestamp || 0;
      const end = logs.find(l => l.type === 'submit')?.timestamp || Date.now();
      const timeSpent = Math.max(0, end - start);

      // 2. PATH ANALYSIS
      // Filter logs for transitions to reconstruct the journey
      const transitions = logs.filter(l => l.type === 'transition');
      const visitedStages = transitions.map(l => l.payload.from);
      // Add final stage if strictly needed, but 'submit' payload usually has it

      // 3. CORRECTNESS
      // In branching, 'pass' outcome determines correctness, NOT just the first answer.
      // We look at the payload of the 'submit' event from the QuestionRenderer wrapper
      const finalResult = logs.find(l => l.type === 'submit')?.payload;
      const isCorrect = finalResult?.isCorrect ?? false;

      // 4. DIAGNOSTICS & RECOVERY
      // Did they visit a repair stage?
      const repairStagesVisited = visitedStages.filter(s => s.startsWith('R_') || s.includes('REPAIR'));
      const diagnosticTag = repairStagesVisited.length > 0
        ? `REPAIRED_VIA_${repairStagesVisited[0]}`
        : (!isCorrect ? 'FAILED_PATH' : null);

      const isRecovered = repairStagesVisited.length > 0 && isCorrect;

      return {
        questionId: data.item_id || `branch_${Date.now()}`,
        sessionId: context.sessionId,
        atomId: data.atom_id || 'UNKNOWN',
        timestamp: Date.now(),

        studentAnswer: finalResult?.path?.join('->') || 'Incomplete',
        correctAnswer: 'Path to Success', // Metaphorical
        isCorrect,

        timeSpent,
        speedRating: timeSpent > 30000 ? 'SLOW' : 'STEADY', // Higher threshold for branching
        attemptNumber: 1, // Branching handles retries internally usually

        diagnosticTag,
        isRecovered,
        recoveryVelocity: null,
        suggestedIntervention: !isCorrect ? 'INTERVENE' : 'NONE', // If they fail a branching q, they really failed

        cognitiveLoad: repairStagesVisited.length > 1 ? 'HIGH' : 'MEDIUM',
        distractionScore: 0,
        focusConsistency: 1,
        confidenceGap: 0,

        masteryBefore: 0.5,
        masteryAfter: isCorrect ? 0.6 : 0.4,
        spaceRepetitionDue: Date.now() + 86400000,
        dataQuality: 'VALID'
      };
    }
  }
};
