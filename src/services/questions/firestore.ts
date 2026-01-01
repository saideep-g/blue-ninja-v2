/**
 * src/services/firestoreQuestionService.ts
 * ==========================================
 * 
 * Service for publishing validated V3 Question Bundles to Firestore.
 */

import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
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

/**
 * Deletes a specific question from a bundle.
 */
export async function deleteQuestionFromBundle(bundleId: string, questionId: string): Promise<void> {
  const docRef = doc(questionBundlesCollection, bundleId);
  const snapshot = await getDoc(docRef);

  if (!snapshot.exists()) throw new Error(`Bundle ${bundleId} not found`);

  const data = snapshot.data();
  if (!data.items || !Array.isArray(data.items)) throw new Error("Bundle has no valid items array");

  // Filter out the question
  const originalLength = data.items.length;
  console.log(`[Firestore] Deleting ${questionId} from bundle ${bundleId}. Bundle has ${originalLength} items.`);

  const newItems = data.items.filter((item: any) => {
    const iId = item.item_id || item.id;
    // Debug first few checks
    // console.log(`Comparing ${iId} vs ${questionId}`);
    return iId !== questionId;
  });

  if (newItems.length === originalLength) {
    console.warn(`[Firestore] Question ${questionId} already missing from bundle ${bundleId}. Treating as success.`);
    // Log available IDs to help debug
    const availableIds = data.items.map((i: any) => i.item_id || i.id).slice(0, 5);
    console.log(`Available IDs (first 5):`, availableIds);
    return; // Return success so local cleanup can proceed
  }

  await updateDoc(docRef, {
    items: newItems,
    updated_at: new Date().toISOString()
  });
  console.log(`[Firestore] Deleted question ${questionId} from bundle ${bundleId}`);
}

/**
 * Updates a specific question within a bundle.
 */
export async function updateQuestionInBundle(bundleId: string, questionId: string, newItemData: any): Promise<void> {
  const docRef = doc(questionBundlesCollection, bundleId);
  const snapshot = await getDoc(docRef);

  if (!snapshot.exists()) throw new Error(`Bundle ${bundleId} not found`);

  const data = snapshot.data();
  if (!data.items || !Array.isArray(data.items)) throw new Error("Bundle has no valid items array");

  const originalLength = data.items.length;
  // Replace the item
  let found = false;
  const newItems = data.items.map((item: any) => {
    const iId = item.item_id || item.id;
    if (iId === questionId) {
      found = true;
      return newItemData;
    }
    return item;
  });

  if (!found) {
    throw new Error(`Question ${questionId} not found in bundle ${bundleId}`);
  }

  await updateDoc(docRef, {
    items: newItems,
    updated_at: new Date().toISOString()
  });
  console.log(`[Firestore] Updated question ${questionId} in bundle ${bundleId}`);
}

export default {
  publishBundleToFirestore,
  deleteQuestionFromBundle,
  updateQuestionInBundle
};
