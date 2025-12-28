# Blue Ninja v3 - Quick Reference Guide
**Last Updated**: December 28, 2025  
**Purpose**: Fast lookup for common tasks and files  

---

## 🗂️ Critical Files by Function

### Authentication & Profiles
```
src/store/auth.ts              - Login/logout state
src/store/profile.ts           - User profile state
src/services/auth.ts           - Firebase auth logic
src/services/profile.ts        - Profile operations
```

### Database & Storage
```
src/types/idb.ts               - All 8 entity types
src/services/idb/db.ts         - Dexie database init
src/services/idb/operations.ts - CRUD operations
src/services/idb/schemas.ts    - Zod validation
src/services/idb/sync.ts       - Sync logic
```

### Questions & Assessments
```
src/types/questions.ts         - 14 question types
src/schemas/questions.ts       - Question validation
src/services/questions/index.ts - Question operations
(Step 13) services/assessments/  - COMING SOON
(Step 14) services/missions/     - COMING SOON
```

### UI & Styling
```
src/index.css                  - Theme + components
src/App.tsx                    - Main app
src/App.css                    - App styles
```

### Logging & Utilities
```
src/services/logging.ts        - Structured logging
src/store/ui.ts                - UI state (theme, etc)
```

---

## 🎯 Development Commands

```bash
# Development
npm run dev              # Start dev server

# Quality Checks
npm run check-types      # TypeScript check
npm run lint             # ESLint check
npm run type-check       # Both checks

# Build
npm run build            # Production build
npm run preview          # Preview build

# Git (standard)
git add .                # Stage changes
git commit -m "..."     # Commit
git push origin main     # Push
```

---

## 📝 Common Import Patterns

### Using the Database
```typescript
import { db } from '../services/idb';

// Read
const questions = await db.questions.toArray();

// Create/Update
await db.questions.put(question);

// Delete
await db.questions.delete(id);
```

### Using Question Service
```typescript
import * as questionService from '../services/questions';

const questions = await questionService.loadQuestions();
const found = await questionService.searchQuestions('algebra');
const random = await questionService.getRandomQuestions(5);
```

### Using Logging
```typescript
import { logger } from '../services/logging';

logger.info('Message');
logger.warn('Warning');
logger.error('Error', error);
logger.debug('Debug');
```

### Using Zustand Store
```typescript
import { useAuthStore } from '../store/auth';
import { useProfileStore } from '../store/profile';

const { user, isAuthenticated } = useAuthStore();
const { grade, school } = useProfileStore();
```

### Validation with Zod
```typescript
import { validateQuestion } from '../schemas/questions';

const validated = validateQuestion(data); // throws if invalid
// or
const result = multipleChoiceSchema.safeParse(data);
if (result.success) {
  // Use result.data
}
```

---

## 🔍 Database Schema Reference

### 8 Tables in IndexedDB

1. **users** - User auth data
2. **profiles** - User profile info (grade, school, etc)
3. **questions** - All 14 question types
4. **assessments** - Diagnostic assessments (coming)
5. **progress** - Daily progress tracking (coming)
6. **dailyMissions** - Daily missions (coming)
7. **adminData** - Admin settings (coming)
8. **syncLogs** - Offline/online sync logs

### Quick Table Stats
```typescript
const stats = await questionService.getQuestionStats();
// Returns:
// {
//   total: number,
//   bySubject: Record<string, number>,
//   byTopic: Record<string, number>,
//   byLevel: { easy, medium, hard },
//   byTemplate: Record<string, number>
// }
```

---

## 🎨 Theme Usage

### CSS Variables
```css
/* Light theme (default) */
--color-surface: #ffffff
--color-card: #ffffff
--color-text: #212529
--color-primary: #a855f7

/* Dark theme */
[data-theme='dark'] {
  --color-surface: #1a1a1a
  --color-card: #262626
  --color-text: #e5e5e5
  --color-primary: #d8b4fe
}
```

### Component Classes
```html
<!-- Cards -->
<div class="ninja-card">Content</div>
<div class="card">Content</div>

<!-- Buttons -->
<button class="btn-primary">Primary</button>
<button class="btn-secondary">Secondary</button>
<button class="btn-danger">Danger</button>

<!-- Inputs -->
<input class="input-field" />

<!-- Badges -->
<span class="badge badge-primary">Badge</span>

<!-- Alerts -->
<div class="alert alert-success">Message</div>
```

---

## 📋 Question Type Reference

### 14 Question Types

