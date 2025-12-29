/**
 * src/services/indexedDBService.ts
 * ================================
 * 
 * Production-ready IndexedDB service using Dexie library for persistent storage.
 */

import Dexie, { Table } from 'dexie';

// ============================================================================
// DATABASE SCHEMA INTERFACES
// ============================================================================

export interface PendingQuestion {
  qId: string;
  sessionId: string | null;
  originalData: any;
  editedData: any | null;
  status: 'DRAFT' | 'VALIDATING' | 'VALID' | 'NEEDS_REVIEW' | 'READY_TO_PUBLISH';
  validationResult: any | null;
  errors: any[];
  warnings: any[];
  isReadyToPublish: boolean;
  publishAttempts: number;
  createdAt: number;
  lastModified: number;
}

export interface UploadSession {
  sessionId: string;
  fileName: string;
  fileSize: number;
  uploadedAt: number;
  totalQuestions: number;
  questionsProcessed: number;
  questionsPublished: number;
  questionsWithErrors: number;
  questionsSkipped: number;
  adminId: string | null;
  adminEmail: string | null;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  notes: string;
  errorLog: any[];
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
}

export interface ValidationCacheEntry {
  qId: string;
  validationResult: any;
  cachedAt: number;
  expiresAt: number;
}

export interface BrowserCacheItem {
  id: string; // Question ID or Item ID
  bundleId: string;
  data: any;
  cachedAt: number;
}

export class AdminPanelDB extends Dexie {
  pendingQuestions!: Table<PendingQuestion, string>;
  uploadSessions!: Table<UploadSession, string>;
  validationCache!: Table<ValidationCacheEntry, string>;
  browserCache!: Table<BrowserCacheItem, string>;

  constructor() {
    super('AdminPanelDB');
    this.version(1).stores({
      pendingQuestions: 'qId, sessionId, status, lastModified',
      uploadSessions: 'sessionId, uploadedAt, status',
      validationCache: 'qId, expiresAt',
      browserCache: 'id, bundleId'
    });
  }
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class IndexedDBService {
  private db: AdminPanelDB;
  private isInitialized: boolean;
  private initError: Error | null;

  constructor() {
    this.db = new AdminPanelDB();
    this.isInitialized = false;
    this.initError = null;
  }

  /**
   * Initialize the database
   * Should be called once on app startup
   */
  async initDatabase(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    const MAX_ATTEMPTS = 3;
    let attempt = 0;
    let lastError: any;

    while (attempt < MAX_ATTEMPTS) {
      try {
        await this.db.open();
        this.isInitialized = true;
        console.log('[IndexedDB] Database initialized successfully');
        return;
      } catch (error) {
        attempt++;
        lastError = error;
        console.warn(`[IndexedDB] Initialization attempt ${attempt} failed:`, error);

        if (attempt < MAX_ATTEMPTS) {
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100));
        }
      }
    }

