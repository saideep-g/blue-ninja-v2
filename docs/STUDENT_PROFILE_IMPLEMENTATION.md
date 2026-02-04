# Student Profile Implementation Plan
**Based on:** STUDENT_PROFILE.md  
**Target:** Study Era Interface  
**Timeline:** 3 Phases

---

## Phase 1: Profile Information & Navigation (Week 1)
**Goal:** Replace current profile with read-only information display and tab navigation

### 1.1 Components to Create
- `src/components/student/profile/StudentProfileLayout.tsx` - Main layout with tab navigation
- `src/components/student/profile/tabs/ProfileInfoTab.tsx` - Read-only profile information
- `src/components/student/profile/tabs/GradeHistoryTab.tsx` - Completed grades summary

### 1.2 Features
**Profile Info Tab:**
- Display basic details (name, email, grade, curriculum)
- Show practice settings (daily limits, boost periods, exam mode)
- Read-only - no editing allowed
- Responsive design (tablet + mobile)

**Grade History Tab:**
- List completed grades with summary stats
- Click to filter Practice History by grade
- Show total questions, accuracy, time spent per grade
- Subject-wise breakdown

### 1.3 Data Integration
- Read from `students/{studentId}` for profile
- Read from `students/{studentId}/metrics/gradeHistory` for history
- No writes - pure display

### 1.4 Deliverables
- ✅ Tab navigation working
- ✅ Profile info displaying correctly
- ✅ Grade history showing past grades
- ✅ Responsive on tablet and mobile
- ✅ Integrated into Study Era dashboard

---

## Phase 2: Consistency Calendar & Streaks (Week 2)
**Goal:** Build visual engagement tool with calendar and streak tracking

### 2.1 Components to Create
- `src/components/student/profile/tabs/ConsistencyTab.tsx` - Main calendar view
- `src/components/student/profile/components/ConsistencyCalendar.tsx` - Calendar grid
- `src/components/student/profile/components/DailyDetailPane.tsx` - Side pane for date details
- `src/components/student/profile/components/StreakDisplay.tsx` - Streak counter

### 2.2 Features
**Consistency Calendar:**
- Visual coding: Green (Perfect), Blue (Partial), White (Inactive)
- Month navigation (prev/next)
- Click date to view details
- Grade Year stats (June 1 - May 31)

**Daily Detail Pane:**
- Current date: Interactive checklist to mark subjects complete
- Past date: Read-only list of completed subjects
- Progress ring showing X/6 subjects
- Subject icons with check/circle indicators

**Streak Mechanics:**
- All-or-nothing rule (only Perfect Days count)
- Display current streak and longest streak
- Visual flame icon with count

### 2.3 Data Integration
**New Firestore Collection:**
```typescript
students/{studentId}/daily_completion/{grade}
```

**Structure:**
```typescript
{
  entries: Array<{
    date: "YYYY-MM-DD",
    completedSubjects: ["math", "science", ...],
    totalSubjects: 6,
    isPerfectDay: boolean,
    timestamp: Timestamp
  }>
}
```

### 2.4 Deliverables
- ✅ Calendar displaying with color coding
- ✅ Month navigation working
- ✅ Daily detail pane interactive for current date
- ✅ Streak calculation and display
- ✅ Grade Year stats showing correctly
- ✅ Mobile-responsive stacked layout

---

## Phase 3: Chapter Analytics & Question Bundles (Week 3)
**Goal:** Detailed chapter-wise performance with efficient question data syncing

### 3.1 Components to Create
- `src/components/student/profile/tabs/ChapterAnalyticsTab.tsx` - Main analytics view
- `src/components/student/profile/components/ChapterCard.tsx` - Individual chapter display
- `src/components/student/profile/components/ChapterDetailView.tsx` - Expanded chapter details
- `src/services/questionBundleSync.ts` - IndexedDB sync service

### 3.2 Features
**Chapter Analytics:**
- Subject filter dropdown
- List of chapters with:
  - Questions answered
  - Time spent (formatted)
  - Accuracy percentage
  - Mastery level (0-100%)
  - Visual progress bar
- Sorting options (mastery, questions, accuracy, alphabetical)
- Color-coded mastery levels (Green/Yellow/Red)

