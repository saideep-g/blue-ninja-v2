/**
 * Daily Missions Service for Blue Ninja v3
 * 
 * This service manages the complete daily missions lifecycle:
 * - Generating daily missions for students
 * - Tracking mission completion
 * - Managing streaks and badges
 * - Calculating points and rewards
 * - Persisting mission data
 * 
 * @module services/missions
 */

import { v4 as uuidv4 } from 'crypto';
import type {
  Mission,
  DailyMissionBatch,
  Streak,
  Badge,
  MissionCompletion,
  MissionStats,
  MissionGenerationConfig,
  MissionDifficulty,
} from '../../types/missions';
import {
  MissionStatus,
  MissionDifficulty,
  BadgeType,
} from '../../types/missions';
import { getRandomQuestions } from '../questions';
import { idbService } from '../idb';
import { logger } from '../logging';

/**
 * Mission templates for generation
 */
const MISSION_TEMPLATES = [
  {
    type: 'SOLVE_QUESTIONS' as const,
    title: 'Quick Questions',
    description: 'Solve 5 questions in this category',
    instruction: 'Answer the questions correctly',
    questionCount: 5,
    targetScore: 80,
    pointsReward: 10,
  },
  {
    type: 'PRACTICE' as const,
    title: 'Practice Session',
    description: 'Practice a mix of difficulty levels',
    instruction: 'Complete 10 questions with focus on weak areas',
    questionCount: 10,
    targetScore: 70,
    pointsReward: 15,
  },
  {
    type: 'CHALLENGE' as const,
    title: 'Daily Challenge',
    description: 'Solve challenging questions',
    instruction: 'Answer hard questions correctly',
    questionCount: 5,
    targetScore: 60,
    pointsReward: 20,
  },
  {
    type: 'LEARN' as const,
    title: 'Learn & Apply',
    description: 'Learn a concept and apply it',
    instruction: 'Read the material and solve related questions',
    questionCount: 8,
    targetScore: 75,
    pointsReward: 12,
  },
  {
    type: 'SOLVE_QUESTIONS' as const,
    title: 'Mixed Mastery',
    description: 'Test your knowledge across topics',
    instruction: 'Solve questions from different topics',
    questionCount: 7,
    targetScore: 75,
    pointsReward: 14,
  },
];

/**
 * DailyMissionsService
 * Manages student daily missions
 */
