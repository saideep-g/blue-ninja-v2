/**
 * IndexedDB CRUD Operations
 * Provides typed operations for all database tables
 */

import { db } from './db';
import type {
  User,
  UserProfile,
  Question,
  Assessment,
  Progress,
  DailyMission,
} from '../../types/idb';
import { logger } from '../logging';

// ===== USER OPERATIONS =====

/**
 * Save or update a user
 */
export async function saveUser(user: User): Promise<string> {
  try {
    logger.debug('Saving user', { userId: user.id });
    const id = await db.users.put(user);
    logger.info('User saved successfully', { userId: id });
    return id;
  } catch (error) {
    logger.error('Failed to save user', { error });
    throw error;
  }
}

/**
 * Get a user by ID
 */
export async function getUser(id: string): Promise<User | undefined> {
  try {
    logger.debug('Fetching user', { userId: id });
    const user = await db.users.get(id);
    return user;
  } catch (error) {
    logger.error('Failed to fetch user', { error, userId: id });
    throw error;
  }
}

/**
 * Get a user by email (unique lookup)
 */
export async function getUserByEmail(email: string): Promise<User | undefined> {
  try {
    logger.debug('Fetching user by email', { email });
    const user = await db.users.where('email').equals(email).first();
    return user;
  } catch (error) {
    logger.error('Failed to fetch user by email', { error, email });
    throw error;
  }
}

/**
 * Delete a user
 */
export async function deleteUser(id: string): Promise<void> {
  try {
    logger.info('Deleting user', { userId: id });
    await db.users.delete(id);
  } catch (error) {
    logger.error('Failed to delete user', { error, userId: id });
    throw error;
  }
}

/**
 * Get all users (admin only)
 */
export async function getAllUsers(): Promise<User[]> {
  try {
    logger.debug('Fetching all users');
    return await db.users.toArray();
  } catch (error) {
    logger.error('Failed to fetch all users', { error });
    throw error;
  }
}

// ===== USER PROFILE OPERATIONS =====

/**
 * Save or update user profile
 */
export async function saveUserProfile(profile: UserProfile): Promise<string> {
  try {
    logger.debug('Saving user profile', { userId: profile.userId });
    const id = await db.userProfiles.put(profile);
    logger.info('User profile saved', { userId: id });
    return id;
  } catch (error) {
    logger.error('Failed to save user profile', { error });
    throw error;
  }
}

/**
 * Get user profile
 */
export async function getUserProfile(
  userId: string
): Promise<UserProfile | undefined> {
  try {
    logger.debug('Fetching user profile', { userId });
    return await db.userProfiles.get(userId);
  } catch (error) {
    logger.error('Failed to fetch user profile', { error, userId });
    throw error;
  }
}

/**
 * Delete user profile
 */
export async function deleteUserProfile(userId: string): Promise<void> {
  try {
    logger.info('Deleting user profile', { userId });
    await db.userProfiles.delete(userId);
  } catch (error) {
    logger.error('Failed to delete user profile', { error, userId });
    throw error;
  }
}

// ===== QUESTION OPERATIONS =====

/**
 * Save a question
 */
export async function saveQuestion(question: Question): Promise<string> {
  try {
    logger.debug('Saving question', { questionId: question.id });
    const id = await db.questions.put(question);
    logger.info('Question saved', { questionId: id });
    return id;
  } catch (error) {
    logger.error('Failed to save question', { error });
    throw error;
  }
}

/**
 * Get a question by ID
 */
export async function getQuestion(id: string): Promise<Question | undefined> {
  try {
    logger.debug('Fetching question', { questionId: id });
    return await db.questions.get(id);
  } catch (error) {
    logger.error('Failed to fetch question', { error, questionId: id });
    throw error;
  }
}

/**
 * Get questions by topic
 */
export async function getQuestionsByTopic(topic: string): Promise<Question[]> {
  try {
    logger.debug('Fetching questions by topic', { topic });
    return await db.questions.where('topic').equals(topic).toArray();
  } catch (error) {
    logger.error('Failed to fetch questions by topic', { error, topic });
    throw error;
  }
}

