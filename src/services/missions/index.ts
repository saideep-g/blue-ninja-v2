/**
 * Daily Missions Service for Blue Ninja v3
 * 
 * This service manages the complete daily missions lifecycle:
 * - Generating daily missions for students (Powered by V2 "Phase-Based" Logic)
 * - Tracking mission completion
 * - Managing streaks and badges
 * - Calculating points and rewards
 * - Persisting mission data
 * 
 * @module services/missions
 */

// Simple UUID generator for browser
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

import type {
  Mission,
  DailyMissionBatch,
  Streak,
  Badge,
  MissionCompletion,
  MissionStats,
  MissionGenerationConfig,
} from '../../types/missions';
import {
  MissionStatus,
  MissionDifficulty,
  BadgeType,
} from '../../types/missions';
import * as idbService from "../db/idb";
import { logger } from '../logging';
import { loadCurriculumV2 } from '../curriculum';
import { db } from '../db/firebase';
import { questionBundlesCollection } from '../db/firestore';
import { getDoc, doc } from 'firebase/firestore';

// Helper Interfaces for V2 Logic
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
 * Phase structure for 14+ slot daily mission (V2 Logic)
 * Mapped to 5 V3 Missions
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
 * DailyMissionsService
 * Manages student daily missions
 */
class DailyMissionsService {
  /**
   * Generate daily missions for a student
   * Creates 5 missions using V2 Pedagogical Logic
   * 
   * @param config - Mission generation configuration
   * @returns Daily mission batch
   * @throws Error if unable to generate missions
   */
  async generateDailyMissions(
    config: MissionGenerationConfig,
    overrideOptions?: {
      forceTemplate?: string;
      forceModule?: string;
      forceDifficulty?: number;
      questionCount?: number;
      bypassHistory?: boolean;
      mode?: string;
      targetId?: string;
    }
  ): Promise<DailyMissionBatch> {
    try {
      logger.info('Generating daily missions (V3 + V2 Logic)', {
        userId: config.userId,
        date: config.date,
        overrides: overrideOptions
      });

      const batchId = generateUUID();
      const now = Date.now();
      const isToday = config.date === new Date().toISOString().split('T')[0];

      // Check if missions already generated for this date
      // SKIP persistence check if we are in override/test mode (bypassHistory)
      if (isToday && !overrideOptions?.bypassHistory) {
        const existing = await idbService.getDailyMissionsForDate(
          config.userId,
          config.date
        );

        if (existing && existing.length > 0) {
          logger.debug('Missions already generated for today');
          // Reconstruct batch from existing missions
          // Note: existing is DailyMission[], need to cast or map to Mission[]
          return {
            id: 'batch_' + config.date,
            userId: config.userId,
            date: config.date,
            missions: existing as unknown as Mission[],
            generatedAt: Date.now(),
            completedCount: existing.filter(m => m.status === 'COMPLETED').length,
            totalPoints: existing.reduce((sum, m) => sum + (m.pointsReward || 0), 0),
            earnedPoints: 0,
          };
        }
      }

      // --- SIMULATION: BUNDLE MODE ---
      if (overrideOptions?.mode === 'BUNDLE' && overrideOptions.targetId) {
        return await this.generateFromBundle(
          overrideOptions.targetId,
          config,
          overrideOptions.questionCount || 10
        );
      }

      // --- V2 LOGIC INTEGRATION START ---

      // Step 1: Load curriculum
      const curriculum = await loadCurriculumV2();

      // Step 2: Get student mastery (Try Firestore first for V2 compatibility)
      let studentMastery: Record<string, number> = {};
      let studentHurdles: Record<string, number> = {};
      let lastQuestionDates: Record<string, number> = {};

      if (config.userId) {
        try {
          const studentRef = doc(db, 'students', config.userId);
          const studentSnap = await getDoc(studentRef);
          if (studentSnap.exists()) {
            const data = studentSnap.data();
            studentMastery = data.mastery || {};
            studentHurdles = data.hurdles || {};
            lastQuestionDates = data.lastQuestionDates || {};
          }
        } catch (e) {
          logger.warn('Failed to fetch remote mastery, using default', e);
        }
      }

      // Step 3: Generate missions per Phase
      const missions: Mission[] = [];
      let globalIndexOffset = 0;

      // Filter phases based on override if needed (e.g. if we only want 1 question, we might limit phases)
      // For now, allow overrides to affect the QUESTIONS generated within phases.

      const activePhases = overrideOptions?.questionCount
        ? MISSION_PHASES.slice(0, Math.ceil(overrideOptions.questionCount / 3)) // Approx
        : MISSION_PHASES;

      for (const phase of activePhases) {
        // Apply Overrides to Phase Config
        const effectivePhase = { ...phase };
        if (overrideOptions?.forceTemplate) effectivePhase.templates = [overrideOptions.forceTemplate];

        console.log(`[Service] Generating Phase: ${phase.name}. Templates: ${effectivePhase.templates.join(',')}`);

        const phaseQuestions = await this.generatePhaseQuestions(
          curriculum,
          effectivePhase,
          studentMastery,
          studentHurdles,
          lastQuestionDates,
          globalIndexOffset,
          overrideOptions // Pass overrides down
        );

        globalIndexOffset += phaseQuestions.length;

        const missionDifficulty = this.mapPhaseToDifficulty(phase.name);
        const points = this.calculatePointsForPhase(phase.name);

        const mission: Mission = {
          id: generateUUID(),
          userId: config.userId,
          date: config.date,
          type: this.mapPhaseToType(phase.name),
          status: MissionStatus.AVAILABLE,
          difficulty: missionDifficulty,
          title: this.getPhaseTitle(phase.name),
          description: phase.description,
          instruction: `Complete ${phase.slots} questions in this ${phase.name.toLowerCase().replace('_', ' ')} module.`,
          questionCount: phaseQuestions.length,
          targetScore: 70, // Default pass mark
          pointsReward: points,
          createdAt: now,
          expiresAt: this.getExpiryTime(config.date),
          questions: phaseQuestions
        };

        missions.push(mission);
      }

      // --- V2 LOGIC INTEGRATION END ---

      // Create batch
      const batch: DailyMissionBatch = {
        id: batchId,
        userId: config.userId,
        date: config.date,
        missions,
        generatedAt: now,
        completedCount: 0,
        totalPoints: missions.reduce(
          (sum, m) => sum + m.pointsReward,
          0
        ),
        earnedPoints: 0,
      };

      // Save to IndexedDB
      for (const mission of missions) {
        await idbService.saveDailyMission({
          ...mission,
          synced: false
        } as any);
      }
      // Note: Batch object itself is computed from missions, not stored separately in V3 Schema

      logger.info('Daily missions generated', {
        missionCount: missions.length,
        totalPoints: batch.totalPoints,
      });

      return batch;
    } catch (error) {
      logger.error('Failed to generate daily missions', error);
      throw new Error('Unable to generate missions. Please try again.');
    }
  }