class DailyMissionsService {
  /**
   * Generate daily missions for a student
   * Creates 5 missions with varying difficulty
   * 
   * @param config - Mission generation configuration
   * @returns Daily mission batch
   * @throws Error if unable to generate missions
   */
  async generateDailyMissions(
    config: MissionGenerationConfig
  ): Promise<DailyMissionBatch> {
    try {
      logger.info('Generating daily missions', {
        userId: config.userId,
        date: config.date,
      });

      const batchId = uuidv4();
      const missionCount = config.missionCount || 5;
      const now = Date.now();

      // Get today's date for caching
      const today = new Date().toISOString().split('T')[0];
      const isToday = config.date === today;

      // Check if missions already generated for this date
      if (isToday) {
        const existing = await idbService.getMissionsForDate(
          config.userId,
          config.date
        );
        if (existing.length > 0) {
          logger.debug('Missions already generated for today');
          return await idbService.getDailyMissionBatch(
            config.userId,
            config.date
          ) as DailyMissionBatch;
        }
      }

      // Generate missions
      const missions: Mission[] = [];
      const difficulties: MissionDifficulty[] = [
        MissionDifficulty.EASY,
        MissionDifficulty.EASY,
        MissionDifficulty.MEDIUM,
        MissionDifficulty.MEDIUM,
        MissionDifficulty.HARD,
      ];

      for (let i = 0; i < missionCount; i++) {
        const template = MISSION_TEMPLATES[i % MISSION_TEMPLATES.length];
        const difficulty = difficulties[i] || MissionDifficulty.MEDIUM;

        const mission: Mission = {
          id: uuidv4(),
          userId: config.userId,
          date: config.date,
          type: template.type,
          status: MissionStatus.AVAILABLE,
          difficulty,
          title: template.title,
          description: template.description,
          instruction: template.instruction,
          questionCount: template.questionCount,
          targetScore: template.targetScore,
          pointsReward: this.adjustPointsForDifficulty(
            template.pointsReward,
            difficulty
          ),
          createdAt: now,
          expiresAt: this.getExpiryTime(config.date),
        };

        missions.push(mission);
      }

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
        await idbService.saveMission(mission);
      }
      await idbService.saveDailyMissionBatch(batch);

      logger.info('Daily missions generated', {
        missionCount,
        totalPoints: batch.totalPoints,
      });

      return batch;
    } catch (error) {
      logger.error('Failed to generate daily missions', error);
      throw new Error('Unable to generate missions. Please try again.');
    }
  }

  /**
   * Complete a mission
   * Updates mission status and awards points
   * Checks for streak and badge updates
   * 
   * @param userId - Student ID
   * @param missionId - Mission ID
   * @param accuracy - Accuracy percentage (0-100)
   * @returns Updated mission
   * @throws Error if mission not found
   */
  async completeMission(
    userId: string,
    missionId: string,
    accuracy?: number
  ): Promise<Mission> {
    try {
      logger.info('Completing mission', { userId, missionId });

      // Get mission
      const mission = await idbService.getMission(missionId);
      if (!mission) {
        throw new Error('Mission not found');
      }

      if (mission.userId !== userId) {
        throw new Error('Unauthorized');
      }

      const now = Date.now();
      const startTime = mission.startedAt || mission.createdAt;
      const timeSpentMs = now - startTime;

      // Update mission
      mission.status = MissionStatus.COMPLETED;
      mission.completedAt = now;
      mission.timeSpentMs = timeSpentMs;
      mission.currentScore = accuracy || 100;

      // Check if target met
      const targetMet = (accuracy || 100) >= (mission.targetScore || 70);
      const pointsEarned = targetMet ? mission.pointsReward : Math.floor(
        mission.pointsReward * 0.5
      ); // Half points if target not met

      // Save mission
      await idbService.saveMission(mission);

      // Create completion record
      const completion: MissionCompletion = {
        id: uuidv4(),
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

      // Update batch
      const batch = await idbService.getDailyMissionBatch(
        userId,
        mission.date
      );
      if (batch) {
        batch.completedCount += 1;
        batch.earnedPoints += pointsEarned;
        await idbService.saveDailyMissionBatch(batch);
      }

      // Check for perfect day badge
      if (batch && batch.completedCount === batch.missions.length) {
        await this.awardBadge(userId, BadgeType.PERFECT_DAY);
      }

      logger.info('Mission completed', {
        missionId,
        pointsEarned,
        targetMet,
      });

      return mission;
    } catch (error) {
      logger.error('Failed to complete mission', error);
      throw error;
    }
  }

  /**
   * Start a mission
   * Updates mission status to IN_PROGRESS
   * 
   * @param missionId - Mission ID
   * @returns Updated mission
   * @throws Error if mission not found
   */
  async startMission(missionId: string): Promise<Mission> {
    try {
      const mission = await idbService.getMission(missionId);
      if (!mission) {
        throw new Error('Mission not found');
      }

      mission.status = MissionStatus.IN_PROGRESS;
      mission.startedAt = Date.now();

      await idbService.saveMission(mission);

      logger.debug('Mission started', { missionId });

      return mission;
    } catch (error) {
      logger.error('Failed to start mission', error);
      throw error;
    }
  }

  /**
   * Get missions for specific date
   * 
   * @param userId - Student ID
   * @param date - Date (YYYY-MM-DD)
   * @returns Array of missions
   */
  async getMissionsForDate(
    userId: string,
    date: string
  ): Promise<Mission[]> {
    try {
      return await idbService.getMissionsForDate(userId, date);
    } catch (error) {
      logger.error('Failed to get missions for date', error);
      return [];
    }
  }

  /**
   * Get today's missions
   * 
   * @param userId - Student ID
   * @returns Today's missions
   */
  async getTodayMissions(userId: string): Promise<Mission[]> {
    const today = new Date().toISOString().split('T')[0];
    return this.getMissionsForDate(userId, today);
  }

  /**
   * Get student's streak information
   * 
   * @param userId - Student ID
   * @returns Streak information
   */
  async getStreak(userId: string) {
    try {
      return await idbService.getStreak(userId);
    } catch (error) {
      logger.error('Failed to get streak', error);
      return null;
    }
  }

  /**
   * Calculate streak for a student
   * Counts consecutive days with completed missions
   * 
   * @param userId - Student ID
   * @returns Streak length in days
   */
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

  /**
   * Get mission statistics for a student
   * 
   * @param userId - Student ID
   * @param days - Number of days to analyze (default: 30)
   * @returns Mission statistics
   */
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
        stats.favoriteType = favoriteType[0];
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

  /**
   * Update streak for a student
   * Called when a mission is completed
   * 
   * @param userId - Student ID
   * @param completionDate - Date mission was completed (YYYY-MM-DD)
   */
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

  /**
   * Award a badge to a student
   * Checks if already earned before awarding
   * 
   * @param userId - Student ID
   * @param badgeType - Badge type
   */
  private async awardBadge(
    userId: string,
    badgeType: BadgeType
  ): Promise<void> {
    try {
      const streak = await idbService.getStreak(userId);

      // Check if already earned
      if (streak && streak.badges.includes(badgeType)) {
        return;
      }

      // Create badge
      const badge: Badge = {
        id: uuidv4(),
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

  /**
   * Get badge title
   */
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

  /**
   * Get badge description
   */
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

  /**
   * Get badge icon
   */
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

  /**
   * Adjust points for difficulty
   */
  private adjustPointsForDifficulty(
    basePoints: number,
    difficulty: MissionDifficulty
  ): number {
    const multipliers: Record<MissionDifficulty, number> = {
      [MissionDifficulty.EASY]: 0.8,
      [MissionDifficulty.MEDIUM]: 1,
      [MissionDifficulty.HARD]: 1.5,
    };
    return Math.round(basePoints * multipliers[difficulty]);
  }

  /**
   * Get expiry time for a date
   * Missions expire at end of day
   */
  private getExpiryTime(dateStr: string): number {
    const date = new Date(dateStr);
    date.setDate(date.getDate() + 1);
    date.setHours(0, 0, 0, 0);
    return date.getTime();
  }

  /**
   * Calculate day difference between two dates
   */
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
