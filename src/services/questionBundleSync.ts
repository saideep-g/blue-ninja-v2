// @ts-nocheck
/**
 * Question Bundle Sync Service
 * Manages syncing question bundles from Firestore to IndexedDB
 * Uses metadata collection for efficient updates
 */

import { collection, getDocs, doc, getDoc, query, where } from 'firebase/firestore';
import { db as firestore } from './db/firebase';
import { indexedDBService, type CachedQuestionBundle, type QuestionBundleMetadata } from './indexedDBService';

interface SyncProgress {
    total: number;
    synced: number;
    failed: number;
    status: 'idle' | 'syncing' | 'complete' | 'error';
}

class QuestionBundleSyncService {
    private syncInProgress = false;
    private syncProgress: SyncProgress = {
        total: 0,
        synced: 0,
        failed: 0,
        status: 'idle'
    };

    /**
     * Get all question bundle metadata from Firestore
     */
    async getAllBundleMetadata(): Promise<QuestionBundleMetadata[]> {
        try {
            const metadataRef = collection(firestore, 'question_bundle_metadata');
            const snapshot = await getDocs(metadataRef);

            return snapshot.docs.map(doc => ({
                bundleId: doc.id,
                ...doc.data()
            } as QuestionBundleMetadata));
        } catch (error) {
            console.error('Error fetching bundle metadata:', error);
            return [];
        }
    }

    /**
     * Get metadata for a specific grade
     */
    async getMetadataByGrade(grade: number): Promise<QuestionBundleMetadata[]> {
        try {
            const metadataRef = collection(firestore, 'question_bundle_metadata');
            const q = query(metadataRef, where('grade', '==', grade));
            const snapshot = await getDocs(q);

            return snapshot.docs.map(doc => ({
                bundleId: doc.id,
                ...doc.data()
            } as QuestionBundleMetadata));
        } catch (error) {
            console.error('Error fetching metadata by grade:', error);
            return [];
        }
    }

    /**
     * Fetch a single question bundle from Firestore
     */
    async fetchBundleFromFirestore(bundleId: string): Promise<any[] | null> {
        try {
            const bundleRef = doc(firestore, 'question_bundles', bundleId);
            const bundleSnap = await getDoc(bundleRef);

            if (bundleSnap.exists()) {
                const data = bundleSnap.data();
                return data.questions || [];
            }

            return null;
        } catch (error) {
            console.error(`Error fetching bundle ${bundleId}:`, error);
            return null;
        }
    }

    /**
     * Sync a single bundle to IndexedDB
     */
    async syncBundle(metadata: QuestionBundleMetadata): Promise<boolean> {
        try {
            // Check if update is needed
            const needsUpdate = await indexedDBService.needsUpdate(metadata.bundleId, metadata.version);

            if (!needsUpdate) {
                console.log(`📦 Bundle ${metadata.bundleId} is up to date`);
                return true;
            }

            // Fetch questions from Firestore
            const questions = await this.fetchBundleFromFirestore(metadata.bundleId);

            if (!questions) {
                console.error(`❌ Failed to fetch bundle ${metadata.bundleId}`);
                return false;
            }

            // Save to IndexedDB
            const cachedBundle: CachedQuestionBundle = {
                bundleId: metadata.bundleId,
                metadata: metadata,
                questions: questions,
                cachedAt: new Date().toISOString(),
                lastSyncedVersion: metadata.version
            };

            await indexedDBService.saveBundle(cachedBundle);
            console.log(`✅ Synced bundle: ${metadata.bundleId} (${questions.length} questions)`);

            return true;
        } catch (error) {
            console.error(`Error syncing bundle ${metadata.bundleId}:`, error);
            return false;
        }
    }

