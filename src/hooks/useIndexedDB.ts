/**
 * src/hooks/useIndexedDB.ts
 * ==========================
 * 
 * React hook for accessing IndexedDB service with automatic initialization
 * and lifecycle management.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { IndexedDBService, PendingQuestion, UploadSession } from '../services/indexedDBService';

/**
 * Custom React hook for IndexedDB operations
 */
export function useIndexedDB() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dbRef = useRef<IndexedDBService | null>(null);
  const isMountedRef = useRef(true);

  // Initialize database on mount
  useEffect(() => {
    let isMounted = true;
    isMountedRef.current = true;

    const initialize = async () => {
      try {
        if (!dbRef.current) {
          dbRef.current = new IndexedDBService();
        }

        await dbRef.current.initDatabase();

        if (isMounted && isMountedRef.current) {
          setIsInitialized(true);
          setError(null);
        }
      } catch (err: any) {
        if (isMounted && isMountedRef.current) {
          setError(err.message || 'Failed to initialize IndexedDB');
          setIsInitialized(false);
          console.error('[useIndexedDB] Initialization error:', err);
        }
      }
    };

    initialize();

    return () => {
      isMounted = false;
      isMountedRef.current = false;
    };
  }, []);

  // Helper to safely execute DB operations
  const executeOperation = useCallback(async <T>(operation: () => Promise<T>): Promise<T> => {
    if (!dbRef.current || !isInitialized) {
      throw new Error('Database not initialized');
    }
    try {
      setIsLoading(true);
      const result = await operation();
      if (isMountedRef.current) setError(null);
      return result;
    } catch (err: any) {
      if (isMountedRef.current) setError(err.message);
      throw err;
    } finally {
      if (isMountedRef.current) setIsLoading(false);
    }
  }, [isInitialized]);

  // Wrapped methods
  const addPendingQuestion = useCallback((qId: string, questionData: Partial<PendingQuestion>) => {
    return executeOperation(() => dbRef.current!.addPendingQuestion(qId, questionData));
  }, [executeOperation]);

  const updatePendingQuestion = useCallback((qId: string, updates: Partial<PendingQuestion>) => {
    return executeOperation(() => dbRef.current!.updatePendingQuestion(qId, updates));
  }, [executeOperation]);

  const getPendingQuestion = useCallback((qId: string) => {
    return executeOperation(() => dbRef.current!.getPendingQuestion(qId));
  }, [executeOperation]);

  const getAllPendingQuestions = useCallback((sessionId: string | null = null) => {
    return executeOperation(() => dbRef.current!.getAllPendingQuestions(sessionId));
  }, [executeOperation]);

  const deletePendingQuestion = useCallback((qId: string) => {
    return executeOperation(() => dbRef.current!.deletePendingQuestion(qId));
  }, [executeOperation]);

  const deleteBatchBySessionId = useCallback((sessionId: string) => {
    return executeOperation(() => dbRef.current!.deleteBatchBySessionId(sessionId));
  }, [executeOperation]);

  // Session operations
  const createSession = useCallback((sessionId: string, metadata: Partial<UploadSession>) => {
    return executeOperation(() => dbRef.current!.createSession(sessionId, metadata));
  }, [executeOperation]);

  const getSession = useCallback((sessionId: string) => {
    return executeOperation(() => dbRef.current!.getSession(sessionId));
  }, [executeOperation]);

  const updateSession = useCallback((sessionId: string, updates: Partial<UploadSession>) => {
    return executeOperation(() => dbRef.current!.updateSession(sessionId, updates));
  }, [executeOperation]);

  const closeSession = useCallback((sessionId: string) => {
    return executeOperation(() => dbRef.current!.closeSession(sessionId));
  }, [executeOperation]);

  const getAllSessions = useCallback((limit = 20) => {
    return executeOperation(() => dbRef.current!.getAllSessions(limit));
  }, [executeOperation]);

  // Validation cache operations
  const cacheValidationResult = useCallback((qId: string, result: any, ttlHours = 24) => {
    return executeOperation(() => dbRef.current!.cacheValidationResult(qId, result, ttlHours));
  }, [executeOperation]);

  const getValidationCache = useCallback((qId: string) => {
    return executeOperation(() => dbRef.current!.getValidationCache(qId));
  }, [executeOperation]);

  const clearValidationCache = useCallback((qId: string) => {
    return executeOperation(() => dbRef.current!.clearValidationCache(qId));
  }, [executeOperation]);

  // Maintenance operations
  const clearExpiredCache = useCallback(() => {
    return executeOperation(() => dbRef.current!.clearExpiredCache());
  }, [executeOperation]);

  const clearOldSessions = useCallback((daysOld = 30) => {
    return executeOperation(() => dbRef.current!.clearOldSessions(daysOld));
  }, [executeOperation]);

  const getStats = useCallback(() => {
    return executeOperation(() => dbRef.current!.getStats());
  }, [executeOperation]);

  // Export/Import operations
  const exportSession = useCallback((sessionId: string) => {
    return executeOperation(() => dbRef.current!.exportSession(sessionId));
  }, [executeOperation]);

  const importSession = useCallback((data: any) => {
    return executeOperation(() => dbRef.current!.importSession(data));
  }, [executeOperation]);

  const clearAll = useCallback(() => {
    return executeOperation(() => dbRef.current!.clearAll());
  }, [executeOperation]);

  // Browser Cache Operations
  const cacheBrowserItems = useCallback((items: any[]) => {
    return executeOperation(() => dbRef.current!.cacheBrowserItems(items));
  }, [executeOperation]);

  const getBrowserItems = useCallback(() => {
    return executeOperation(() => dbRef.current!.getBrowserItems());
  }, [executeOperation]);

  const clearBrowserCache = useCallback(() => {
    return executeOperation(() => dbRef.current!.clearBrowserCache());
  }, [executeOperation]);

  return {
    // State
    isInitialized,
    isLoading,
    error,

    // Question operations
    addPendingQuestion,
    updatePendingQuestion,
    getPendingQuestion,
    getAllPendingQuestions,
    deletePendingQuestion,
    deleteBatchBySessionId,

    // Session operations
    createSession,
    getSession,
    updateSession,
    closeSession,
    getAllSessions,

    // Cache operations
    cacheValidationResult,
    getValidationCache,
    clearValidationCache,
    clearExpiredCache,

    // Maintenance
    clearOldSessions,
    getStats,

    // Export/Import
    exportSession,
    importSession,
    clearAll,

    // Browser Cache
    cacheBrowserItems,
    getBrowserItems,
    clearBrowserCache
  };
}

export default useIndexedDB;
