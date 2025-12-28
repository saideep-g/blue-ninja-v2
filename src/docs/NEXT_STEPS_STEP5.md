# Step 5: IndexedDB Setup with Dexie 🗓️

**Status**: 🔸️ **READY TO START**  
**Duration**: 3-4 hours  
**Dependencies**: Steps 1-4 (all complete)  
**Current Date**: December 28, 2025

---

## 🎈 What We're Building

An **offline-first database** using Dexie that:
- ✅ Stores data locally in IndexedDB
- ✅ Handles online/offline transitions smoothly
- ✅ Syncs with Firestore when online
- ✅ Works completely offline
- ✅ Fully typed with TypeScript

---

## 📊 Overview of What to Create

```
src/
└── services/
    └── idb/                    ⭐ CREATE THIS FOLDER
        ├── db.ts              # Database initialization
        ├── schemas.ts         # Database table schemas
        ├── operations.ts      # CRUD helper functions
        ├── sync.ts           # Sync logic (online/offline)
        └── index.ts          # Exports

src/
└── types/
    ├── idb.ts             # Type definitions
    ├── user.ts            # User types
    ├── assessment.ts      # Assessment types
    └── index.ts           # Re-export
```

---

## 📋 Database Schema (8 Collections)

### 1. **users** - User accounts
```typescript
{
  id: string (primary key)
  email: string
  displayName: string
  photoURL?: string
  role: 'student' | 'teacher' | 'admin'
  createdAt: number (timestamp)
  updatedAt: number (timestamp)
  offline: boolean
}
```

### 2. **userProfiles** - Extended user info
```typescript
{
  userId: string (primary key)
  grade?: string
  school?: string
  preferredLanguage: 'en' | 'te' | 'hi'
  theme: 'light' | 'dark' | 'system'
  notifications: boolean
  updatedAt: number
}
```

### 3. **questions** - Question database
```typescript
{
  id: string (primary key)
  template: string // 'mcq', 'fill-blank', 'essay', etc.
  subject: string
  topic: string
  level: 'easy' | 'medium' | 'hard'
  content: string
  options?: string[]
  answer: string
  explanation: string
  createdBy: string (admin id)
  createdAt: number
  updatedAt: number
  version: number
}
```

### 4. **assessments** - Student assessments
```typescript
{
  id: string (primary key)
  userId: string
  type: 'diagnostic' | 'daily' | 'practice'
  status: 'in_progress' | 'completed' | 'abandoned'
  startedAt: number
  completedAt?: number
  duration: number // milliseconds
  score?: number
  answers: {[questionId]: string}
  synced: boolean
}
```

### 5. **progress** - User progress tracking
```typescript
{
  id: string (primary key)
  userId: string
  date: string (YYYY-MM-DD)
  questionsAttempted: number
  questionsCorrect: number
  timeSpent: number // seconds
  topics: {[topic]: {attempted, correct}}
  synced: boolean
}
```

### 6. **dailyMissions** - Daily tasks
```typescript
{
  id: string (primary key)
  userId: string
  date: string (YYYY-MM-DD)
  mission: string
  description: string
  completed: boolean
  completedAt?: number
  reward?: number
  synced: boolean
}
```

### 7. **adminData** - Admin configuration
```typescript
{
  id: string (primary key)
  key: string (unique)
  value: any
  updatedBy: string
  updatedAt: number
  version: number
}
```

### 8. **syncLog** - Sync history
```typescript
{
  id: number (auto-increment primary key)
  timestamp: number
  action: 'upload' | 'download' | 'sync'
  entity: string // 'assessments', 'progress', etc.
  status: 'pending' | 'success' | 'failed'
  error?: string
  recordCount: number
}
```

---

## 🗓️ Step 5 Implementation

### PART A: Setup (30 minutes)

#### 1. Create folder structure

```bash
mkdir -p src/services/idb
touch src/services/idb/{db.ts,schemas.ts,operations.ts,sync.ts,index.ts}
touch src/types/idb.ts
```

#### 2. Create types for IDB

**`src/types/idb.ts`**:

