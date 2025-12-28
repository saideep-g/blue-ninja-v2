# Phase 1 Implementation Guide - Foundation (Steps 1-10)

**Timeline**: 60-90 hours
**Duration**: 2-3 weeks for 1 developer
**Focus**: Build solid foundation for rest of project

---

## Step-by-Step Breakdown

### STEP 1: Repository Cleanup & Code Inventory (4-6 hours)

**Goal**: Create clean, documented codebase

**Exact Commands**:
```bash
# 1. Create backup branch
git checkout -b backup/before-cleanup
git push origin backup/before-cleanup
git checkout main

# 2. Find all components
find src/components -type f \( -name "*.tsx" -o -name "*.ts" \) | sort > /tmp/all-components.txt
cat /tmp/all-components.txt

# 3. Find all imports of components
grep -r "from.*components" src --include="*.tsx" --include="*.ts" | grep -o "from.*" | sort -u > /tmp/imports.txt
cat /tmp/imports.txt

# 4. Document findings
git add -A
git commit -m "Step 1: Repository cleanup - backup created"
git push
```

**Acceptance Criteria**:
- [ ] Backup branch exists at `backup/before-cleanup`
- [ ] CLEANUP_REPORT.md created with findings
- [ ] DEPENDENCY_MAP.md created
- [ ] No unused components in repository
- [ ] ESLint passes: `npm run lint`

---

### STEP 2: Complete TypeScript Setup (4-6 hours)

**Goal**: 100% TypeScript, strict mode, zero errors

**Create/Update Type Files**:
```typescript
// src/types/models.ts
export interface User {
  id: string;
  email: string;
  username: string;
  role: 'STUDENT' | 'ADMIN';
  profile: UserProfile;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfile {
  class: 6 | 7 | 8;
  theme: 'light' | 'dark';
  dailyQuestionCount: number; // 1-15
  diagnosticQuestionCount: number; // 1-30
  excludedChapters: string[];
}

export interface Question {
  id: string;
  curriculum_version: 'v3';
  subject: string;
  topic: string;
  chapter: string;
  difficulty: 'easy' | 'medium' | 'hard';
  type: string; // mcq, match, fitb, etc.
  questionText: string;
  options: QuestionOption[];
  correctAnswer: string;
  explanation: string;
  imageUrl?: string;
  createdAt: Date;
  updatedBy: string;
}

export interface QuestionOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface Answer {
  id: string;
  userId: string;
  questionId: string;
  selectedOptionId: string;
  isCorrect: boolean;
  timeSpent: number; // seconds
  timestamp: Date;
}
```

```typescript
// src/types/firestore.ts
import { Timestamp } from 'firebase/firestore';

export interface FirestoreUser {
  id: string;
  email: string;
  username: string;
  role: 'STUDENT' | 'ADMIN';
  profile: {
    class: 6 | 7 | 8;
    theme: 'light' | 'dark';
    dailyQuestionCount: number;
    diagnosticQuestionCount: number;
    excludedChapters: string[];
  };
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface FirestoreQuestion {
  id: string;
  curriculum_version: 'v3';
  subject: string;
  topic: string;
  chapter: string;
  difficulty: 'easy' | 'medium' | 'hard';
  type: string;
  question_text: string;
  options: Array<{ id: string; text: string; isCorrect: boolean }>;
  correct_answer: string;
  explanation: string;
  image_url?: string;
  created_at: Timestamp;
  updated_by: string;
}
```

```typescript
// src/types/state.ts
import { User, Question, Answer } from './models';

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
}

export interface UserState {
  profile: User | null;
  isLoading: boolean;
  error: string | null;
}

export interface AssessmentState {
  currentTest: {
    type: 'diagnostic' | 'daily';
    totalQuestions: number;
    currentIndex: number;
    answers: Map<string, string>;
    isComplete: boolean;
  } | null;
}

export interface AdminState {
  questions: Question[];
  isLoading: boolean;
  error: string | null;
  lastSyncTime: Date | null;
}
```

**Verify**:
```bash
# Check types
npm run check-types

# Should show: "No errors!"

# Fix any errors found
```

**Acceptance Criteria**:
- [ ] `npm run check-types` passes
- [ ] All .js files converted to .ts/.tsx
- [ ] No `any` types in codebase
- [ ] TypeScript strict mode enabled
- [ ] All imports are typed

---

### STEP 3: Folder Structure Review (0-2 hours)

**Current State**: Already done! But let's review:

```bash
# Create proper index exports
cat > src/types/__init__.ts << 'EOF'
export * from './models';
export * from './firestore';
export * from './state';
EOF

cat > src/components/__init__.ts << 'EOF'
// Component exports will be added as we create them
EOF

cat > src/services/__init__.ts << 'EOF'
// Service exports will be added as we create them
EOF

cat > src/hooks/__init__.ts << 'EOF'
// Hook exports will be added as we create them  
EOF
```

**Acceptance Criteria**:
- [ ] Barrel exports created in each major folder
- [ ] All imports can use shorter paths
- [ ] Folder structure matches plan