**Chapter Detail View:**
- Expand on click
- Show progress (45/60 questions)
- Recent practice sessions
- Weak topics identification
- Recommended next steps

### 3.3 Data Integration

**New Firestore Collection:**
```typescript
question_bundle_metadata (global)
```

**Structure:**
```typescript
{
  bundleId: "math_g7_fractions_v2",
  bundleName: "Grade 7 Math - Fractions",
  subject: "math",
  grade: 7,
  moduleId: "math_ch3",
  questionCount: 60,
  lastUpdated: Timestamp,
  version: 2,
  topics: ["proper_fractions", "improper_fractions"]
}
```

**IndexedDB Schema:**
```typescript
{
  bundleId: string,
  metadata: QuestionBundleMetadata,
  questions: Question[],
  cachedAt: Timestamp,
  lastSyncedVersion: number
}
```

**Sync Logic:**
1. Query `question_bundle_metadata` where `grade == currentGrade`
2. Compare with IndexedDB cache
3. Download only updated bundles
4. Store in IndexedDB for offline access

### 3.4 Services to Create
- `src/services/indexedDBService.ts` - IndexedDB wrapper
- `src/services/questionBundleSync.ts` - Sync logic
- `src/hooks/useChapterAnalytics.ts` - Data aggregation hook

### 3.5 Deliverables
- ✅ Chapter list displaying with metrics
- ✅ Subject filter working
- ✅ Sorting options functional
- ✅ Chapter detail view expandable
- ✅ Question bundle metadata collection created
- ✅ IndexedDB sync working
- ✅ Offline access to question data
- ✅ Analytics calculating correctly from session logs

---

## Technical Stack

### Frontend
- React + TypeScript
- Framer Motion (animations)
- Lucide React (icons)
- Tailwind CSS (styling)

### Backend
- Firebase Firestore
- IndexedDB (client-side caching)

### State Management
- React Context (NinjaContext)
- Custom hooks for data fetching

---

## File Structure
```
src/
├── components/
│   └── student/
│       └── profile/
│           ├── StudentProfileLayout.tsx
│           ├── tabs/
│           │   ├── ProfileInfoTab.tsx
│           │   ├── ConsistencyTab.tsx
│           │   ├── ChapterAnalyticsTab.tsx
│           │   ├── PracticeHistoryTab.tsx (existing)
│           │   └── GradeHistoryTab.tsx
│           └── components/
│               ├── ConsistencyCalendar.tsx
│               ├── DailyDetailPane.tsx
│               ├── StreakDisplay.tsx
│               ├── ChapterCard.tsx
│               └── ChapterDetailView.tsx
├── services/
│   ├── indexedDBService.ts
│   └── questionBundleSync.ts
└── hooks/
    ├── useChapterAnalytics.ts
    ├── useConsistencyData.ts
    └── useGradeHistory.ts
```

---

## Migration Strategy

### Current State
- `StudyEraProfile.tsx` has basic overview and settings

### Phase 1 Migration
1. Keep existing `StudyEraProfile.tsx` as fallback
2. Create new `StudentProfileLayout.tsx`
3. Add feature flag to switch between old/new
4. Test thoroughly before full replacement

### Phase 2 & 3
- Incremental additions to new layout
- No breaking changes to existing functionality

---

## Success Criteria

### Phase 1
- [ ] All profile data displaying correctly
- [ ] Grade history accessible and filterable
- [ ] Responsive on all devices
- [ ] No performance degradation

### Phase 2
- [ ] Calendar showing accurate completion data
- [ ] Streaks calculating correctly
- [ ] Daily checklist functional
- [ ] Grade Year stats accurate

### Phase 3
- [ ] Chapter analytics showing all metrics
- [ ] Question bundles syncing efficiently
- [ ] IndexedDB caching working
- [ ] Offline analytics functional
- [ ] Performance optimized (< 2s load time)

---

## Timeline Summary
- **Week 1:** Profile Info + Grade History
- **Week 2:** Consistency Calendar + Streaks
- **Week 3:** Chapter Analytics + Question Bundles

**Total:** 3 weeks for full implementation