```typescript
export interface User {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: 'student' | 'teacher' | 'admin';
  createdAt: number;
  updatedAt: number;
  offline: boolean;
}

export interface UserProfile {
  userId: string;
  grade?: string;
  school?: string;
  preferredLanguage: 'en' | 'te' | 'hi';
  theme: 'light' | 'dark' | 'system';
  notifications: boolean;
  updatedAt: number;
}

export interface Question {
  id: string;
  template: string;
  subject: string;
  topic: string;
  level: 'easy' | 'medium' | 'hard';
  content: string;
  options?: string[];
  answer: string;
  explanation: string;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
  version: number;
}

export interface Assessment {
  id: string;
  userId: string;
  type: 'diagnostic' | 'daily' | 'practice';
  status: 'in_progress' | 'completed' | 'abandoned';
  startedAt: number;
  completedAt?: number;
  duration: number;
  score?: number;
  answers: Record<string, string>;
  synced: boolean;
}

export interface Progress {
  id: string;
  userId: string;
  date: string;
  questionsAttempted: number;
  questionsCorrect: number;
  timeSpent: number;
  topics: Record<string, { attempted: number; correct: number }>;
  synced: boolean;
}

export interface DailyMission {
  id: string;
  userId: string;
  date: string;
  mission: string;
  description: string;
  completed: boolean;
  completedAt?: number;
  reward?: number;
  synced: boolean;
}

export interface AdminData {
  id: string;
  key: string;
  value: unknown;
  updatedBy: string;
  updatedAt: number;
  version: number;
}

export interface SyncLog {
  id?: number;
  timestamp: number;
  action: 'upload' | 'download' | 'sync';
  entity: string;
  status: 'pending' | 'success' | 'failed';
  error?: string;
  recordCount: number;
}
```

### PART B: Database Initialization (45 minutes)

#### 3. Create database instance

**`src/services/idb/db.ts`**:

```typescript
import Dexie, { type Table } from 'dexie';
import type {
  User,
  UserProfile,
  Question,
  Assessment,
  Progress,
  DailyMission,
  AdminData,
  SyncLog,
} from '../../types/idb';

export class BlueNinjaDB extends Dexie {
  users!: Table<User>;
  userProfiles!: Table<UserProfile>;
  questions!: Table<Question>;
  assessments!: Table<Assessment>;
  progress!: Table<Progress>;
  dailyMissions!: Table<DailyMission>;
  adminData!: Table<AdminData>;
  syncLogs!: Table<SyncLog>;

  constructor() {
    super('BlueNinjaDB');
    this.version(1).stores({
      users: 'id, email',
      userProfiles: 'userId',
      questions: 'id, subject, topic, level',
      assessments: 'id, userId, type, [userId+type]',
      progress: 'id, userId, date, [userId+date]',
      dailyMissions: 'id, userId, date, [userId+date]',
      adminData: 'id, key',
      syncLogs: '++id, timestamp, entity, status',
    });
  }
}

// Create singleton instance
export const db = new BlueNinjaDB();

// Health check function
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    // Try to access the database
    const count = await db.users.count();
    console.log(`✅ Database healthy. Users: ${count}`);
    return true;
  } catch (error) {
    console.error('❌ Database error:', error);
    return false;
  }
}
```

#### 4. Create schemas helper

**`src/services/idb/schemas.ts`**:

```typescript
import { z } from 'zod';

// User schema
export const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  displayName: z.string(),
  photoURL: z.string().optional(),
  role: z.enum(['student', 'teacher', 'admin']),
  createdAt: z.number(),
  updatedAt: z.number(),
  offline: z.boolean(),
});

// UserProfile schema
export const userProfileSchema = z.object({
  userId: z.string(),
  grade: z.string().optional(),
  school: z.string().optional(),
  preferredLanguage: z.enum(['en', 'te', 'hi']),
  theme: z.enum(['light', 'dark', 'system']),
  notifications: z.boolean(),
  updatedAt: z.number(),
});

// Question schema
export const questionSchema = z.object({
  id: z.string(),
  template: z.string(),
  subject: z.string(),
  topic: z.string(),
  level: z.enum(['easy', 'medium', 'hard']),
  content: z.string(),
  options: z.array(z.string()).optional(),
  answer: z.string(),
  explanation: z.string(),
  createdBy: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
  version: z.number(),
});

// Assessment schema
export const assessmentSchema = z.object({
  id: z.string(),
  userId: z.string(),
  type: z.enum(['diagnostic', 'daily', 'practice']),
  status: z.enum(['in_progress', 'completed', 'abandoned']),
  startedAt: z.number(),
  completedAt: z.number().optional(),
  duration: z.number(),
  score: z.number().optional(),
  answers: z.record(z.string()),
  synced: z.boolean(),
});

// Progress schema
export const progressSchema = z.object({
  id: z.string(),
  userId: z.string(),
  date: z.string(),
  questionsAttempted: z.number(),
  questionsCorrect: z.number(),
  timeSpent: z.number(),
  topics: z.record(z.object({ attempted: z.number(), correct: z.number() })),
  synced: z.boolean(),
});

// DailyMission schema
export const dailyMissionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  date: z.string(),
  mission: z.string(),
  description: z.string(),
  completed: z.boolean(),
  completedAt: z.number().optional(),
  reward: z.number().optional(),
  synced: z.boolean(),
});

// Validation helpers
export function validateUser(data: unknown) {
  return userSchema.parse(data);
}

export function validateQuestion(data: unknown) {
  return questionSchema.parse(data);
}

export function validateAssessment(data: unknown) {
  return assessmentSchema.parse(data);
}
```