---

### STEP 4: Zustand State Management Setup (4-6 hours)

**Install**:
```bash
npm install zustand
npm run check-types
```

**Create Stores**:

```typescript
// src/store/authStore.ts
import { create } from 'zustand';
import { User } from '../types';
import { logger } from '../services/logger';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,
  error: null,
  isAuthenticated: false,
  setUser: (user) => {
    set({ user, isAuthenticated: !!user });
    logger.info('User set in store', { userId: user?.id });
  },
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => {
    set({ error });
    if (error) logger.error('Auth error', { error });
  },
  logout: () => {
    set({ user: null, isAuthenticated: false, error: null });
    logger.info('User logged out');
  },
}));
```

```typescript
// src/store/userStore.ts
import { create } from 'zustand';
import { User } from '../types';
import { logger } from '../services/logger';

interface UserState {
  profile: User | null;
  isLoading: boolean;
  error: string | null;
  setProfile: (profile: User) => void;
  updateProfile: (updates: Partial<User>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useUserStore = create<UserState>((set) => ({
  profile: null,
  isLoading: false,
  error: null,
  setProfile: (profile) => {
    set({ profile });
    logger.info('User profile set', { userId: profile.id });
  },
  updateProfile: (updates) => set((state) => ({
    profile: state.profile ? { ...state.profile, ...updates } : null,
  })),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => {
    set({ error });
    if (error) logger.error('User store error', { error });
  },
}));
```

```typescript
// src/store/assessmentStore.ts
import { create } from 'zustand';
import { logger } from '../services/logger';

interface Assessment State {
  type: 'diagnostic' | 'daily' | null;
  totalQuestions: number;
  currentIndex: number;
  answers: Map<string, string>;
  isComplete: boolean;
  startAssessment: (type: 'diagnostic' | 'daily', total: number) => void;
  recordAnswer: (questionId: string, optionId: string) => void;
  nextQuestion: () => void;
  completeAssessment: () => void;
  resetAssessment: () => void;
}

export const useAssessmentStore = create<AssessmentState>((set) => ({
  type: null,
  totalQuestions: 0,
  currentIndex: 0,
  answers: new Map(),
  isComplete: false,
  startAssessment: (type, total) => {
    set({
      type,
      totalQuestions: total,
      currentIndex: 0,
      answers: new Map(),
      isComplete: false,
    });
    logger.info('Assessment started', { type, total });
  },
  recordAnswer: (questionId, optionId) => {
    set((state) => {
      const newAnswers = new Map(state.answers);
      newAnswers.set(questionId, optionId);
      return { answers: newAnswers };
    });
  },
  nextQuestion: () => {
    set((state) => ({
      currentIndex: Math.min(state.currentIndex + 1, state.totalQuestions - 1),
    }));
  },
  completeAssessment: () => {
    set({ isComplete: true });
    logger.info('Assessment completed');
  },
  resetAssessment: () => {
    set({
      type: null,
      totalQuestions: 0,
      currentIndex: 0,
      answers: new Map(),
      isComplete: false,
    });
  },
}));
```

```typescript
// src/store/adminStore.ts
import { create } from 'zustand';
import { Question } from '../types';
import { logger } from '../services/logger';

interface AdminState {
  questions: Question[];
  isLoading: boolean;
  error: string | null;
  lastSyncTime: Date | null;
  setQuestions: (questions: Question[]) => void;
  addQuestion: (question: Question) => void;
  updateQuestion: (id: string, updates: Partial<Question>) => void;
  deleteQuestion: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setLastSyncTime: (time: Date) => void;
}

export const useAdminStore = create<AdminState>((set) => ({
  questions: [],
  isLoading: false,
  error: null,
  lastSyncTime: null,
  setQuestions: (questions) => {
    set({ questions });
    logger.info('Questions loaded', { count: questions.length });
  },
  addQuestion: (question) => set((state) => ({
    questions: [...state.questions, question],
  })),
  updateQuestion: (id, updates) => set((state) => ({
    questions: state.questions.map((q) => (q.id === id ? { ...q, ...updates } : q)),
  })),
  deleteQuestion: (id) => set((state) => ({
    questions: state.questions.filter((q) => q.id !== id),
  })),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => {
    set({ error });
    if (error) logger.error('Admin store error', { error });
  },
  setLastSyncTime: (time) => set({ lastSyncTime: time }),
}));
```

**Create Hooks**:

```typescript
// src/hooks/useAuth.ts
import { useAuthStore } from '../store/authStore';

export const useAuth = () => {
  const { user, isLoading, error, isAuthenticated, setUser, logout } = useAuthStore();

  return {
    user,
    isLoading,
    error,
    isAuthenticated,
    setUser,
    logout,
  };
};

// src/hooks/useUser.ts
import { useUserStore } from '../store/userStore';

export const useUser = () => {
  const { profile, isLoading, error, setProfile, updateProfile } = useUserStore();

  return {
    profile,
    isLoading,
    error,
    setProfile,
    updateProfile,
  };
};

// src/hooks/useAssessment.ts
import { useAssessmentStore } from '../store/assessmentStore';

export const useAssessment = () => useAssessmentStore();

// src/hooks/useAdmin.ts
import { useAdminStore } from '../store/adminStore';

export const useAdmin = () => useAdminStore();
```