/**
 * Get questions by level
 */
export async function getQuestionsByLevel(level: string): Promise<Question[]> {
  try {
    logger.debug('Fetching questions by level', { level });
    return await db.questions.where('level').equals(level).toArray();
  } catch (error) {
    logger.error('Failed to fetch questions by level', { error, level });
    throw error;
  }
}

/**
 * Save multiple questions (batch)
 */
export async function saveQuestions(questions: Question[]): Promise<void> {
  try {
    logger.info('Saving batch of questions', { count: questions.length });
    await db.questions.bulkPut(questions);
    logger.info('Questions batch saved successfully');
  } catch (error) {
    logger.error('Failed to save questions batch', { error });
    throw error;
  }
}

/**
 * Get all questions
 */
export async function getAllQuestions(): Promise<Question[]> {
  try {
    logger.debug('Fetching all questions');
    return await db.questions.toArray();
  } catch (error) {
    logger.error('Failed to fetch all questions', { error });
    throw error;
  }
}

/**
 * Delete a question
 */
export async function deleteQuestion(id: string): Promise<void> {
  try {
    logger.info('Deleting question', { questionId: id });
    await db.questions.delete(id);
  } catch (error) {
    logger.error('Failed to delete question', { error, questionId: id });
    throw error;
  }
}

// ===== ASSESSMENT OPERATIONS =====

/**
 * Save an assessment
 */
export async function saveAssessment(assessment: Assessment): Promise<string> {
  try {
    logger.debug('Saving assessment', { assessmentId: assessment.id });
    const id = await db.assessments.put(assessment);
    logger.info('Assessment saved', { assessmentId: id });
    return id;
  } catch (error) {
    logger.error('Failed to save assessment', { error });
    throw error;
  }
}

/**
 * Get an assessment by ID
 */
export async function getAssessment(
  id: string
): Promise<Assessment | undefined> {
  try {
    logger.debug('Fetching assessment', { assessmentId: id });
    return await db.assessments.get(id);
  } catch (error) {
    logger.error('Failed to fetch assessment', { error, assessmentId: id });
    throw error;
  }
}

/**
 * Get all assessments for a user
 */
export async function getUserAssessments(userId: string): Promise<Assessment[]> {
  try {
    logger.debug('Fetching user assessments', { userId });
    return await db.assessments.where('userId').equals(userId).toArray();
  } catch (error) {
    logger.error('Failed to fetch user assessments', { error, userId });
    throw error;
  }
}

/**
 * Get unsynced assessments (for offline sync)
 */
export async function getUnSyncedAssessments(): Promise<Assessment[]> {
  try {
    logger.debug('Fetching unsynced assessments');
    return await db.assessments.where('synced').equals(false).toArray();
  } catch (error) {
    logger.error('Failed to fetch unsynced assessments', { error });
    throw error;
  }
}

/**
 * Delete an assessment
 */
export async function deleteAssessment(id: string): Promise<void> {
  try {
    logger.info('Deleting assessment', { assessmentId: id });
    await db.assessments.delete(id);
  } catch (error) {
    logger.error('Failed to delete assessment', { error, assessmentId: id });
    throw error;
  }
}

// ===== PROGRESS OPERATIONS =====

/**
 * Save progress record
 */
export async function saveProgress(progress: Progress): Promise<string> {
  try {
    logger.debug('Saving progress', { userId: progress.userId, date: progress.date });
    const id = await db.progress.put(progress);
    logger.info('Progress saved', { progressId: id });
    return id;
  } catch (error) {
    logger.error('Failed to save progress', { error });
    throw error;
  }
}

/**
 * Get progress for a specific date
 */
export async function getProgressByDate(
  userId: string,
  date: string
): Promise<Progress | undefined> {
  try {
    logger.debug('Fetching progress by date', { userId, date });
    return await db.progress
      .where('[userId+date]')
      .equals([userId, date])
      .first();
  } catch (error) {
    logger.error('Failed to fetch progress by date', { error, userId, date });
    throw error;
  }
}

