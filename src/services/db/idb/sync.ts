// @ts-nocheck
import { db } from './db';
import type { SyncLog } from '../../types/idb';

// Track online/offline status
let isOnline = navigator.onLine;

window.addEventListener('online', () => {
  isOnline = true;
  console.log('📏 Online - initiating sync...');
  performSync();
});

window.addEventListener('offline', () => {
  isOnline = false;
  console.log('🚫 Offline mode enabled');
});

// ===== SYNC STATUS =====
export function getOnlineStatus(): boolean {
  return isOnline;
}

export async function logSync(
  action: 'upload' | 'download' | 'sync',
  entity: string,
  status: 'pending' | 'success' | 'failed',
  recordCount: number,
  error?: string
): Promise<void> {
  const syncLog: SyncLog = {
    timestamp: Date.now(),
    action,
    entity,
    status,
    recordCount,
    error,
  };

  await db.syncLogs.add(syncLog);
}

// ===== SYNC OPERATIONS =====
export async function getUnSyncedRecords() {
  const unSyncedAssessments = await db.assessments
    .where('synced')
    .equals(false)
    .toArray();

  const unSyncedProgress = await db.progress.where('synced').equals(false).toArray();

  const unSyncedMissions = await db.dailyMissions
    .where('synced')
    .equals(false)
    .toArray();

  return {
    assessments: unSyncedAssessments,
    progress: unSyncedProgress,
    missions: unSyncedMissions,
  };
}

export async function markAsSynced(
  entity: 'assessments' | 'progress' | 'missions',
  ids: string[]
): Promise<void> {
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
}

// ===== MAIN SYNC FUNCTION =====
export async function performSync(): Promise<void> {
  if (!isOnline) {
    console.log('🚫 Offline - skipping sync');
    return;
  }

  console.log('🔄 Starting sync...');

  try {
    // Get unsynced records
    const unsynced = await getUnSyncedRecords();

    // In Phase 2, this will connect to Firestore
    // For now, just log what would be synced
    console.log('📚 Unsynced records:', unsynced);

    // Log sync attempt
    await logSync(
      'sync',
      'all',
      'success',
      Object.values(unsynced).reduce((sum, arr) => sum + arr.length, 0)
    );
  } catch (error) {
    console.error('❌ Sync error:', error);
    await logSync(
      'sync',
      'all',
      'failed',
      0,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

// ===== PERIODIC SYNC =====
export function setupPeriodicSync(): void {
  // Sync every 5 minutes when online
  setInterval(() => {
    if (isOnline) {
      performSync();
    }
  }, 5 * 60 * 1000);
}

// ===== GET SYNC HISTORY =====
export async function getSyncHistory(limit: number = 20): Promise<SyncLog[]> {
  return await db.syncLogs
    .orderBy('timestamp')
    .reverse()
    .limit(limit)
    .toArray();
}
