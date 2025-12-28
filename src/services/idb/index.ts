/**
 * IndexedDB Service Exports
 * Central export point for all database operations
 */

// Database
export {
  db,
  initializeDatabase,
  checkDatabaseHealth,
  getDatabaseStats,
  clearDatabase,
  exportDatabaseAsJSON,
} from './db';

// CRUD Operations
export {
  // User operations
  saveUser,
  getUser,
  getUserByEmail,
  deleteUser,
  getAllUsers,
  // Profile operations
  saveUserProfile,
  getUserProfile,
  deleteUserProfile,
  // Question operations
  saveQuestion,
  getQuestion,
  getQuestionsByTopic,
  getQuestionsByLevel,
  saveQuestions,
  getAllQuestions,
  deleteQuestion,
  // Assessment operations
  saveAssessment,
  getAssessment,
  getUserAssessments,
  getUnSyncedAssessments,
  deleteAssessment,
  // Progress operations
  saveProgress,
  getProgressByDate,
  getUserProgressRange,
  getUnSyncedProgress,
  // Daily mission operations
  saveDailyMission,
  getDailyMissionsForDate,
  getUnSyncedMissions,
  deleteDailyMission,
  // Batch operations
  markAsSynced,
  clearUserData,
} from './operations';

// Sync
export {
  initializeSyncListeners,
  getOnlineStatus,
  logSync,
  getUnSyncedRecords,
  performSync,
  setupPeriodicSync,
  getSyncHistory,
  clearSyncHistory,
  getSyncStats,
} from './sync';

// Types
export type {
  User,
  UserProfile,
  Question,
  Assessment,
  Progress,
  DailyMission,
  AdminData,
  SyncLog,
} from '../../types/idb';
