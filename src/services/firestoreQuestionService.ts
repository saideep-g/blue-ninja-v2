/**
 * src/services/firestoreQuestionService.ts
 * ==========================================
 * 
 * Service for publishing validated V2 format questions to Firestore.
 */

import { getFirestore, collection, doc, setDoc, updateDoc, getDoc, query, where, getDocs, writeBatch } from 'firebase/firestore';

const db = getFirestore();
const QUESTIONS_COLLECTION = 'questions';
const PUBLISH_LOGS_COLLECTION = 'publish_logs';
const QUESTION_BANKS_COLLECTION = 'question_banks';

interface PublishOptions {
  userId?: string;
  bankId?: string;
  batchSize?: number;
  onProgress?: (progress: any) => void;
  conflictResolution?: 'SKIP' | 'OVERWRITE' | 'MERGE';
  validateBeforePublish?: boolean;
}

interface PublishSummary {
  bankId: string;
  userId: string;
  startedAt: string;
  completedAt: string | null;
  totalAttempted: number;
  totalPublished: number;
  totalSkipped: number;
  totalFailed: number;
  published: string[];
  skipped: any[];
  failed: any[];
  stats: {
    byTemplate: Record<string, number>;
    byModule: Record<string, number>;
    byAtom: Record<string, number>;
  };
  errors: any[];
  warnings: any[];
  durationMs?: number;
}

/**
 * Publish validated V2 questions to Firestore
 */
export async function publishQuestionsToFirestore(questions: any[], options: PublishOptions = {}): Promise<PublishSummary> {
  const {
    userId = 'unknown',
    bankId = 'default',
    batchSize = 500,
    onProgress = null,
    conflictResolution = 'SKIP'
  } = options;

  const startTime = Date.now();
  const summary: PublishSummary = {
    bankId,
    userId,
    startedAt: new Date().toISOString(),
    completedAt: null,
    totalAttempted: questions.length,
    totalPublished: 0,
    totalSkipped: 0,
    totalFailed: 0,
    published: [],
    skipped: [],
    failed: [],
    stats: {
      byTemplate: {},
      byModule: {},
      byAtom: {}
    },
    errors: [],
    warnings: []
  };

  try {
    // Validate input
    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error('No questions provided for publishing');
    }

    console.log(
      `[FirestoreQuestionService] Starting publish: ${questions.length} items to bank "${bankId}"`
    );

    // Step 1: Check for duplicates in Firestore
    const existingIds = await checkExistingQuestions(
      questions.map((q) => q.item_id),
      bankId
    );

    console.log(
      `[FirestoreQuestionService] Found ${existingIds.size} existing question IDs`
    );

    // Step 2: Separate new and existing questions
    const newQuestions: any[] = [];
    const existingQuestions: any[] = [];

    for (const q of questions) {
      if (existingIds.has(q.item_id)) {
        existingQuestions.push(q);
      } else {
        newQuestions.push(q);
      }
    }

    // Step 3: Handle conflicts based on resolution strategy
    for (const q of existingQuestions) {
      if (conflictResolution === 'SKIP') {
        summary.skipped.push({
          itemId: q.item_id,
          reason: 'DUPLICATE_EXISTS',
          message: `Question ${q.item_id} already exists in Firestore`
        });
        summary.totalSkipped++;
      } else if (conflictResolution === 'OVERWRITE' || conflictResolution === 'MERGE') {
        newQuestions.push(q);
      }
    }

    // Step 4: Publish in batches
    const batches = chunkArray(newQuestions, batchSize);
    let batchNumber = 0;

    for (const questionBatch of batches) {
      batchNumber++;
      console.log(
        `[FirestoreQuestionService] Publishing batch ${batchNumber}/${batches.length} (${questionBatch.length} items)`
      );

      const batchResult = await publishBatch(
        questionBatch,
        bankId,
        conflictResolution
      );

      summary.totalPublished += batchResult.published;
      summary.totalFailed += batchResult.failed;
      summary.published.push(...batchResult.publishedIds);
      summary.failed.push(...batchResult.failedItems);
      summary.errors.push(...batchResult.errors);

      // Update stats
      for (const q of questionBatch) {
        const template = q.template_id || 'UNKNOWN';
        const module = q.module_id || 'UNCATEGORIZED';
        const atom = q.atom_id || 'UNCATEGORIZED';

        summary.stats.byTemplate[template] =
          (summary.stats.byTemplate[template] || 0) + 1;
        summary.stats.byModule[module] = (summary.stats.byModule[module] || 0) + 1;
        summary.stats.byAtom[atom] = (summary.stats.byAtom[atom] || 0) + 1;
      }

      // Progress callback
      if (onProgress) {
        onProgress({
          batch: batchNumber,
          totalBatches: batches.length,
          itemsProcessed: summary.totalPublished + summary.totalFailed,
          totalItems: newQuestions.length,
          percentComplete: Math.round(
            ((summary.totalPublished + summary.totalFailed) / newQuestions.length) *
            100
          )
        });
      }
    }

    // Step 5: Update question bank metadata
    await updateQuestionBankMetadata(bankId, {
      totalQuestions: (await countQuestionsInBank(bankId)),
      lastUpdated: new Date().toISOString(),
      lastUpdatedBy: userId,
      latestBatch: {
        publishedAt: new Date().toISOString(),
        published: summary.totalPublished,
        failed: summary.totalFailed
      }
    });

    // Step 6: Save publish log
    const completedAt = new Date().toISOString();
    const duration = Date.now() - startTime;
    summary.completedAt = completedAt;
    summary.durationMs = duration;

    await savePublishLog(summary);

    console.log(
      `[FirestoreQuestionService] Publish complete: ${summary.totalPublished} published, ${summary.totalFailed} failed in ${duration}ms`
    );

    return summary;
  } catch (error: any) {
    console.error('[FirestoreQuestionService] Publish error:', error);
    summary.errors.push({
      severity: 'CRITICAL',
      code: 'PUBLISH_ERROR',
      message: error.message,
      timestamp: new Date().toISOString()
    });
    summary.completedAt = new Date().toISOString();
    summary.durationMs = Date.now() - startTime;

    // Save failed log
    await savePublishLog(summary);

    throw error;
  }
}

