/**
 * Sync Management for Online/Offline Transitions
 * Handles automatic syncing when connection is restored
 */

import { db } from './db';
import type { SyncLog } from '../../types/idb';
import {
  getUnSyncedAssessments,
  getUnSyncedProgress,
  getUnSyncedMissions,
  markAsSynced,
} from './operations';
import { logger } from '../logging';

/**
 * Track online/offline status
 */
let isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

/**
 * Initialize sync listeners
 * Call this once on app startup
 */
export function initializeSyncListeners(): void {
  if (typeof window === 'undefined') {
    return; // Not in browser
  }

  window.addEventListener('online', () => {
    isOnline = true;
    logger.info('📡 Online - initiating sync...');
    performSync().catch((error) => {
      logger.error('Auto-sync failed on reconnection', { error });
    });
  });

  window.addEventListener('offline', () => {
    isOnline = false;
    logger.warn('🚫 Offline mode enabled');
  });

  // Setup periodic sync when online
  setupPeriodicSync();
}

/**
 * Get current online status
 */
export function getOnlineStatus(): boolean {
  return isOnline;
}

/**
 * Log a sync event
 */
export async function logSync(
  action: 'upload' | 'download' | 'sync',
  entity: string,
  status: 'pending' | 'success' | 'failed',
  recordCount: number,
  error?: string
): Promise<void> {
  try {
    const syncLog: SyncLog = {
      timestamp: Date.now(),
      action,
      entity,
      status,
      recordCount,
      error,
    };

    await db.syncLogs.add(syncLog);
  } catch (error) {
    logger.error('Failed to log sync event', { error, action, entity });
  }
}

/**
 * Get all unsynced records
 */
export async function getUnSyncedRecords() {
  try {
    const unSyncedAssessments = await getUnSyncedAssessments();
    const unSyncedProgress = await getUnSyncedProgress();
    const unSyncedMissions = await getUnSyncedMissions();

    return {
      assessments: unSyncedAssessments,
      progress: unSyncedProgress,
      missions: unSyncedMissions,
      total: unSyncedAssessments.length + unSyncedProgress.length + unSyncedMissions.length,
    };
  } catch (error) {
    logger.error('Failed to get unsynced records', { error });
    throw error;
  }
}

/**
 * Main sync function
 * This will be connected to Firestore in Phase 2
 * For now, it just logs what would be synced
 */
export async function performSync(): Promise<void> {
  if (!isOnline) {
    logger.debug('🚫 Offline - skipping sync');
    return;
  }

  logger.info('🔄 Starting sync...');

  try {
    // Get unsynced records
    const unsynced = await getUnSyncedRecords();

    if (unsynced.total === 0) {
      logger.info('✅ All data synced');
      return;
    }

    logger.info('📚 Found unsynced records', {
      assessments: unsynced.assessments.length,
      progress: unsynced.progress.length,
      missions: unsynced.missions.length,
    });

    // Phase 2: Send to Firestore
    // For now, simulate sync after a delay
    if (process.env.NODE_ENV === 'development') {
      logger.debug('📤 (DEV) Would sync to Firestore:', unsynced);
    }

    // Mark as synced (in production, only after Firestore confirms)
    if (unsynced.assessments.length > 0) {
      await markAsSynced(
        'assessments',
        unsynced.assessments.map((a) => a.id)
      );
    }

    if (unsynced.progress.length > 0) {
      await markAsSynced(
        'progress',
        unsynced.progress.map((p) => p.id)
      );
    }

    if (unsynced.missions.length > 0) {
      await markAsSynced(
        'missions',
        unsynced.missions.map((m) => m.id)
      );
    }

    // Log successful sync
    await logSync('sync', 'all', 'success', unsynced.total);
    logger.info('✅ Sync completed successfully', { recordCount: unsynced.total });
  } catch (error) {
    logger.error('❌ Sync error', { error });
    await logSync(
      'sync',
      'all',
      'failed',
      0,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

/**
 * Periodic sync
 * Syncs every 5 minutes when online
 */
export function setupPeriodicSync(): void {
  if (typeof window === 'undefined') {
    return; // Not in browser
  }

  // Sync every 5 minutes
  const SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes

  setInterval(() => {
    if (isOnline) {
      performSync().catch((error) => {
        logger.warn('Periodic sync failed', { error });
      });
    }
  }, SYNC_INTERVAL);

  logger.info('✅ Periodic sync setup (every 5 minutes)');
}

/**
 * Get sync history
 */
export async function getSyncHistory(limit: number = 20): Promise<SyncLog[]> {
  try {
    logger.debug('Fetching sync history', { limit });
    return await db.syncLogs
      .orderBy('timestamp')
      .reverse()
      .limit(limit)
      .toArray();
  } catch (error) {
    logger.error('Failed to get sync history', { error });
    throw error;
  }
}

/**
 * Clear sync history
 */
export async function clearSyncHistory(): Promise<void> {
  try {
    logger.info('Clearing sync history');
    await db.syncLogs.clear();
  } catch (error) {
    logger.error('Failed to clear sync history', { error });
    throw error;
  }
}

/**
 * Get sync stats
 */
export async function getSyncStats() {
  try {
    const unsynced = await getUnSyncedRecords();
    const lastSync = await db.syncLogs
      .orderBy('timestamp')
      .reverse()
      .first();

    return {
      isOnline,
      unsynced: unsynced.total,
      lastSync: lastSync ? new Date(lastSync.timestamp).toISOString() : null,
      lastSyncStatus: lastSync?.status || null,
    };
  } catch (error) {
    logger.error('Failed to get sync stats', { error });
    throw error;
  }
}
