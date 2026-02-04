// @ts-nocheck
/**
 * IndexedDB Service for caching question bundles locally
 * Uses Dexie for simplified IndexedDB operations
 * Enables offline access and fast analytics
 */

import Dexie, { type Table } from 'dexie';

export interface QuestionBundleMetadata {
    bundleId: string;
    bundleName: string;
    subject: string;
    grade: number;
    moduleId: string;
    questionCount: number;
    lastUpdated: string;
    version: number;
    difficulty?: string;
    topics?: string[];
}

export interface CachedQuestionBundle {
    bundleId: string;
    metadata: QuestionBundleMetadata;
    questions: any[];
    cachedAt: string;
    lastSyncedVersion: number;
}

/**
 * Extended Dexie database with question bundles table
 */
class QuestionBundleDB extends Dexie {
    questionBundles!: Table<CachedQuestionBundle>;

    constructor() {
        super('BlueNinjaDB');

        // Version 3: Add questionBundles table
        this.version(3).stores({
            // Existing tables from version 2
            users: 'id, email',
            userProfiles: 'userId',
            questions: 'id, subject, topic, level',
            assessments: 'id, userId, type, [userId+type], synced',
            progress: 'id, userId, date, [userId+date], synced',
            dailyMissions: 'id, userId, date, [userId+date], synced',
            adminData: 'id, key',
            syncLogs: '++id, timestamp, entity, status',
            streaks: 'id, userId',
            badges: 'id, userId, type',
            missionCompletions: 'id, userId, missionId, date, [userId+date]',
            // New table for question bundles
            questionBundles: 'bundleId, metadata.grade, metadata.subject, metadata.moduleId'
        });
    }
}

// Create singleton instance
const db = new QuestionBundleDB();

/**
 * Service class for managing question bundles in IndexedDB
 */
class IndexedDBService {
    /**
     * Get a question bundle by ID
     */
    async getBundle(bundleId: string): Promise<CachedQuestionBundle | undefined> {
        try {
            return await db.questionBundles.get(bundleId);
        } catch (error) {
            console.error('Error getting bundle:', error);
            return undefined;
        }
    }

    /**
     * Get all bundles for a specific grade
     */
    async getBundlesByGrade(grade: number): Promise<CachedQuestionBundle[]> {
        try {
            return await db.questionBundles
                .where('metadata.grade')
                .equals(grade)
                .toArray();
        } catch (error) {
            console.error('Error getting bundles by grade:', error);
            return [];
        }
    }

    /**
     * Get bundles by subject
     */
    async getBundlesBySubject(subject: string): Promise<CachedQuestionBundle[]> {
        try {
            return await db.questionBundles
                .where('metadata.subject')
                .equals(subject)
                .toArray();
        } catch (error) {
            console.error('Error getting bundles by subject:', error);
            return [];
        }
    }

    /**
     * Get bundles by grade and subject
     */
    async getBundlesByGradeAndSubject(grade: number, subject: string): Promise<CachedQuestionBundle[]> {
        try {
            return await db.questionBundles
                .where('metadata.grade')
                .equals(grade)
                .and(bundle => bundle.metadata.subject === subject)
                .toArray();
        } catch (error) {
            console.error('Error getting bundles by grade and subject:', error);
            return [];
        }
    }

    /**
     * Save or update a question bundle
     */
    async saveBundle(bundle: CachedQuestionBundle): Promise<void> {
        try {
            await db.questionBundles.put(bundle);
            console.log(`✅ Saved bundle: ${bundle.bundleId}`);
        } catch (error) {
            console.error('Error saving bundle:', error);
            throw error;
        }
    }

    /**
     * Save multiple bundles at once
     */
    async saveBundles(bundles: CachedQuestionBundle[]): Promise<void> {
        try {
            await db.questionBundles.bulkPut(bundles);
            console.log(`✅ Saved ${bundles.length} bundles`);
        } catch (error) {
            console.error('Error saving bundles:', error);
            throw error;
        }
    }

    /**
     * Delete a question bundle
     */
    async deleteBundle(bundleId: string): Promise<void> {
        try {
            await db.questionBundles.delete(bundleId);
            console.log(`🗑️ Deleted bundle: ${bundleId}`);
        } catch (error) {
            console.error('Error deleting bundle:', error);
            throw error;
        }
    }

    /**
     * Clear all bundles (useful for testing or reset)
     */
    async clearAll(): Promise<void> {
        try {
            await db.questionBundles.clear();
            console.log('🗑️ Cleared all bundles');
        } catch (error) {
            console.error('Error clearing bundles:', error);
            throw error;
        }
    }

    /**
     * Get all bundle IDs
     */
    async getAllBundleIds(): Promise<string[]> {
        try {
            const bundles = await db.questionBundles.toArray();
            return bundles.map(b => b.bundleId);
        } catch (error) {
            console.error('Error getting bundle IDs:', error);
            return [];
        }
    }

    /**
     * Check if a bundle needs updating
     */
    async needsUpdate(bundleId: string, latestVersion: number): Promise<boolean> {
        try {
            const cached = await this.getBundle(bundleId);
            if (!cached) return true;
            return cached.lastSyncedVersion < latestVersion;
        } catch (error) {
            console.error('Error checking bundle update status:', error);
            return true;
        }
    }

    /**
     * Get bundle count
     */
    async getBundleCount(): Promise<number> {
        try {
            return await db.questionBundles.count();
        } catch (error) {
            console.error('Error getting bundle count:', error);
            return 0;
        }
    }

    /**
     * Get storage info
     */
    async getStorageInfo(): Promise<{ bundleCount: number; totalSize: number }> {
        try {
            const bundles = await db.questionBundles.toArray();
            const totalSize = JSON.stringify(bundles).length;
            return {
                bundleCount: bundles.length,
                totalSize: totalSize
            };
        } catch (error) {
            console.error('Error getting storage info:', error);
            return { bundleCount: 0, totalSize: 0 };
        }
    }
}

// Export singleton instance
export const indexedDBService = new IndexedDBService();

// Export db instance for advanced usage
export { db as questionBundleDB };