  // --- SIMULATION HELPER ---
  private async generateFromBundle(bundleId: string, config: any, limit: number): Promise<DailyMissionBatch> {
    try {
      const bundleRef = doc(questionBundlesCollection, bundleId);
      const snap = await getDoc(bundleRef);

      if (!snap.exists()) {
        throw new Error(`Bundle ${bundleId} not found`);
      }

      const bundleData = snap.data();
      const items = bundleData.items || [];

      // Slice to limit
      const selectedItems = items.slice(0, limit);

      // Wrap in a single "Mission" for simplicity, or split.
      // V3 expects Missions to have questions.
      // We will create ONE big mission for the simulation.

      const missionId = generateUUID();

      // Map Bundle Items to MissionQuestions (Minimal adaptation)
      // We need to ensure the UI can read them.
      // The UI expects 'questions' array in the Mission object.

      const mappedQuestions = selectedItems.map((item: any, idx: number) => ({
        questionId: item.item_id || item.id || `q_${idx}`,
        atomId: item.atom_id || item.atom || 'bundle_atom',
        templateId: item.template_id || item.type || 'MCQ_CONCEPT',
        // Pass through all content properties ensuring they exist
        ...item,
        // Ensure we have metadata the Hook expects
        analytics: {
          source: 'BUNDLE_SIMULATION',
          bundleId: bundleId
        }
      }));

      const mission: Mission = {
        id: missionId,
        userId: config.userId,
        date: config.date,
        type: 'PRACTICE', // Override type to valid MissionType
        status: MissionStatus.AVAILABLE,
        difficulty: MissionDifficulty.MEDIUM,
        title: bundleData.name || 'Simulated Mission',
        description: `Test Run: ${bundleData.description || bundleId}`,
        instruction: "Complete this simulated mission set.",
        questionCount: mappedQuestions.length,
        targetScore: 0,
        pointsReward: 0,
        createdAt: Date.now(),
        expiresAt: Date.now() + 86400000,
        questions: mappedQuestions
      };

      return {
        id: 'sim_' + generateUUID(),
        userId: config.userId,
        date: config.date,
        missions: [mission],
        generatedAt: Date.now(),
        completedCount: 0,
        totalPoints: 0,
        earnedPoints: 0
      };

    } catch (e) {
      logger.error('Failed to generate from bundle', e);
      throw e; // Let the hook handle it
    }
  }