    /**
     * Sync all bundles for a specific grade
     */
    async syncGradeBundles(grade: number, onProgress?: (progress: SyncProgress) => void): Promise<void> {
        if (this.syncInProgress) {
            console.warn('⚠️ Sync already in progress');
            return;
        }

        this.syncInProgress = true;
        this.syncProgress = {
            total: 0,
            synced: 0,
            failed: 0,
            status: 'syncing'
        };

        try {
            console.log(`🔄 Starting sync for Grade ${grade}...`);

            // Get metadata for this grade
            const metadataList = await this.getMetadataByGrade(grade);
            this.syncProgress.total = metadataList.length;

            if (onProgress) onProgress({ ...this.syncProgress });

            // Sync each bundle
            for (const metadata of metadataList) {
                const success = await this.syncBundle(metadata);

                if (success) {
                    this.syncProgress.synced++;
                } else {
                    this.syncProgress.failed++;
                }

                if (onProgress) onProgress({ ...this.syncProgress });
            }

            this.syncProgress.status = 'complete';
            console.log(`✅ Sync complete: ${this.syncProgress.synced}/${this.syncProgress.total} bundles synced`);

            if (onProgress) onProgress({ ...this.syncProgress });
        } catch (error) {
            console.error('Error during sync:', error);
            this.syncProgress.status = 'error';
            if (onProgress) onProgress({ ...this.syncProgress });
        } finally {
            this.syncInProgress = false;
        }
    }

    /**
     * Sync only updated bundles (efficient sync)
     */
    async syncUpdatedBundles(grade: number, onProgress?: (progress: SyncProgress) => void): Promise<void> {
        if (this.syncInProgress) {
            console.warn('⚠️ Sync already in progress');
            return;
        }

        this.syncInProgress = true;
        this.syncProgress = {
            total: 0,
            synced: 0,
            failed: 0,
            status: 'syncing'
        };

        try {
            console.log(`🔄 Checking for updates (Grade ${grade})...`);

            // Get metadata
            const metadataList = await this.getMetadataByGrade(grade);

            // Filter only bundles that need updating
            const bundlesToSync: QuestionBundleMetadata[] = [];
            for (const metadata of metadataList) {
                const needsUpdate = await indexedDBService.needsUpdate(metadata.bundleId, metadata.version);
                if (needsUpdate) {
                    bundlesToSync.push(metadata);
                }
            }

            this.syncProgress.total = bundlesToSync.length;

            if (bundlesToSync.length === 0) {
                console.log('✅ All bundles are up to date');
                this.syncProgress.status = 'complete';
                if (onProgress) onProgress({ ...this.syncProgress });
                return;
            }

            console.log(`📥 Syncing ${bundlesToSync.length} updated bundles...`);
            if (onProgress) onProgress({ ...this.syncProgress });

            // Sync only updated bundles
            for (const metadata of bundlesToSync) {
                const success = await this.syncBundle(metadata);

                if (success) {
                    this.syncProgress.synced++;
                } else {
                    this.syncProgress.failed++;
                }

                if (onProgress) onProgress({ ...this.syncProgress });
            }

            this.syncProgress.status = 'complete';
            console.log(`✅ Update complete: ${this.syncProgress.synced}/${this.syncProgress.total} bundles synced`);

            if (onProgress) onProgress({ ...this.syncProgress });
        } catch (error) {
            console.error('Error during sync:', error);
            this.syncProgress.status = 'error';
            if (onProgress) onProgress({ ...this.syncProgress });
        } finally {
            this.syncInProgress = false;
        }
    }

    /**
     * Get current sync progress
     */
    getSyncProgress(): SyncProgress {
        return { ...this.syncProgress };
    }

    /**
     * Check if sync is in progress
     */
    isSyncing(): boolean {
        return this.syncInProgress;
    }

    /**
     * Clear all cached bundles (for testing/reset)
     */
    async clearCache(): Promise<void> {
        await indexedDBService.clearAll();
        console.log('🗑️ Cache cleared');
    }
}

// Export singleton instance
export const questionBundleSyncService = new QuestionBundleSyncService();