/**
 * Get progress range for a user
 */
export async function getUserProgressRange(
  userId: string,
  startDate: string,
  endDate: string
): Promise<Progress[]> {
  try {
    logger.debug('Fetching progress range', { userId, startDate, endDate });
    return await db.progress
      .where('userId')
      .equals(userId)
      .filter((p) => p.date >= startDate && p.date <= endDate)
      .toArray();
  } catch (error) {
    logger.error('Failed to fetch progress range', {
      error,
      userId,
      startDate,
      endDate,
    });
    throw error;
  }
}

/**
 * Get unsynced progress records
 */
export async function getUnSyncedProgress(): Promise<Progress[]> {
  try {
    logger.debug('Fetching unsynced progress');
    return await db.progress.where('synced').equals(false).toArray();
  } catch (error) {
    logger.error('Failed to fetch unsynced progress', { error });
    throw error;
  }
}

// ===== DAILY MISSION OPERATIONS =====

/**
 * Save a daily mission
 */
export async function saveDailyMission(
  mission: DailyMission
): Promise<string> {
  try {
    logger.debug('Saving daily mission', { missionId: mission.id });
    const id = await db.dailyMissions.put(mission);
    logger.info('Daily mission saved', { missionId: id });
    return id;
  } catch (error) {
    logger.error('Failed to save daily mission', { error });
    throw error;
  }
}

/**
 * Get daily missions for a specific date
 */
export async function getDailyMissionsForDate(
  userId: string,
  date: string
): Promise<DailyMission[]> {
  try {
    logger.debug('Fetching daily missions', { userId, date });
    return await db.dailyMissions
      .where('[userId+date]')
      .equals([userId, date])
      .toArray();
  } catch (error) {
    logger.error('Failed to fetch daily missions', { error, userId, date });
    throw error;
  }
}

/**
 * Get unsynced daily missions
 */
export async function getUnSyncedMissions(): Promise<DailyMission[]> {
  try {
    logger.debug('Fetching unsynced missions');
    return await db.dailyMissions.where('synced').equals(false).toArray();
  } catch (error) {
    logger.error('Failed to fetch unsynced missions', { error });
    throw error;
  }
}

/**
 * Delete a daily mission
 */
export async function deleteDailyMission(id: string): Promise<void> {
  try {
    logger.info('Deleting daily mission', { missionId: id });
    await db.dailyMissions.delete(id);
  } catch (error) {
    logger.error('Failed to delete daily mission', { error, missionId: id });
    throw error;
  }
}

// ===== BATCH OPERATIONS =====

/**
 * Mark records as synced
 */
export async function markAsSynced(
  entity: 'assessments' | 'progress' | 'missions',
  ids: string[]
): Promise<void> {
  try {
    logger.info('Marking records as synced', { entity, count: ids.length });

    if (entity === 'assessments') {
      await db.assessments.bulkUpdate(
        ids.map((id) => ({ key: id, changes: { synced: true } }))
      );
    } else if (entity === 'progress') {
      await db.progress.bulkUpdate(
        ids.map((id) => ({ key: id, changes: { synced: true } }))
      );
    } else if (entity === 'missions') {
      await db.dailyMissions.bulkUpdate(
        ids.map((id) => ({ key: id, changes: { synced: true } }))
      );
    }

    logger.info('Records marked as synced successfully');
  } catch (error) {
    logger.error('Failed to mark records as synced', { error, entity });
    throw error;
  }
}

/**
 * Clear all user data (GDPR deletion)
 */
export async function clearUserData(userId: string): Promise<void> {
  try {
    logger.warn('Clearing all user data', { userId });

    await db.assessments.where('userId').equals(userId).delete();
    await db.progress.where('userId').equals(userId).delete();
    await db.dailyMissions.where('userId').equals(userId).delete();
    await db.userProfiles.delete(userId);
    await db.users.delete(userId);

    logger.info('User data cleared successfully', { userId });
  } catch (error) {
    logger.error('Failed to clear user data', { error, userId });
    throw error;
  }
}