async function publishBatch(questions: any[], bankId: string, conflictResolution: string) {
  const result: any = {
    published: 0,
    failed: 0,
    publishedIds: [],
    failedItems: [],
    errors: []
  };

  const batch = writeBatch(db);
  let operationCount = 0;
  const maxOpsPerBatch = 500;
  let batchNum = 1;

  for (const question of questions) {
    const docRef = doc(
      collection(db, QUESTIONS_COLLECTION),
      `${question.item_id}_${question.module_id || 'general'}`
    );

    try {
      const docData = {
        ...question,
        bankId,
        publishedAt: new Date().toISOString(),
        publishedToFirestore: true,
        firebaseDocId: docRef.id,
        metadata: {
          itemId: question.item_id,
          templateId: question.template_id,
          moduleId: question.module_id,
          atomId: question.atom_id,
          difficulty: question.difficulty || 1,
          createdAt: new Date().toISOString(),
          version: '2.0'
        }
      };

      setDoc(docRef, docData);
      batch.set(docRef, docData);

      result.publishedIds.push(question.item_id);
      result.published++;
      operationCount++;

      // Commit batch if reaching limit
      if (operationCount >= maxOpsPerBatch) {
        await batch.commit();
        console.log(
          `[FirestoreQuestionService] Committed batch ${batchNum} (${operationCount} operations)`
        );
        operationCount = 0;
        batchNum++;
      }
    } catch (error: any) {
      console.error(
        `[FirestoreQuestionService] Error publishing ${question.item_id}:`,
        error
      );
      result.failed++;
      result.failedItems.push({
        itemId: question.item_id,
        error: error.message,
        severity: 'ERROR'
      });
      result.errors.push({
        itemId: question.item_id,
        code: 'PUBLISH_FAILED',
        message: error.message
      });
    }
  }

  // Commit remaining batch
  if (operationCount > 0) {
    try {
      await batch.commit();
      console.log(
        `[FirestoreQuestionService] Committed final batch ${batchNum} (${operationCount} operations)`
      );
    } catch (error: any) {
      console.error('[FirestoreQuestionService] Error committing final batch:', error);
      result.failed += operationCount;
      result.errors.push({
        code: 'BATCH_COMMIT_FAILED',
        message: error.message,
        severity: 'CRITICAL'
      });
    }
  }

  return result;
}

async function checkExistingQuestions(itemIds: string[], bankId: string): Promise<Set<string>> {
  const existing = new Set<string>();

  try {
    const q = query(
      collection(db, QUESTIONS_COLLECTION),
      where('bankId', '==', bankId),
      where('metadata.itemId', 'in', itemIds.slice(0, 30)) // Firebase limit
    );

    const snapshot = await getDocs(q);
    snapshot.forEach((doc) => {
      existing.add(doc.data().metadata?.itemId);
    });

    // Handle remaining IDs (Firebase has 30 item limit on 'in' queries)
    for (let i = 30; i < itemIds.length; i += 30) {
      const batch = itemIds.slice(i, i + 30);
      const q2 = query(
        collection(db, QUESTIONS_COLLECTION),
        where('bankId', '==', bankId),
        where('metadata.itemId', 'in', batch)
      );
      const snapshot2 = await getDocs(q2);
      snapshot2.forEach((doc) => {
        existing.add(doc.data().metadata?.itemId);
      });
    }
  } catch (error) {
    console.warn(
      '[FirestoreQuestionService] Error checking existing questions:',
      error
    );
  }

  return existing;
}

async function updateQuestionBankMetadata(bankId: string, metadata: any) {
  try {
    const bankRef = doc(db, QUESTION_BANKS_COLLECTION, bankId);
    const bankSnap = await getDoc(bankRef);

    if (bankSnap.exists()) {
      await updateDoc(bankRef, metadata);
    } else {
      await setDoc(bankRef, {
        bankId,
        createdAt: new Date().toISOString(),
        ...metadata
      });
    }
  } catch (error) {
    console.warn(
      '[FirestoreQuestionService] Error updating bank metadata:',
      error
    );
  }
}

async function countQuestionsInBank(bankId: string) {
  try {
    const q = query(
      collection(db, QUESTIONS_COLLECTION),
      where('bankId', '==', bankId)
    );
    const snapshot = await getDocs(q);
    return snapshot.size;
  } catch (error) {
    console.warn(
      '[FirestoreQuestionService] Error counting questions:',
      error
    );
    return 0;
  }
}

async function savePublishLog(summary: PublishSummary) {
  try {
    const logRef = doc(
      collection(db, PUBLISH_LOGS_COLLECTION),
      `${summary.bankId}_${Date.now()}`
    );
    await setDoc(logRef, summary);
    console.log('[FirestoreQuestionService] Publish log saved');
  } catch (error) {
    console.warn('[FirestoreQuestionService] Error saving publish log:', error);
  }
}

function chunkArray(array: any[], size: number) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

export default {
  publishQuestionsToFirestore
};