**Acceptance Criteria**:
- [ ] All 4 stores created
- [ ] Custom hooks working
- [ ] `npm run check-types` passes
- [ ] Stores accessible in components

---

### STEP 5: IndexedDB Service Layer (8-10 hours)

**Create Dexie Database**:

```typescript
// src/services/idb/db.ts
import Dexie, { type Table } from 'dexie';
import { User, Question, Answer } from '../../types';

export interface DBUser extends User {
  syncedAt?: Date;
}

export interface DBQuestion extends Question {
  syncedAt?: Date;
}

export interface DBAnswer extends Answer {
  syncedAt?: Date;
}

export class BlueNinjaDB extends Dexie {
  users!: Table<DBUser>;
  questions!: Table<DBQuestion>;
  answers!: Table<DBAnswer>;

  constructor() {
    super('BlueNinjav3');
    this.version(1).stores({
      users: 'id, email',
      questions: 'id, subject, topic, curriculum_version',
      answers: 'id, userId, questionId, timestamp',
    });
  }
}

export const db = new BlueNinjaDB();

// CRUD operations
export const userDB = {
  async save(user: DBUser) {
    return db.users.put({ ...user, syncedAt: new Date() });
  },
  async get(id: string) {
    return db.users.get(id);
  },
  async getByEmail(email: string) {
    return db.users.where('email').equals(email).first();
  },
  async getAll() {
    return db.users.toArray();
  },
  async delete(id: string) {
    return db.users.delete(id);
  },
};

export const questionDB = {
  async save(question: DBQuestion) {
    return db.questions.put({ ...question, syncedAt: new Date() });
  },
  async get(id: string) {
    return db.questions.get(id);
  },
  async getBySubject(subject: string) {
    return db.questions.where('subject').equals(subject).toArray();
  },
  async getAll() {
    return db.questions.toArray();
  },
  async delete(id: string) {
    return db.questions.delete(id);
  },
  async bulkSave(questions: DBQuestion[]) {
    return db.questions.bulkPut(questions);
  },
};

export const answerDB = {
  async save(answer: DBAnswer) {
    return db.answers.put({ ...answer, syncedAt: new Date() });
  },
  async getByUser(userId: string) {
    return db.answers.where('userId').equals(userId).toArray();
  },
  async getByQuestion(questionId: string) {
    return db.answers.where('questionId').equals(questionId).toArray();
  },
  async bulkSave(answers: DBAnswer[]) {
    return db.answers.bulkPut(answers);
  },
};
```

**Acceptance Criteria**:
- [ ] IndexedDB database initializes
- [ ] CRUD operations work
- [ ] Data persists on refresh
- [ ] `npm run check-types` passes
- [ ] DevTools can inspect data

---

### STEP 6-10: Remaining Steps

Steps 6-10 follow similar patterns:
- **Read the requirement** in main roadmap
- **Create the service/component**
- **Add types** to src/types/
- **Test thoroughly**
- **Commit with clear message**

Estimated time for each: 6-10 hours

---

## Testing Checklist for Phase 1

**After each step**:
```bash
# Type check
npm run check-types

# Lint
npm run lint

# Build
npm run build

# All tests
npm run check-types && npm run lint && npm run build
```

**After Phase 1 complete**:
```bash
# Should all pass
npm run check-types
npm run lint  
npm run build

# No errors
```

---

## Git Workflow

**For each step**:
```bash
# 1. Create feature branch
git checkout -b feat/phase1-step-X

# 2. Make changes
# ... code ...

# 3. Commit
git commit -m "feat: Step X - [Description]

- Implemented [feature]
- Added [types/services/components]
- All tests passing

Acceptance criteria met:
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3"

# 4. Push
git push origin feat/phase1-step-X

# 5. Merge to main (when tested)
git checkout main
git merge feat/phase1-step-X
git push origin main
```

---

## Success Criteria for Phase 1

✅ Phase 1 is complete when:

- [ ] All 10 steps completed
- [ ] Zero TypeScript errors
- [ ] Zero ESLint errors
- [ ] Build succeeds without warnings
- [ ] All stores working in components
- [ ] IndexedDB persisting data
- [ ] Firestore structure optimized
- [ ] Auth system functional
- [ ] Theme system working
- [ ] Logging integrated
- [ ] Git history clean with clear commits
- [ ] PROGRESS.md updated
- [ ] Ready to start Phase 2

---

**Next**: Phase 2 - Core Features (Steps 11-20)

Phase 2 will implement:
- Question templates (2 remaining)
- Diagnostic test
- Daily missions
- Student dashboard
- Admin dashboard
- Question authoring
- Analytics