  // --- V2 HELPER METHODS ---

  private async generatePhaseQuestions(
    curriculum: any,
    phase: MissionPhase,
    studentMastery: Record<string, number>,
    studentHurdles: Record<string, number>,
    lastQuestionDates: Record<string, number>,
    indexOffset: number,
    overrides?: any
  ): Promise<MissionQuestion[]> {
    const phaseQuestions: MissionQuestion[] = [];

    const candidateAtoms = this.selectAtomsForPhase(
      curriculum,
      phase,
      studentMastery,
      studentHurdles,
      lastQuestionDates,
      overrides
    );

    for (let i = 0; i < phase.slots; i++) {
      if (candidateAtoms.length === 0) break;
      const atomIndex = i % candidateAtoms.length;
      const atom = candidateAtoms[atomIndex];
      const templateId = phase.templates[i % phase.templates.length];
      const template = curriculum.templates[templateId];

      const question: MissionQuestion = {
        questionId: `q_${indexOffset + i}_${atom.atom_id}_${templateId}`,
        atomId: atom.atom_id,
        atom_id: atom.atom_id,
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
        outcomes: atom.outcomes || [],
        difficulty: this.calculateDifficulty(atom, studentMastery),
        masteryBefore: studentMastery[atom.atom_id] || 0.5,
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

  private selectAtomsForPhase(
    curriculum: any,
    phase: MissionPhase,
    studentMastery: Record<string, number>,
    studentHurdles: Record<string, number>,
    lastQuestionDates: Record<string, number>,
    overrides?: any
  ) {
    const allAtoms: any[] = Object.values(curriculum.atoms);

    // Override: Module Filter
    let candidates = overrides?.forceModule
      ? allAtoms.filter(a => a.moduleId === overrides.forceModule || a.moduleName === overrides.forceModule)
      : allAtoms;

    // If overrides used, skip standard strategy and just return candidates
    // OR, apply strategy on the filtered set.
    // Let's apply strategy on filtered set, unless forced template/module allows anything.

    if (overrides?.forceModule) {
      return candidates.slice(0, 5);
    }

    switch (phase.strategyKey) {
      case 'spaced_review':
        candidates = allAtoms.filter(atom => {
          const lastSeen = lastQuestionDates[atom.atom_id] || 0;
          const daysSince = (Date.now() - lastSeen) / (1000 * 60 * 60 * 24);
          return daysSince > 1 || lastSeen === 0;
        }).slice(0, 5);
        break;
      case 'misconception_diagnosis':
        candidates = allAtoms.filter(atom => {
          const mastery = studentMastery[atom.atom_id] || 0.5;
          const hasMisc = atom.misconception_ids && atom.misconception_ids.length > 0;
          return mastery < 0.7 && hasMisc;
        }).slice(0, 5);
        break;
      case 'guided_practice':
        const weak = allAtoms.filter(a => (studentMastery[a.atom_id] || 0.5) < 0.6);
        const strong = allAtoms.filter(a => (studentMastery[a.atom_id] || 0.5) >= 0.7);
        candidates = [...weak.slice(0, 3), ...strong.slice(0, 2)];
        break;
      case 'advanced_reasoning':
        candidates = allAtoms
          .filter(a => (studentMastery[a.atom_id] || 0.5) >= 0.6)
          .sort((a, b) => (studentMastery[b.atom_id] || 0) - (studentMastery[a.atom_id] || 0))
          .slice(0, 5);
        break;
      case 'transfer_learning':
        candidates = allAtoms
          .filter(a => (studentMastery[a.atom_id] || 0.5) >= 0.7)
          .sort(() => Math.random() - 0.5)
          .slice(0, 5);
        break;
      default:
        candidates = allAtoms.slice(0, 5);
    }
    return candidates.length > 0 ? candidates : allAtoms.slice(0, 5);
  }

  private calculateDifficulty(atom: any, masteryMap: Record<string, number>): number {
    const m = masteryMap[atom.atom_id] || 0.5;
    if (m >= 0.8) return 1;
    if (m >= 0.5) return 2;
    return 3;
  }

  private mapPhaseToDifficulty(phaseName: string): MissionDifficulty {
    switch (phaseName) {
      case 'WARM_UP': return MissionDifficulty.EASY;
      case 'DIAGNOSIS': return MissionDifficulty.MEDIUM;
      case 'GUIDED_PRACTICE': return MissionDifficulty.MEDIUM;
      case 'ADVANCED': return MissionDifficulty.HARD;
      case 'REFLECTION': return MissionDifficulty.EASY;
      default: return MissionDifficulty.MEDIUM;
    }
  }

  private mapPhaseToType(phaseName: string): any {
    switch (phaseName) {
      case 'WARM_UP': return 'PRACTICE';
      case 'DIAGNOSIS': return 'SOLVE_QUESTIONS';
      case 'GUIDED_PRACTICE': return 'LEARN';
      case 'ADVANCED': return 'CHALLENGE';
      case 'REFLECTION': return 'SOLVE_QUESTIONS';
      default: return 'PRACTICE';
    }
  }

  private getPhaseTitle(phaseName: string): string {
    return phaseName.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  }

  private calculatePointsForPhase(phaseName: string): number {
    switch (phaseName) {
      case 'WARM_UP': return 50;
      case 'DIAGNOSIS': return 75;
      case 'GUIDED_PRACTICE': return 100;
      case 'ADVANCED': return 150;
      case 'REFLECTION': return 50;
      default: return 50;
    }
  }

  // --- STANDARD V3 METHODS (Preserved) ---

  async completeMission(
    userId: string,
    missionId: string,
    accuracy?: number
  ): Promise<Mission> {
    try {
      logger.info('Completing mission', { userId, missionId });

      // Retrieve mission by ID
      const mission = await idbService.getDailyMission(missionId);

      if (!mission) {
        throw new Error('Mission not found');
      }

      if (mission.userId !== userId) {
        throw new Error('Unauthorized');
      }

      const now = Date.now();
      const startTime = mission.startedAt || now; // fallback if not tracked
      // If startTime is ms, use it. If V2 stored IsoString, simpler to assume it's lost and use arbitrary.
      // Better to check type. In V3 types, it's number.
      const timeSpentMs = now - (typeof startTime === 'number' ? startTime : now);

      // Update mission
      const updates = {
        status: MissionStatus.COMPLETED as any,
        completedAt: now,
        timeSpentMs: timeSpentMs,
        currentScore: accuracy || 100,
        synced: false
      };

      // Check if target met
      const targetMet = (accuracy || 100) >= (mission.targetScore || 70);
      const pointsEarned = targetMet ? mission.pointsReward : Math.floor(
        mission.pointsReward * 0.5
      );

      // Save mission (Atomic Update)
      await idbService.db.dailyMissions.update(missionId, updates);

      // Merge for local return (optimistic)
      const updatedMission = { ...mission, ...updates };

      // Create completion record
      const completion: MissionCompletion = {
        id: generateUUID(),
        userId,
        missionId,
        date: mission.date,
        timeSpentMs,
        pointsEarned,
        completedAt: now,
        accuracy,
      };
      await idbService.saveMissionCompletion(completion);

      // Update streak
      await this.updateStreak(userId, mission.date);

      // Update batch (logical) - handled by getDailyMissionBatch reconstructing it.

      // Check for perfect day badge
      const todayMissions = await idbService.getDailyMissionsForDate(userId, mission.date);
      const allCompleted = todayMissions.every((m: any) => m.status === 'COMPLETED');
      if (allCompleted) {
        await this.awardBadge(userId, BadgeType.PERFECT_DAY);
      }

      logger.info('Mission completed', {
        missionId,
        pointsEarned,
        targetMet,
      });

      return updatedMission as unknown as Mission;
    } catch (error) {
      logger.error('Failed to complete mission', error);
      throw error;
    }
  }

  /**
   * Track granular question progress (Atomic Transaction)
   */
  async markQuestionComplete(userId: string, missionId: string, questionId: string) {
    try {
      console.log(`[Missions] markQuestionComplete invoked for Mission: ${missionId} Question: ${questionId}`);
      await idbService.db.transaction('rw', idbService.db.dailyMissions, async () => {
        const mission = await idbService.db.dailyMissions.get(missionId);
        if (!mission) return;

        const completedIds = mission.completedQuestionIds || [];
        if (completedIds.includes(questionId)) return;

        const updatedIds = [...completedIds, questionId];

        await idbService.db.dailyMissions.update(missionId, {
          completedQuestionIds: updatedIds,
          questionsCompleted: updatedIds.length,
          synced: false
        });
        console.log(`[Missions] Progress saved for ${missionId} (${updatedIds.length}/${mission.questionCount})`);
      });
    } catch (e) {
      console.error('Failed to save question progress', e);
    }
  }



  async startMission(missionId: string): Promise<Mission> {
    try {
      const mission = await idbService.getDailyMission(missionId);
      if (!mission) {
        throw new Error('Mission not found');
      }

      await idbService.db.dailyMissions.update(missionId, {
        status: MissionStatus.IN_PROGRESS as any,
        startedAt: Date.now(),
        synced: false
      });

      logger.debug('Mission started', { missionId });

      // Return updated object (fetching freshly to be accurate)
      const updated = await idbService.getDailyMission(missionId);
      return updated as unknown as Mission;
    } catch (error) {
      logger.error('Failed to start mission', error);
      throw error;
    }
  }

  async getMissionsForDate(
    userId: string,
    date: string
  ): Promise<Mission[]> {
    try {
      const ms = await idbService.getDailyMissionsForDate(userId, date);
      return ms as unknown as Mission[];
    } catch (error) {
      logger.error('Failed to get missions for date', error);
      return [];
    }
  }

  async getTodayMissions(userId: string): Promise<Mission[]> {
    const today = new Date().toISOString().split('T')[0];
    return this.getMissionsForDate(userId, today);
  }

  async getStreak(userId: string) {
    try {
      return await idbService.getStreak(userId);
    } catch (error) {
      logger.error('Failed to get streak', error);
      return null;
    }
  }

  async calculateStreak(userId: string): Promise<number> {
    try {
      logger.debug('Calculating streak', { userId });

      let streak = 0;
      let currentDate = new Date();
      currentDate.setDate(currentDate.getDate() - 1); // Start from yesterday

      while (true) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const missions = await this.getMissionsForDate(userId, dateStr);
        const completed = missions.filter(
          (m) => m.status === MissionStatus.COMPLETED
        );

        if (completed.length > 0) {
          streak++;
          currentDate.setDate(currentDate.getDate() - 1);
        } else {
          break;
        }
      }

      logger.debug('Streak calculated', { userId, streak });

      return streak;
    } catch (error) {
      logger.error('Failed to calculate streak', error);
      return 0;
    }
  }

  async getMissionStats(userId: string, days: number = 30): Promise<MissionStats> {
    try {
      logger.debug('Getting mission stats', { userId, days });

      const stats: MissionStats = {
        userId,
        totalMissionsAvailable: 0,
        totalCompleted: 0,
        totalInProgress: 0,
        totalFailed: 0,
        completionRate: 0,
        currentStreak: 0,
        longestStreak: 0,
        totalPoints: 0,
        averageCompletionTime: 0,
        favoriteType: '',
        lastUpdate: Date.now(),
      };

      // Collect stats from past N days
      let totalTime = 0;
      let completionCount = 0;
      const typeCounts: Record<string, number> = {};

      for (let i = 0; i < days; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        const missions = await this.getMissionsForDate(userId, dateStr);

        for (const mission of missions) {
          stats.totalMissionsAvailable++;

          if (mission.status === MissionStatus.COMPLETED) {
            stats.totalCompleted++;
            stats.totalPoints += mission.pointsReward;
            if (mission.timeSpentMs) {
              totalTime += mission.timeSpentMs;
            }
            completionCount++;
          } else if (mission.status === MissionStatus.IN_PROGRESS) {
            stats.totalInProgress++;
          } else if (mission.status === MissionStatus.FAILED) {
            stats.totalFailed++;
          }

          // Count mission types
          typeCounts[mission.type] = (typeCounts[mission.type] || 0) + 1;
        }
      }

      // Calculate percentages and averages
      if (stats.totalMissionsAvailable > 0) {
        stats.completionRate =
          Math.round(
            (stats.totalCompleted / stats.totalMissionsAvailable) * 100
          ) || 0;
      }

      if (completionCount > 0) {
        stats.averageCompletionTime = Math.round(totalTime / completionCount);
      }

      // Find favorite type
      const favoriteType = Object.entries(typeCounts).sort(
        ([, a], [, b]) => b - a
      )[0];
      if (favoriteType) {
        stats.favoriteType = favoriteType[0] as any;
      }

      // Get streaks
      const streak = await this.getStreak(userId);
      if (streak) {
        stats.currentStreak = streak.current;
        stats.longestStreak = streak.longest;
      }

      logger.debug('Mission stats calculated', {
        userId,
        completionRate: stats.completionRate,
      });

      return stats;
    } catch (error) {
      logger.error('Failed to get mission stats', error);
      throw error;
    }
  }

  private async updateStreak(
    userId: string,
    completionDate: string
  ): Promise<void> {
    try {
      let streak = await idbService.getStreak(userId);
      const today = new Date().toISOString().split('T')[0];

      if (!streak) {
        // Create new streak
        streak = {
          id: userId,
          userId,
          current: 1,
          longest: 1,
          startDate: completionDate,
          lastMissionDate: completionDate,
          totalMissionsCompleted: 1,
          totalPoints: 0,
          badges: [],
          updatedAt: Date.now(),
        };

        // Award first mission badge
        await this.awardBadge(userId, BadgeType.FIRST_MISSION);
      } else {
        // Update existing streak
        const lastDate = streak.lastMissionDate || completionDate;
        const dayDiff = this.getDayDifference(lastDate, completionDate);

        if (dayDiff === 1) {
          // Consecutive day
          streak.current++;

          // Check for milestone badges
          if (streak.current === 7) {
            await this.awardBadge(userId, BadgeType.WEEK_STREAK);
          } else if (streak.current === 30) {
            await this.awardBadge(userId, BadgeType.MONTH_STREAK);
          }
        } else if (dayDiff > 1) {
          // Streak broken, reset
          if (streak.current > streak.longest) {
            streak.longest = streak.current;
          }
          streak.current = 1;
          streak.startDate = completionDate;
        }
        // dayDiff === 0 means same day, don't change streak

        streak.lastMissionDate = completionDate;
        streak.totalMissionsCompleted++;
        streak.updatedAt = Date.now();
      }

      await idbService.saveStreak(streak);

      logger.debug('Streak updated', {
        userId,
        current: streak.current,
        longest: streak.longest,
      });
    } catch (error) {
      logger.warn('Could not update streak', error);
      // Don't throw - streak is non-critical
    }
  }

  private async awardBadge(
    userId: string,
    badgeType: BadgeType
  ): Promise<void> {
    try {
      const streak = await idbService.getStreak(userId);

      // Check if already earned (logic depends on how we store. if streak.badges is array of strings)
      if (streak && streak.badges.includes(badgeType)) {
        return;
      }

      // Create badge
      const badge: Badge = {
        id: generateUUID(),
        userId,
        type: badgeType,
        title: this.getBadgeTitle(badgeType),
        description: this.getBadgeDescription(badgeType),
        icon: this.getBadgeIcon(badgeType),
        earnedAt: Date.now(),
      };

      await idbService.saveBadge(badge);

      // Update streak
      if (streak) {
        streak.badges.push(badgeType);
        await idbService.saveStreak(streak);
      }

      logger.info('Badge awarded', { userId, badgeType });
    } catch (error) {
      logger.warn('Could not award badge', error);
    }
  }

  private getBadgeTitle(type: BadgeType): string {
    const titles: Record<BadgeType, string> = {
      [BadgeType.FIRST_MISSION]: 'First Step',
      [BadgeType.WEEK_STREAK]: 'Week Warrior',
      [BadgeType.MONTH_STREAK]: 'Monthly Master',
      [BadgeType.PERFECT_DAY]: 'Perfect Day',
      [BadgeType.HARD_CHAMPION]: 'Hard Champion',
      [BadgeType.SPEED_RUNNER]: 'Speed Runner',
      [BadgeType.CONSISTENCY]: 'Consistent Learner',
      [BadgeType.MASTER]: 'Mission Master',
    };
    return titles[type] || 'Achievement';
  }

  private getBadgeDescription(type: BadgeType): string {
    const descriptions: Record<BadgeType, string> = {
      [BadgeType.FIRST_MISSION]: 'Completed your first mission',
      [BadgeType.WEEK_STREAK]: 'Maintained a 7-day streak',
      [BadgeType.MONTH_STREAK]: 'Maintained a 30-day streak',
      [BadgeType.PERFECT_DAY]: 'Completed all missions in one day',
      [BadgeType.HARD_CHAMPION]: 'Completed 10 hard missions',
      [BadgeType.SPEED_RUNNER]: 'Completed mission in under 2 minutes',
      [BadgeType.CONSISTENCY]: 'Completed 50 missions',
      [BadgeType.MASTER]: 'Completed 100 missions',
    };
    return descriptions[type] || 'Achievement unlocked';
  }

  private getBadgeIcon(type: BadgeType): string {
    const icons: Record<BadgeType, string> = {
      [BadgeType.FIRST_MISSION]: '🌟',
      [BadgeType.WEEK_STREAK]: '🔥',
      [BadgeType.MONTH_STREAK]: '🚀',
      [BadgeType.PERFECT_DAY]: '✨',
      [BadgeType.HARD_CHAMPION]: '👑',
      [BadgeType.SPEED_RUNNER]: '⚡',
      [BadgeType.CONSISTENCY]: '💪',
      [BadgeType.MASTER]: '🏆',
    };
    return icons[type] || '⭐';
  }

  private getExpiryTime(dateStr: string): number {
    const date = new Date(dateStr);
    date.setDate(date.getDate() + 1);
    date.setHours(0, 0, 0, 0);
    return date.getTime();
  }

  private getDayDifference(date1: string, date2: string): number {
    const d1 = new Date(date1).getTime();
    const d2 = new Date(date2).getTime();
    const diff = d2 - d1;
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }
}

// Export singleton instance
export const missionsService = new DailyMissionsService();
export default missionsService;