### PART C: CRUD Operations (45 minutes)

#### 5. Create operations helper

**`src/services/idb/operations.ts`**:

```typescript
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

// ===== ADMIN DATA OPERATIONS =====
export async function saveAdminData(key: string, value: unknown, updatedBy: string) {
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
```

### PART D: Sync Logic (45 minutes)

#### 6. Create sync handler

**`src/services/idb/sync.ts`**:

```typescript
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
```

#### 7. Create exports

**`src/services/idb/index.ts`**:

```typescript
export { db, checkDatabaseHealth } from './db';
export * from './operations';
export * from './sync';
export * from './schemas';
```

---

## 🧪 Testing Step 5

### In Browser DevTools

1. Open DevTools (F12)
2. Go to **Application → Storage → IndexedDB**
3. Should see **BlueNinjaDB** database
4. Should have all 8 tables

### Manual Testing

```typescript
// In browser console
import { db, saveUser, getUser, getOnlineStatus } from './services/idb';

// Test 1: Save a user
const testUser = {
  id: 'test-1',
  email: 'test@example.com',
  displayName: 'Test User',
  role: 'student' as const,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  offline: false,
};

await saveUser(testUser);
console.log('✅ User saved');

// Test 2: Retrieve user
const retrieved = await getUser('test-1');
console.log('✅ User retrieved:', retrieved);

// Test 3: Check online status
const status = getOnlineStatus();
console.log('👏 Online status:', status);
```

### Offline Testing

1. Open DevTools
2. Go to **Network** tab
3. Check **Offline** checkbox
4. Refresh page
5. App should still work
6. Data should load from IndexedDB
7. Uncheck **Offline**
8. Sync should trigger automatically

---

## ✅ Acceptance Criteria

Step 5 is complete when:

- [ ] All 8 Dexie tables created with correct schemas
- [ ] All type definitions in `src/types/idb.ts`
- [ ] All CRUD operations implemented
- [ ] Sync logic handles online/offline transitions
- [ ] Data persists after page refresh
- [ ] IndexedDB visible in DevTools
- [ ] Zero TypeScript errors
- [ ] ESLint passes
- [ ] Console has no errors
- [ ] Offline testing works

---

## 🎈 After You Complete Step 5

1. **Commit your changes**:
   ```bash
   git add src/services/idb src/types/idb.ts
   git commit -m "feat: Step 5 - IndexedDB setup with Dexie"
   ```

2. **Update PROGRESS.md**:
   - Mark Step 5 as complete
   - Add notes about any issues

3. **Ready for Step 6**:
   - Next: Firestore optimization
   - Read: `01_PHASE1_FINAL_STEPS.md` - Step 6 section

---

## 🚨 Common Pitfalls

❌ **Don't**: Use localStorage/sessionStorage  
✅ **Do**: Use Dexie for all persistence

❌ **Don't**: Hard-code table names  
✅ **Do**: Use string constants from schemas

❌ **Don't**: Forget error handling  
✅ **Do**: Add try-catch to all DB operations

❌ **Don't**: Skip type validation  
✅ **Do**: Use Zod schemas to validate data

---

## 👋 Next Steps

**You're here**: Step 5 - IndexedDB Setup  
**Next**: Step 6 - Firestore Optimization (read: `01_PHASE1_FINAL_STEPS.md`)

**Estimated time to complete**:
- Step 5: 3-4 hours (today)
- Step 6: 2-3 hours
- Step 7: 3-4 hours
- Steps 8-10: 4-5 hours
- **Phase 1 Total**: ~15-20 hours

---

**Ready? Let's code! 🚀**
