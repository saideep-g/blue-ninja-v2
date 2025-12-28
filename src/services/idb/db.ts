/**
 * Dexie Database Configuration
 * Database: BlueNinjaDB
 * Tables: 8 (users, userProfiles, questions, assessments, progress, dailyMissions, adminData, syncLogs)
 */

import Dexie, { type Table } from 'dexie';
import type {
  User,
  UserProfile,
  Question,
  Assessment,
  Progress,
  DailyMission,
  AdminData,
  SyncLog,
} from '../../types/idb';
import { logger } from '../logging';

/**
 * BlueNinjaDB - Main database class
 * Extends Dexie to provide strongly typed tables
 */
export class BlueNinjaDB extends Dexie {
  users!: Table<User>;
  userProfiles!: Table<UserProfile>;
  questions!: Table<Question>;
  assessments!: Table<Assessment>;
  progress!: Table<Progress>;
  dailyMissions!: Table<DailyMission>;
  adminData!: Table<AdminData>;
  syncLogs!: Table<SyncLog>;

  constructor() {
    super('BlueNinjaDB');

    // Define database schema (version 1)
    this.version(1).stores({
      // Table name: 'index keys'
      // Primary key is always first
      users: 'id, email', // id=primary, email=unique index
      userProfiles: 'userId', // userId=primary
      questions: 'id, subject, topic, level', // id=primary, others=indexes
      assessments: 'id, userId, type, [userId+type]', // compound index
      progress: 'id, userId, date, [userId+date]', // compound index
      dailyMissions: 'id, userId, date, [userId+date]', // compound index
      adminData: 'id, key', // id=primary, key=unique index
      syncLogs: '++id, timestamp, entity, status', // ++id=auto-increment
    });
  }
}

/**
 * Singleton database instance
 * Use this throughout the app
 */
export const db = new BlueNinjaDB();

/**
 * Initialize database on app startup
 * Runs migrations, checks health, etc.
 */
export async function initializeDatabase(): Promise<boolean> {
  try {
    logger.info('🔧 Initializing database...');

    // Open database connection
    await db.open();

    // Check database health
    const isHealthy = await checkDatabaseHealth();
    if (!isHealthy) {
      throw new Error('Database health check failed');
    }

    logger.info('✅ Database initialized successfully');
    return true;
  } catch (error) {
    logger.error('❌ Database initialization failed', { error });
    return false;
  }
}

/**
 * Health check function
 * Verifies database is accessible and all tables exist
 */
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    // Try to count records in main table
    const userCount = await db.users.count();
    const questionCount = await db.questions.count();
    const assessmentCount = await db.assessments.count();

    logger.debug('📊 Database health status', {
      users: userCount,
      questions: questionCount,
      assessments: assessmentCount,
    });

    return true;
  } catch (error) {
    logger.error('❌ Database health check failed', { error });
    return false;
  }
}

/**
 * Get database statistics
 * Useful for debugging and monitoring
 */
export async function getDatabaseStats() {
  try {
    const stats = {
      users: await db.users.count(),
      userProfiles: await db.userProfiles.count(),
      questions: await db.questions.count(),
      assessments: await db.assessments.count(),
      progress: await db.progress.count(),
      dailyMissions: await db.dailyMissions.count(),
      adminData: await db.adminData.count(),
      syncLogs: await db.syncLogs.count(),
      timestamp: new Date().toISOString(),
    };

    return stats;
  } catch (error) {
    logger.error('Failed to get database stats', { error });
    throw error;
  }
}

/**
 * Clear entire database
 * ⚠️ WARNING: This deletes ALL data
 */
export async function clearDatabase(): Promise<void> {
  try {
    logger.warn('🗑️ Clearing entire database...');
    await db.delete();
    await db.open();
    logger.info('✅ Database cleared');
  } catch (error) {
    logger.error('❌ Failed to clear database', { error });
    throw error;
  }
}

/**
 * Export database as JSON for backup
 * Excludes syncLogs for cleaner exports
 */
export async function exportDatabaseAsJSON() {
  try {
    const data = {
      users: await db.users.toArray(),
      userProfiles: await db.userProfiles.toArray(),
      questions: await db.questions.toArray(),
      assessments: await db.assessments.toArray(),
      progress: await db.progress.toArray(),
      dailyMissions: await db.dailyMissions.toArray(),
      adminData: await db.adminData.toArray(),
      exportedAt: new Date().toISOString(),
    };

    return data;
  } catch (error) {
    logger.error('Failed to export database', { error });
    throw error;
  }
}
