/**
 * dailyMissionService.ts
 * 
 * Generates 14+ slot daily missions with diverse templates.
 * Integrates curriculum v2 with template library and spaced review rules.
 */

import curriculumV2Service, { getAllAtomsEnriched, loadCurriculumV2 } from './curriculumV2Service';
import { db } from './firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';

interface MissionPhase {
  name: string;
  slots: number;
  description: string;
  strategyKey: string;
  templates: string[];
}

interface MissionQuestion {
  questionId: string;
  atomId: string;
  atom_id: string; // legacy support
  atomName: string;
  moduleId?: string;
  moduleName?: string;
  templateId: string;
  template: {
    id: string;
    displayName: string;
    description: string;
    scoringModel: string;
  } | null;
  phase: string;
  phaseIndex: number;
  phaseTotalSlots: number;
  slot: number;
  totalSlots: number;
  outcomes: any[];
  difficulty: number;
  masteryBefore: number;
  analytics: {
    curriculumModule?: string;
    curriculumAtom: string;
    templateType: string;
    phaseType: string;
    learningOutcomeTypes: string[];
    masteryProfile?: string;
    prerequisites: string[];
  };
}

/**
 * Phase structure for 14+ slot daily mission
 */
const MISSION_PHASES: MissionPhase[] = [
  {
    name: 'WARM_UP',
    slots: 3,
    description: 'Spaced review - atoms not seen recently',
    strategyKey: 'spaced_review',
    templates: ['MCQ_CONCEPT', 'NUMBER_LINE_PLACE', 'NUMERIC_INPUT']
  },
  {
    name: 'DIAGNOSIS',
    slots: 3,
    description: 'Misconception targeting - atoms where student struggles',
    strategyKey: 'misconception_diagnosis',
    templates: ['ERROR_ANALYSIS', 'MCQ_CONCEPT', 'MATCHING']
  },
  {
    name: 'GUIDED_PRACTICE',
    slots: 3,
    description: 'Interactive learning - balanced weak/strong',
    strategyKey: 'guided_practice',
    templates: ['BALANCE_OPS', 'CLASSIFY_SORT', 'DRAG_DROP_MATCH']
  },
  {
    name: 'ADVANCED',
    slots: 3,
    description: 'Deep reasoning - progressive difficulty',
    strategyKey: 'advanced_reasoning',
    templates: ['STEP_BUILDER', 'MULTI_STEP_WORD', 'EXPRESSION_INPUT']
  },
  {
    name: 'REFLECTION',
    slots: 2,
    description: 'Transfer & consolidation - apply to novel contexts',
    strategyKey: 'transfer_learning',
    templates: ['SHORT_EXPLAIN', 'TRANSFER_MINI']
  }
];

/**
 * Generate 14+ slot daily mission with diverse templates
 */
export const generateDailyMissionV2 = async (studentId: string | null, forceDevMode = false) => {
  try {
    // Step 1: Load curriculum v2
    const curriculum = await loadCurriculumV2();

    // Step 2: Get student's mastery profile
    let studentMastery: Record<string, number> = {};
    let studentHurdles: Record<string, number> = {};
    let lastQuestionDates: Record<string, number> = {};

    if (studentId && !forceDevMode) {
      const studentRef = doc(db, 'students', studentId);
      const studentSnap = await getDoc(studentRef);
      if (studentSnap.exists()) {
        const data = studentSnap.data();
        studentMastery = data.mastery || {};
        studentHurdles = data.hurdles || {};
        lastQuestionDates = data.lastQuestionDates || {};
      }
    }

    // Step 3: Generate mission questions for each phase
    const missionQuestions: MissionQuestion[] = [];
    let globalQuestionIndex = 0;

    for (const phase of MISSION_PHASES) {
      const phaseQuestions = await generatePhaseQuestions(
        curriculum,
        phase,
        studentMastery,
        studentHurdles,
        lastQuestionDates,
        globalQuestionIndex
      );
      missionQuestions.push(...phaseQuestions);
      globalQuestionIndex += phaseQuestions.length;
    }

    // Step 4: Return mission with metadata
    return {
      missionId: `mission_${studentId}_${Date.now()}`,
      studentId,
      bundleId: curriculum.bundleId,
      totalSlots: missionQuestions.length,
      phases: MISSION_PHASES.map(p => ({
        name: p.name,
        slots: p.slots,
        description: p.description
      })),
      questions: missionQuestions,
      metadata: {
        generatedAt: new Date().toISOString(),
        curriculumVersion: curriculum.manifestVersion,
        algorithmVersion: 'v2.0',
        diversityScore: calculateDiversityScore(missionQuestions)
      }
    };
  } catch (error) {
    console.error('[dailyMissionService] Error generating mission:', error);
    throw error;
  }
};

