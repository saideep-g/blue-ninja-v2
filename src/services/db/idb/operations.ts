import { db } from './db';
import type {
  User,
  Question,
  Assessment,
  Progress,
  DailyMission,
  UserProfile,
} from '../../types/idb';

// ===== USER OPERATIONS =====
export async function saveUser(user: User): Promise<string> {
  return await db.users.put(user);
}

export async function getUser(id: string): Promise<User | undefined> {
  return await db.users.get(id);
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
  return await db.users.where('email').equals(email).first();
}

export async function deleteUser(id: string): Promise<void> {
  await db.users.delete(id);
}

// ===== USER PROFILE OPERATIONS =====
export async function saveUserProfile(profile: UserProfile): Promise<string> {
  return await db.userProfiles.put(profile);
}

export async function getUserProfile(userId: string): Promise<UserProfile | undefined> {
  return await db.userProfiles.get(userId);
}

// ===== QUESTION OPERATIONS =====
export async function saveQuestion(question: Question): Promise<string> {
  return await db.questions.put(question);
}

export async function getQuestion(id: string): Promise<Question | undefined> {
  return await db.questions.get(id);
}

export async function getQuestionsByTopic(topic: string): Promise<Question[]> {
  return await db.questions.where('topic').equals(topic).toArray();
}

export async function getQuestionsByLevel(level: string): Promise<Question[]> {
  return await db.questions.where('level').equals(level).toArray();
}

export async function saveQuestions(questions: Question[]): Promise<void> {
  await db.questions.bulkPut(questions);
}

export async function getAllQuestions(): Promise<Question[]> {
  return await db.questions.toArray();
}

// ===== ASSESSMENT OPERATIONS =====
export async function saveAssessment(assessment: Assessment): Promise<string> {
  return await db.assessments.put(assessment);
}

export async function getAssessment(id: string): Promise<Assessment | undefined> {
  return await db.assessments.get(id);
}

export async function getUserAssessments(userId: string): Promise<Assessment[]> {
  return await db.assessments.where('userId').equals(userId).toArray();
}

export async function getUnSyncedAssessments(): Promise<Assessment[]> {
  return await db.assessments.where('synced').equals(false).toArray();
}

export async function markAssessmentAsSynced(id: string): Promise<void> {
  await db.assessments.update(id, { synced: true });
}

// ===== PROGRESS OPERATIONS =====
export async function saveProgress(progress: Progress): Promise<string> {
  return await db.progress.put(progress);
}

export async function getProgressByDate(
  userId: string,
  date: string
): Promise<Progress | undefined> {
  return await db.progress
    .where('[userId+date]')
    .equals([userId, date])
    .first();
}

export async function getUserProgressRange(
  userId: string,
  startDate: string,
  endDate: string
): Promise<Progress[]> {
  return await db.progress
    .where('userId')
    .equals(userId)
    .filter((p) => p.date >= startDate && p.date <= endDate)
    .toArray();
}

export async function getUnSyncedProgress(): Promise<Progress[]> {
  return await db.progress.where('synced').equals(false).toArray();
}

export async function markProgressAsSynced(id: string): Promise<void> {
  await db.progress.update(id, { synced: true });
}

// ===== DAILY MISSION OPERATIONS =====
export async function saveDailyMission(mission: DailyMission): Promise<string> {
  return await db.dailyMissions.put(mission);
}

export async function getDailyMissionsForDate(
  userId: string,
  date: string
): Promise<DailyMission[]> {
  return await db.dailyMissions
    .where('[userId+date]')
    .equals([userId, date])
    .toArray();
}

export async function getUnSyncedMissions(): Promise<DailyMission[]> {
  return await db.dailyMissions.where('synced').equals(false).toArray();
}

export async function markMissionAsSynced(id: string): Promise<void> {
  await db.dailyMissions.update(id, { synced: true });
}

// ===== ADMIN DATA OPERATIONS =====
export async function saveAdminData(
  key: string,
  value: unknown,
  updatedBy: string
) {
  return await db.adminData.put({
    id: key,
    key,
    value,
    updatedBy,
    updatedAt: Date.now(),
    version: 1,
  });
}

export async function getAdminData(key: string) {
  return await db.adminData.get(key);
}

// ===== CLEANUP OPERATIONS =====
export async function clearAllData(): Promise<void> {
  await db.delete();
  await db.open();
}

export async function clearUserData(userId: string): Promise<void> {
  await db.assessments.where('userId').equals(userId).delete();
  await db.progress.where('userId').equals(userId).delete();
  await db.dailyMissions.where('userId').equals(userId).delete();
  await db.userProfiles.where('userId').equals(userId).delete();
}