| Type | Fields | Auto-Grade | Use Case |
|------|--------|-----------|----------|
| multiple_choice | options[], correctOptionId | ✅ Yes | General knowledge |
| fill_blank | answers[] | ✅ Yes | Vocabulary, formulas |
| true_false | correctAnswer: boolean | ✅ Yes | Quick check |
| short_answer | expectedAnswers[] | ❌ Manual | Essay questions |
| essay | minWords, maxWords | ❌ Manual | Long form |
| match | pairs[] | ✅ Yes | Definitions |
| drag_drop | items[], correctOrder[] | ✅ Yes | Sequencing |
| dropdown | blanks[] | ✅ Yes | Fill multiple |
| numeric | correctAnswer, tolerance | ✅ Yes | Math/science |
| click_image | correctAreas[] | ✅ Yes | Visual |
| multiple_select | correctOptionIds[] | ✅ Yes | Multi-answer |
| sequencing | items[], correctSequence[] | ✅ Yes | Order steps |
| table_fill | headers, answers | ✅ Yes | Data entry |
| formula | correctFormulas[] | ✅ Yes | Math |

---

## 🚀 Phase Progress

### What's Done ✅
- Step 1: Repo cleanup
- Step 2: TypeScript
- Step 3: Folder structure
- Step 4: Zustand stores
- Step 5: IndexedDB (complete)
- Step 6: Firestore
- Step 7: Auth
- Step 8: Profiles
- Step 9: Theme (complete)
- Step 10: Logging
- Step 11: Question types (complete)
- Step 12: Question service (complete)

### What's Next 🔄
- Step 13: Assessment (12-15 hrs)
- Step 14: Missions (10-12 hrs)
- Step 15: Dashboard (10-12 hrs)
- Step 16: Admin (12-15 hrs)
- Step 17: Editor (15-20 hrs)
- Step 18: Validation (10-12 hrs)
- Step 19: Analytics (10-12 hrs)
- Step 20: Curriculum (10-12 hrs)

---

## 💡 Code Examples

### Create & Save a Question
```typescript
import { v4 as uuidv4 } from 'uuid';
import { saveQuestion } from '../services/questions';
import { multipleChoiceSchema } from '../schemas/questions';

const question = {
  id: uuidv4(),
  template: 'multiple_choice' as const,
  subject: 'math',
  topic: 'algebra',
  level: 'easy' as const,
  content: 'What is 2 + 2?',
  explanation: 'Basic addition',
  points: 1,
  createdBy: 'admin-123',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  version: 1,
  options: [
    { id: '0', text: '3' },
    { id: '1', text: '4' },
    { id: '2', text: '5' },
    { id: '3', text: '6' },
  ],
  correctOptionId: '1',
};

// Validate
const validated = multipleChoiceSchema.parse(question);

// Save
await saveQuestion(validated);
```

### Search Questions
```typescript
const algebra = await questionService.searchQuestions('algebra', {
  subject: 'math',
  level: 'easy'
});

const random5 = await questionService.getRandomQuestions(5, {
  subject: 'science',
  level: 'medium'
});
```

### Log Activity
```typescript
logger.info('Assessment started', { assessmentId, userId });
logger.warn('Low score detected', { score: 35 });
logger.error('Database error', new Error('Connection lost'));
```

---

## 🐛 Troubleshooting

### TypeScript Errors
```bash
npm run check-types
# Shows all type errors
```

### ESLint Issues
```bash
npm run lint
# Shows all lint issues
```

### IndexedDB Issues
```typescript
// Clear all data
await db.clearAll();

// Check data
const allQuestions = await db.questions.toArray();
console.log('Questions:', allQuestions);
```

### Theme Issues
```typescript
// Check current theme
const theme = useUIStore((s) => s.theme);
console.log('Current theme:', theme);

// Toggle theme
const toggleTheme = useUIStore((s) => s.toggleTheme);
toggleTheme();
```

---

## 📚 Documentation Structure

```
src/docs/
├── PHASE1_EXECUTION_GUIDE_20250128.md      (Reference)
├── PHASE2_EXECUTION_GUIDE_20250128.md      (Reference)
├── EXECUTION_SUMMARY_20251228.md           (What was done)
├── NEXT_STEPS_STATUS_20251228.md           (What to do next)
├── QUICK_REFERENCE_20251228.md             (This file)
└── archive/                                (Old docs)
    ├── README_20250128.md
    └── PHASE1_EXECUTION_GUIDE_20250128.md
```

---

## 🎯 Success Metrics

### Per Step
- ✅ Zero TypeScript errors
- ✅ All functions work
- ✅ Data persists
- ✅ Proper logging
- ✅ Git commit made

### Overall
- Phase 1: 10/10 steps ✅
- Phase 2: 2/10 steps ✅ (20%)
- Phase 3: 0/10 steps ⏳ (0%)
- Total: 12/30 steps ✅ (40%)

---

## 🔗 Quick Links

**GitHub Repo**:  
https://github.com/saideep-g/blue-ninja-v2

**Key Commits**:  
- Phase 1 Foundation: `af0bd0f` to `a698afe`
- Phase 2 Start: `1db841c` to `74c27ef`

**Status**:  
✅ Phase 1 Complete | 🔄 Phase 2 In Progress | ⏳ Phase 3 Pending

---

**Keep this document handy while developing Phase 2!**
