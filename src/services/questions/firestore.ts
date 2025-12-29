/**
 * src/services/firestoreQuestionService.ts
 * ==========================================
 * 
 * Service for publishing validated V3 Question Bundles to Firestore.
 */

import { doc, setDoc } from 'firebase/firestore';
import { questionBundlesCollection } from "../db/firestore";

interface PublishOptions {
  userId?: string;
  bankId?: string;
}

interface PublishSummary {
  bankId: string;
  userId: string;
  startedAt: string;
  completedAt: string | null;
  totalPublished: number;
  totalFailed: number;
  published: string[];
  failed: any[];
  durationMs?: number;
}

/**
 * Publish a generic JSON bundle to Firestore as a single document.
 * Optimized for V3 read patterns (fetch once, use locally).
 */
export async function publishBundleToFirestore(bundleData: any, options: PublishOptions = {}): Promise<PublishSummary> {
  const { userId = 'unknown', bankId = 'default' } = options;
  const startTime = Date.now();
  const bundleId = bundleData.bundle_id || `bundle_${Date.now()}`;

  console.log(`[FirestoreQuestionService] Publishing bundle: ${bundleId}`);

  const summary: PublishSummary = {
    bankId,
    userId,
    startedAt: new Date().toISOString(),
    completedAt: null,
    totalPublished: 0,
    totalFailed: 0,
    published: [],
    failed: []
  };

  try {
    const docRef = doc(questionBundlesCollection, bundleId);

    // Add metadata for easier querying/management
    const finalData = {
      ...bundleData,
      _metadata: {
        uploadedAt: new Date().toISOString(),
        uploadedBy: userId,
        sizeBytes: JSON.stringify(bundleData).length,
        itemCount: Array.isArray(bundleData.items) ? bundleData.items.length : 0
      }
    };

    await setDoc(docRef, finalData);

    summary.totalPublished = 1;
    summary.published.push(bundleId);
    summary.completedAt = new Date().toISOString();
    summary.durationMs = Date.now() - startTime;

    console.log(`[FirestoreQuestionService] Bundle ${bundleId} published successfully.`);
    return summary;

  } catch (error: any) {
    console.error('[FirestoreQuestionService] Bundle publish error:', error);
    summary.totalFailed = 1;
    summary.failed.push({ itemId: bundleId, error: error.message });
    throw error;
  }
}

export default {
  publishBundleToFirestore
};