/**
 * Generate questions for a specific phase
 */
async function generatePhaseQuestions(
  curriculum: any, // Using any for large curriculum object to save time or define full interface
  phase: MissionPhase,
  studentMastery: Record<string, number>,
  studentHurdles: Record<string, number>,
  lastQuestionDates: Record<string, number>,
  indexOffset: number
): Promise<MissionQuestion[]> {
  const phaseQuestions: MissionQuestion[] = [];

  // Get atoms for this phase's strategy
  const candidateAtoms = selectAtomsForPhase(
    curriculum,
    phase,
    studentMastery,
    studentHurdles,
    lastQuestionDates
  );

  // Generate one question per slot
  for (let i = 0; i < phase.slots; i++) {
    if (candidateAtoms.length === 0) break;

    // Select atom (rotate through candidates)
    const atomIndex = i % candidateAtoms.length;
    const atom = candidateAtoms[atomIndex];

    // Select template from phase's recommended templates
    const templateId = phase.templates[i % phase.templates.length];
    const template = curriculum.templates[templateId];

    // Create question object
    const question: MissionQuestion = {
      questionId: `q_${indexOffset + i}_${atom.atom_id}_${templateId}`,
      atomId: atom.atom_id,
      atom_id: atom.atom_id, // Keep both for compatibility
      atomName: atom.title,
      moduleId: atom.moduleId,
      moduleName: atom.moduleName,
      templateId,
      template: template ? {
        id: templateId,
        displayName: template.display_name,
        description: template.description,
        scoringModel: template.scoring_model
      } : null,
      phase: phase.name,
      phaseIndex: i,
      phaseTotalSlots: phase.slots,
      slot: indexOffset + i + 1,
      totalSlots: 14,

      // Curriculum metadata
      outcomes: atom.outcomes || [],
      difficulty: calculateDifficulty(atom, studentMastery),
      masteryBefore: studentMastery[atom.atom_id] || 0.5,

      // Analytics enrichment
      analytics: {
        curriculumModule: atom.moduleId,
        curriculumAtom: atom.atom_id,
        templateType: templateId,
        phaseType: phase.name,
        learningOutcomeTypes: (atom.outcomes || []).map((o: any) => o.type),
        masteryProfile: atom.mastery_profile_id,
        prerequisites: atom.prerequisites || []
      }
    };

    phaseQuestions.push(question);
  }

  return phaseQuestions;
}

/**
 * Select candidate atoms for a phase based on strategy
 */