    this.initError = lastError instanceof Error ? lastError : new Error(String(lastError));
    console.error('[IndexedDB] Failed to initialize after', MAX_ATTEMPTS, 'attempts');
    throw new Error(`Failed to initialize IndexedDB: ${lastError?.message || lastError}`);
  }

  /**
   * Ensures database is initialized
   */
  private async _ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initDatabase();
    }
  }

  // ============================================================================
  // PENDING QUESTIONS OPERATIONS
  // ============================================================================

  async addPendingQuestion(qId: string, questionData: Partial<PendingQuestion>) {
    await this._ensureInitialized();
    try {
      const data: PendingQuestion = {
        qId,
        sessionId: questionData.sessionId || null,
        originalData: questionData.originalData || {},
        editedData: questionData.editedData || null,
        status: questionData.status || 'DRAFT',
        validationResult: questionData.validationResult || null,
        errors: questionData.errors || [],
        warnings: questionData.warnings || [],
        isReadyToPublish: questionData.isReadyToPublish || false,
        publishAttempts: 0,
        createdAt: Date.now(),
        lastModified: Date.now()
      };

      await this.db.pendingQuestions.put(data);
      console.log(`[IndexedDB] Added pending question: ${qId}`);
    } catch (error) {
      console.error('[IndexedDB] Error adding pending question:', error);
      throw error;
    }
  }

  async updatePendingQuestion(qId: string, updates: Partial<PendingQuestion>) {
    await this._ensureInitialized();
    try {
      const existing = await this.db.pendingQuestions.get(qId);
      if (!existing) {
        throw new Error(`Question ${qId} not found`);
      }

      const updated = {
        ...existing,
        ...updates,
        lastModified: Date.now()
      };

      await this.db.pendingQuestions.put(updated);
      console.log(`[IndexedDB] Updated pending question: ${qId}`);
    } catch (error) {
      console.error('[IndexedDB] Error updating pending question:', error);
      throw error;
    }
  }

  async getPendingQuestion(qId: string) {
    await this._ensureInitialized();
    try {
      return await this.db.pendingQuestions.get(qId);
    } catch (error) {
      console.error('[IndexedDB] Error getting pending question:', error);
      throw error;
    }
  }

  async getAllPendingQuestions(sessionId: string | null = null) {
    await this._ensureInitialized();
    try {
      let query;

      if (sessionId) {
        query = this.db.pendingQuestions.where('sessionId').equals(sessionId);
      } else {
        query = this.db.pendingQuestions;
      }

      // Dexie Table and Collection behave slightly differently, simplified:
      if (sessionId) {
        return await (query as any).toArray();
      }
      return await this.db.pendingQuestions.toArray();

    } catch (error) {
      console.error('[IndexedDB] Error getting all pending questions:', error);
      throw error;
    }
  }

  async deletePendingQuestion(qId: string) {
    await this._ensureInitialized();
    try {
      await this.db.pendingQuestions.delete(qId);
      console.log(`[IndexedDB] Deleted pending question: ${qId}`);
    } catch (error) {
      console.error('[IndexedDB] Error deleting pending question:', error);
      throw error;
    }
  }

  async deleteBatchBySessionId(sessionId: string) {
    await this._ensureInitialized();
    try {
      const questions = await this.db.pendingQuestions
        .where('sessionId')
        .equals(sessionId)
        .toArray();

      for (const q of questions) {
        await this.db.pendingQuestions.delete(q.qId);
      }

      console.log(`[IndexedDB] Deleted ${questions.length} questions for session ${sessionId}`);
    } catch (error) {
      console.error('[IndexedDB] Error deleting batch:', error);
      throw error;
    }
  }

  // ============================================================================
  // UPLOAD SESSION OPERATIONS
  // ============================================================================

  async createSession(sessionId: string, metadata: Partial<UploadSession>) {
    await this._ensureInitialized();
    try {
      const session: UploadSession = {
        sessionId,
        fileName: metadata.fileName || 'unknown',
        fileSize: metadata.fileSize || 0,
        uploadedAt: metadata.uploadedAt || Date.now(),
        totalQuestions: metadata.totalQuestions || 0,
        questionsProcessed: 0,
        questionsPublished: 0,
        questionsWithErrors: 0,
        questionsSkipped: 0,
        adminId: metadata.adminId || null,
        adminEmail: metadata.adminEmail || null,
        status: 'IN_PROGRESS',
        notes: metadata.notes || '',
        errorLog: [],
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      await this.db.uploadSessions.put(session);
      console.log(`[IndexedDB] Created upload session: ${sessionId}`);
    } catch (error) {
      console.error('[IndexedDB] Error creating session:', error);
      throw error;
    }
  }

  async getSession(sessionId: string) {
    await this._ensureInitialized();
    try {
      return await this.db.uploadSessions.get(sessionId);
    } catch (error) {
      console.error('[IndexedDB] Error getting session:', error);
      throw error;
    }
  }

  async updateSession(sessionId: string, updates: Partial<UploadSession>) {
    await this._ensureInitialized();
    try {
      const session = await this.db.uploadSessions.get(sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      const updated = {
        ...session,
        ...updates,
        updatedAt: Date.now()
      };

      await this.db.uploadSessions.put(updated);
      console.log(`[IndexedDB] Updated session: ${sessionId}`);
    } catch (error) {
      console.error('[IndexedDB] Error updating session:', error);
      throw error;
    }
  }

  async closeSession(sessionId: string) {
    await this._ensureInitialized();
    try {
      await this.updateSession(sessionId, {
        status: 'COMPLETED',
        completedAt: Date.now()
      });
      console.log(`[IndexedDB] Closed session: ${sessionId}`);
    } catch (error) {
      console.error('[IndexedDB] Error closing session:', error);
      throw error;
    }
  }

  async getAllSessions(limit = 20) {
    await this._ensureInitialized();
    try {
      return await this.db.uploadSessions
        .orderBy('uploadedAt')
        .reverse()
        .limit(limit)
        .toArray();
    } catch (error) {
      console.error('[IndexedDB] Error getting all sessions:', error);
      throw error;
    }
  }

  // ============================================================================
  // VALIDATION CACHE OPERATIONS
  // ============================================================================

  async cacheValidationResult(qId: string, result: any, ttlHours = 24) {
    await this._ensureInitialized();
    try {
      const now = Date.now();
      const expiresAt = now + ttlHours * 60 * 60 * 1000;

      const cacheEntry: ValidationCacheEntry = {
        qId,
        validationResult: result,
        cachedAt: now,
        expiresAt
      };

      await this.db.validationCache.put(cacheEntry);
      console.log(`[IndexedDB] Cached validation for: ${qId}`);
    } catch (error) {
      console.error('[IndexedDB] Error caching validation:', error);
      throw error;
    }
  }

  async getValidationCache(qId: string) {
    await this._ensureInitialized();
    try {
      const cache = await this.db.validationCache.get(qId);

      if (!cache) {
        return undefined;
      }

      if (Date.now() > cache.expiresAt) {
        await this.db.validationCache.delete(qId);
        return undefined;
      }

      return cache.validationResult;
    } catch (error) {
      console.error('[IndexedDB] Error getting validation cache:', error);
      throw error;
    }
  }

  async clearValidationCache(qId: string) {
    await this._ensureInitialized();
    try {
      await this.db.validationCache.delete(qId);
      console.log(`[IndexedDB] Cleared cache for: ${qId}`);
    } catch (error) {
      console.error('[IndexedDB] Error clearing cache:', error);
      throw error;
    }
  }

  // ============================================================================
  // CLEANUP & MAINTENANCE
  // ============================================================================

  async clearExpiredCache() {
    await this._ensureInitialized();
    try {
      const now = Date.now();
      const expired = await this.db.validationCache
        .where('expiresAt')
        .below(now)
        .toArray();

      for (const entry of expired) {
        await this.db.validationCache.delete(entry.qId);
      }

      console.log(`[IndexedDB] Cleared ${expired.length} expired cache entries`);
      return expired.length;
    } catch (error) {
      console.error('[IndexedDB] Error clearing expired cache:', error);
      throw error;
    }
  }

  async clearOldSessions(daysOld = 30) {
    await this._ensureInitialized();
    try {
      const cutoffTime = Date.now() - daysOld * 24 * 60 * 60 * 1000;

      const oldSessions = await this.db.uploadSessions
        .where('uploadedAt')
        .below(cutoffTime)
        .toArray();

      for (const session of oldSessions) {
        await this.deleteBatchBySessionId(session.sessionId);
        await this.db.uploadSessions.delete(session.sessionId);
      }

      console.log(`[IndexedDB] Deleted ${oldSessions.length} old sessions`);
      return oldSessions.length;
    } catch (error) {
      console.error('[IndexedDB] Error clearing old sessions:', error);
      throw error;
    }
  }

  async getStats() {
    await this._ensureInitialized();
    try {
      const questionCount = await this.db.pendingQuestions.count();
      const sessionCount = await this.db.uploadSessions.count();
      const cacheCount = await this.db.validationCache.count();

      const stats = {
        pendingQuestions: questionCount,
        uploadSessions: sessionCount,
        cachedValidations: cacheCount,
        totalRecords: questionCount + sessionCount + cacheCount,
        estimatedSizeMB: ((questionCount * 5 + sessionCount * 2 + cacheCount * 3) / 1024).toFixed(2),
        lastUpdated: new Date().toISOString()
      };

      console.log('[IndexedDB] Statistics:', stats);
      return stats;
    } catch (error) {
      console.error('[IndexedDB] Error getting stats:', error);
      throw error;
    }
  }

  // ============================================================================
  // EXPORT/IMPORT (BACKUP)
  // ============================================================================

  async exportSession(sessionId: string) {
    await this._ensureInitialized();
    try {
      const session = await this.getSession(sessionId);
      const questions = await this.getAllPendingQuestions(sessionId);

      return {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        session,
        questions,
        questionCount: questions.length
      };
    } catch (error) {
      console.error('[IndexedDB] Error exporting session:', error);
      throw error;
    }
  }

  async importSession(data: any) {
    await this._ensureInitialized();
    try {
      if (data.version !== '1.0') {
        throw new Error('Unsupported export version');
      }

      await this.db.uploadSessions.put(data.session);

      for (const question of data.questions) {
        await this.db.pendingQuestions.put(question);
      }

      console.log(`[IndexedDB] Imported session with ${data.questionCount} questions`);
    } catch (error) {
      console.error('[IndexedDB] Error importing session:', error);
      throw error;
    }
  }

  // ============================================================================
  // BROWSER CACHE OPERATIONS
  // ============================================================================

  async cacheBrowserItems(items: any[]) {
    await this._ensureInitialized();
    try {
      const now = Date.now();
      const cacheItems: BrowserCacheItem[] = items.map(item => ({
        id: item.id || item.item_id || `unknown_${Math.random()}`,
        bundleId: item._bundleId || 'manual',
        data: item,
        cachedAt: now
      }));

      // Bulk put is faster - use clear/bulkAdd or bulkPut
      await this.db.browserCache.bulkPut(cacheItems);
      console.log(`[IndexedDB] Cached ${items.length} browser items`);
    } catch (error) {
      console.error('[IndexedDB] Error caching browser items:', error);
      throw error;
    }
  }

  async getBrowserItems() {
    await this._ensureInitialized();
    try {
      const items = await this.db.browserCache.toArray();
      return items.map(i => i.data);
    } catch (error) {
      console.error('[IndexedDB] Error getting browser items:', error);
      throw error;
    }
  }

  async clearBrowserCache() {
    await this._ensureInitialized();
    try {
      await this.db.browserCache.clear();
      console.log('[IndexedDB] Browser cache cleared');
    } catch (error) {
      console.error('[IndexedDB] Error clearing browser cache:', error);
      throw error;
    }
  }

  async clearAll() {
    await this._ensureInitialized();
    try {
      await this.db.pendingQuestions.clear();
      await this.db.uploadSessions.clear();
      await this.db.validationCache.clear();
      console.warn('[IndexedDB] All data cleared!');
    } catch (error) {
      console.error('[IndexedDB] Error clearing all data:', error);
      throw error;
    }
  }
}

// Create singleton instance
let instance: IndexedDBService | null = null;

export function getIndexedDBService() {
  if (!instance) {
    instance = new IndexedDBService();
  }
  return instance;
}

export default IndexedDBService;