function selectAtomsForPhase(
  curriculum: any,
  phase: MissionPhase,
  studentMastery: Record<string, number>,
  studentHurdles: Record<string, number>,
  lastQuestionDates: Record<string, number>
) {
  const allAtoms: any[] = Object.values(curriculum.atoms);
  let candidates: any[] = [];

  switch (phase.strategyKey) {
    case 'spaced_review':
      // Atoms not seen recently (spaced review principle)
      candidates = allAtoms.filter(atom => {
        const lastSeen = lastQuestionDates[atom.atom_id] || 0;
        const daysSinceLastSeen = (Date.now() - lastSeen) / (1000 * 60 * 60 * 24);
        return daysSinceLastSeen > 1 || lastSeen === 0; // Haven't seen in > 1 day or never seen
      }).slice(0, 10);
      break;

    case 'misconception_diagnosis':
      // Atoms where student has misconceptions
      candidates = allAtoms.filter(atom => {
        const mastery = studentMastery[atom.atom_id] || 0.5;
        const hasMisconceptions = atom.misconception_ids && atom.misconception_ids.length > 0;
        return mastery < 0.7 && hasMisconceptions; // Struggling + has misconceptions
      }).slice(0, 10);
      break;

    case 'guided_practice':
      // Mix of weak and strong atoms (balanced learning)
      const weakAtoms = allAtoms.filter(a => (studentMastery[a.atom_id] || 0.5) < 0.6);
      const strongAtoms = allAtoms.filter(a => (studentMastery[a.atom_id] || 0.5) >= 0.7);
      candidates = [
        ...weakAtoms.slice(0, 5),
        ...strongAtoms.slice(0, 5)
      ];
      break;

    case 'advanced_reasoning':
      // Progressive difficulty atoms with complex templates
      candidates = allAtoms
        .filter(a => (studentMastery[a.atom_id] || 0.5) >= 0.5)
        .sort((a, b) => {
          const masteryA = studentMastery[a.atom_id] || 0.5;
          const masteryB = studentMastery[b.atom_id] || 0.5;
          return masteryB - masteryA; // Sort by mastery descending
        })
        .slice(0, 10);
      break;

    case 'transfer_learning':
      // Varied atoms to prepare for transfer
      candidates = allAtoms
        .filter(a => (studentMastery[a.atom_id] || 0.5) >= 0.6)
        .sort(() => Math.random() - 0.5)
        .slice(0, 10);
      break;

    default:
      candidates = allAtoms.sort(() => Math.random() - 0.5).slice(0, 10);
  }

  return candidates.length > 0 ? candidates : allAtoms.sort(() => Math.random() - 0.5).slice(0, 10);
}

/**
 * Calculate difficulty level for atom based on mastery
 */
function calculateDifficulty(atom: any, studentMastery: Record<string, number>) {
  const mastery = studentMastery[atom.atom_id] || 0.5;
  if (mastery >= 0.85) return 1; // Easy
  if (mastery >= 0.65) return 2; // Medium
  return 3; // Hard
}

/**
 * Calculate diversity score (how many different templates)
 */
function calculateDiversityScore(questions: MissionQuestion[]) {
  const templates = new Set(questions.map(q => q.templateId));
  return {
    uniqueTemplates: templates.size,
    totalQuestions: questions.length,
    diversityRatio: templates.size / questions.length
  };
}

/**
 * Fetch generated mission questions (load from cache or DB)
 */
export const fetchMissionQuestions = async (missionId: string) => {
  try {
    // For now, return from in-memory cache
    // Later, could store missions in Firestore
    return null;
  } catch (error) {
    console.error('[dailyMissionService] Error fetching mission:', error);
    throw error;
  }
};

/**
 * Enrich mission question with curriculum metadata (for analytics)
 */
export const enrichQuestionWithMetadata = async (question: MissionQuestion) => {
  try {
    const curriculum = await loadCurriculumV2();
    const atom = curriculum.atoms[question.atomId];
    // @ts-ignore
    const template = curriculum.templates[question.templateId];
    // @ts-ignore
    const mastery = curriculum.masteryProfiles[atom?.mastery_profile_id];

    return {
      ...question,
      atom,
      template,
      masteryProfile: mastery,
      enrichedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('[dailyMissionService] Error enriching question:', error);
    return question;
  }
};

export default {
  generateDailyMissionV2,
  fetchMissionQuestions,
  enrichQuestionWithMetadata,
  MISSION_PHASES
};
