# User Management Implementation Plan - 3 Phases
**Created:** February 2026  
**Based on:** USER_MANAGEMENT.md v2.0

---

## Overview

This document outlines a 3-phase approach to implementing the User Management system for the Blue Ninja family learning app. The system supports up to 5 students with parent/admin controls for configuration and monitoring.

---

## Phase 1: Core Student Management (Week 1-2)
**Goal:** Basic student profile management and subject enrollment

### 1.1 Features to Implement

#### A. Student List View
**Location:** `/admin/students`

**Components:**
- `StudentListPage.tsx` - Main page component
- `StudentCard.tsx` - Individual student card
- `StudentListSkeleton.tsx` - Loading state

**Features:**
- Display all students (max 5)
- Show: Name, Grade, Current Streak, Status
- Click to open profile editor
- Visual indicator for who practiced today

**Firestore Queries:**
```typescript
// Fetch all students
const studentsRef = collection(db, 'students');
const studentsSnap = await getDocs(studentsRef);

// Fetch current metrics for each student
const metricsRef = doc(db, `students/${studentId}/metrics/current`);
```

#### B. Student Profile Editor - Basic Info Tab
**Location:** `/admin/students/:studentId`

**Components:**
- `StudentProfileEditor.tsx` - Main editor with tabs
- `BasicInfoTab.tsx` - Basic information form
- `SubjectsTab.tsx` - Subject enrollment

**Editable Fields:**
- Student Name (read-only - from auth)
- Grade (dropdown 1-12)
- Email (read-only - from auth)
- Curriculum (CBSE / Telangana State Board)
- Preferred Layout (Mobile Quest / Study Era)

**Form Validation:**
- Grade: Required, 1-12
- Curriculum: Required
- Layout: Required

#### C. Subject Enrollment
**Component:** `SubjectsTab.tsx`

**Features:**
- Checkbox list of subjects:
  - Mathematics
  - Science
  - English
  - Social Studies
  - Geography (optional)
  - Tables Practice
- Save to `enrolledSubjects` array
- Auto-load grade-appropriate curriculum

#### D. Daily Question Limits
**Component:** `PracticeSettingsTab.tsx` (basic version)

**Features:**
- Simple number inputs:
  - Weekday questions (default: 20)
  - Weekend questions (default: 25)
  - Holiday questions (default: 30)
- Save to `dailyQuestionConfig`

### 1.2 Data Structure (Phase 1)

```typescript
// students/{studentId}
interface StudentProfile {
  studentId: string;
  studentName: string;  // From auth
  email: string;        // From auth
  grade: number;
  curriculum: 'CBSE' | 'Telangana State Board';
  preferredLayout: 'mobile-quest-v1' | 'study-era';
  enrolledSubjects: string[];
  dailyQuestionConfig: {
    weekday: number;
    weekend: number;
    holiday: number;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// students/{studentId}/metrics/current
interface StudentMetrics {
  studentId: string;
  currentStreak: number;
  longestStreak: number;
  lastPracticeDate: string;
  weeklyStats: {
    questionsAnswered: number;
    correctAnswers: number;
    accuracy: number;
    timeSpent: number;
  };
  lastUpdated: Timestamp;
}
```

### 1.3 Routes

```typescript
// Admin routes
/admin/students              // Student list
/admin/students/:id          // Student profile editor
/admin/students/:id/basic    // Basic info tab
/admin/students/:id/subjects // Subjects tab
/admin/students/:id/practice // Practice settings tab
```

### 1.4 Services

```typescript
// src/services/admin/studentService.ts
export const studentService = {
  getAllStudents: async () => { /* ... */ },
  getStudentProfile: async (studentId: string) => { /* ... */ },
  updateStudentProfile: async (studentId: string, updates: Partial<StudentProfile>) => { /* ... */ },
  getStudentMetrics: async (studentId: string) => { /* ... */ }
};
```

### 1.5 Deliverables

- ✅ Student list page with cards
- ✅ Basic profile editor with tabs
- ✅ Subject enrollment interface
- ✅ Daily question limits configuration
- ✅ Firestore integration
- ✅ Form validation
- ✅ Loading states
- ✅ Error handling

---

## Phase 2: Module Management & Scheduling (Week 3-4)
**Goal:** Chapter/module configuration with scheduling capabilities

### 2.1 Features to Implement

#### A. Module Management Tab
**Component:** `ModulesTab.tsx`

**Features:**
- Subject-wise chapter list
- Enable/Disable checkboxes
- Shows enabled date
- Schedule for future date
- Bulk operations:
  - "Enable All Up To Chapter X"
  - "Schedule Multiple Chapters"
  - "Import School Calendar"

**UI Structure:**
```
Mathematics - Grade 7
  ☑️ Chapter 1: Integers
     Enabled on: Jan 15, 2026
  
  ☑️ Chapter 2: Fractions & Decimals
     Enabled on: Jan 22, 2026
     ⭐ Recent Topic - Extra Practice Active
  
  ☐ Chapter 3: Data Handling
     [Enable Now] [Schedule for: ___]
```

#### B. Scheduling System
**Components:**
- `ChapterScheduler.tsx` - Date picker for individual chapters
- `BulkScheduleModal.tsx` - Schedule multiple chapters at once
- `ScheduleCalendar.tsx` - Visual calendar view

**Features:**
- Date picker for future auto-enable
- Bulk schedule with date inputs
- Visual calendar showing scheduled chapters
- Auto-enable logic (Cloud Function)

#### C. Boost Periods
**Component:** `BoostPeriodsTab.tsx`

**Features:**
- Create boost period with:
  - Name
  - Date range (from/to)
  - Subject-specific extra questions
  - Active toggle
- List of active boost periods
- Edit/Delete boost periods
- Visual calendar showing boost periods

#### D. Recency Weighting (Auto)
**Backend Logic:**
- Chapters enabled in last 15 days get 2x questions
- Visual indicator: "⭐ Recent Topic - Extra Practice Active"
- No manual configuration needed

### 2.2 Data Structure (Phase 2)

```typescript
// Added to StudentProfile
interface StudentProfile {
  // ... Phase 1 fields
  
  enabledModules: {
    [subject: string]: {
      [moduleId: string]: {
        enabled: boolean;
        enabledDate: string;      // YYYY-MM-DD
        scheduledDate?: string;   // YYYY-MM-DD (future auto-enable)
      }
    }
  };
  
  boostPeriods: Array<{
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    subjectBoosts: {
      [subject: string]: number;  // Extra questions
    };
    active: boolean;
  }>;
}
```

### 2.3 Cloud Functions

```typescript
// Auto-enable scheduled modules
export const autoEnableScheduledModules = functions.pubsub
  .schedule('0 4 * * *')  // Daily at 4 AM
  .onRun(async (context) => {
    const today = new Date().toISOString().split('T')[0];
    // Query students with scheduledDate === today
    // Update enabled = true, remove scheduledDate
  });

// Calculate recency weighting
export const calculateRecentTopics = functions.pubsub
  .schedule('0 4 * * *')
  .onRun(async (context) => {
    // Find modules enabled in last 15 days
    // Mark for 2x question weighting
  });
```

### 2.4 Deliverables

- ✅ Module management interface
- ✅ Individual chapter scheduling
- ✅ Bulk scheduling modal
- ✅ Boost periods CRUD
- ✅ Visual calendar views
- ✅ Cloud Functions for auto-enable
- ✅ Recency weighting logic
- ✅ Import school calendar feature

---

## Phase 3: Exam Mode & Performance Metrics (Week 5-6)
**Goal:** Exam preparation mode and comprehensive performance tracking

### 3.1 Features to Implement

#### A. Exam Mode Configuration
**Component:** `ExamModeTab.tsx`

**Features:**
- Enable/Disable exam mode
- Exam details:
  - Name
  - Date range
  - Focus topics (select chapters per subject)
  - Difficulty level (Medium/Hard)
  - Question multiplier (e.g., 1.5x)
- Save configuration
- Visual indicator when exam mode is active

**UI:**
```
☑️ Enable Exam Mode

Exam Name: [Mid-Term - March 2026]

Exam Period:
  From: [Mar 1, 2026]
  To:   [Mar 15, 2026]

Focus Topics:
  Mathematics:
    ☑️ Chapter 1: Integers
    ☑️ Chapter 2: Fractions
    ☐ Chapter 3: Data Handling

  Science:
    ☑️ Chapter 3: Heat & Temperature
    ☑️ Chapter 4: Acids & Bases

Question Settings:
  Difficulty: [●●●○○] Hard
  Questions per day: [×1.5] (30 total)
```

#### B. Individual Student Dashboard
**Component:** `StudentDashboard.tsx`

**Features:**
- This Week summary:
  - Questions answered
  - Overall accuracy
  - Current streak
  - Time spent
- Subject performance bars
- Needs attention alerts
- Weekly accuracy trend chart
- Subject distribution pie chart
- Mastery heatmap

#### C. Family Dashboard
**Component:** `FamilyDashboard.tsx`

**Features:**
- All students summary (side-by-side)
- Total family practice stats
- Comparative performance
- Quick links to individual profiles

#### D. Grade History & Promotion
**Components:**
- `GradeHistoryTab.tsx` - View past grades
- `GradePromotionModal.tsx` - Promote to next grade

**Features:**
- View completed grades with stats
- Promote student to next grade
- Archive current grade performance
- Reset module selections
- Preserve all session logs

### 3.2 Data Structure (Phase 3)

```typescript
// Added to StudentProfile
interface StudentProfile {
  // ... Phase 1 & 2 fields
  
  examMode: {
    enabled: boolean;
    examName: string;
    startDate: string;
    endDate: string;
    focusTopics: {
      [subject: string]: string[];  // Module IDs
    };
    questionMultiplier: number;
    difficultyLevel: 'medium' | 'hard';
  };
}

// students/{studentId}/metrics/gradeHistory
interface GradeHistoryDocument {
  studentId: string;
  completedGrades: Array<{
    grade: number;
    academicYear: string;
    startDate: string;
    endDate: string;
    curriculum: string;
    totalQuestions: number;
    totalCorrect: number;
    overallAccuracy: number;
    totalTimeSpent: number;
    subjectStats: {
      [subject: string]: {
        questionsAnswered: number;
        correctAnswers: number;
        accuracy: number;
        timeSpent: number;
        masteryLevel: number;
      }
    };
    completedAt: Timestamp;
  }>;
  lastUpdated: Timestamp;
}
```

### 3.3 Cloud Functions

```typescript
// Promote student to next grade
export const promoteStudentGrade = functions.https.onCall(
  async (data, context) => {
    const { studentId, newGrade } = data;
    
    // 1. Calculate aggregate stats for current grade
    const gradeStats = await calculateGradeStats(studentId);
    
    // 2. Append to grade history
    await appendGradeHistory(studentId, gradeStats);
    
    // 3. Update student profile
    await updateStudentGrade(studentId, newGrade);
    
    // 4. Reset current metrics
    await resetCurrentMetrics(studentId);
    
    return { success: true };
  }
);

// Update metrics after practice session
export const updateStudentMetrics = functions.firestore
  .document('students/{studentId}/session_logs/{month}/entries/{entryId}')
  .onCreate(async (snap, context) => {
    // Update current metrics
    // Calculate weekly stats
    // Update subject stats
    // Update module stats
  });
```

### 3.4 Charts & Visualizations

**Libraries:**
- Recharts for line/bar/pie charts
- react-calendar-heatmap for mastery heatmap

**Charts:**
1. **Weekly Accuracy Trend** - Line chart
2. **Subject Distribution** - Pie chart
3. **Mastery Heatmap** - Calendar heatmap
4. **Subject Performance** - Horizontal bar chart

### 3.5 Deliverables

- ✅ Exam mode configuration
- ✅ Individual student dashboard
- ✅ Family dashboard
- ✅ Performance charts
- ✅ Grade history view
- ✅ Grade promotion workflow
- ✅ Cloud Functions for metrics
- ✅ Notifications system
- ✅ Exam readiness scoring

---

## Implementation Timeline

### Week 1-2: Phase 1
- Day 1-2: Student list page
- Day 3-4: Basic info tab
- Day 5-6: Subjects tab
- Day 7-8: Practice settings tab
- Day 9-10: Testing & bug fixes

### Week 3-4: Phase 2
- Day 1-3: Module management UI
- Day 4-5: Scheduling system
- Day 6-7: Boost periods
- Day 8-9: Cloud Functions
- Day 10: Testing & bug fixes

### Week 5-6: Phase 3
- Day 1-2: Exam mode UI
- Day 3-4: Student dashboard
- Day 5-6: Family dashboard
- Day 7-8: Grade history & promotion
- Day 9-10: Testing & polish

---

## Technical Stack

### Frontend
- React + TypeScript
- Tailwind CSS (dark mode support)
- Framer Motion (animations)
- Recharts (charts)
- React Hook Form (forms)
- Zod (validation)

### Backend
- Firebase Firestore
- Cloud Functions
- Cloud Scheduler (cron jobs)

### State Management
- Zustand (global state)
- React Query (server state)

---

## File Structure

```
src/
├── components/
│   └── admin/
│       ├── students/
│       │   ├── StudentListPage.tsx
│       │   ├── StudentCard.tsx
│       │   ├── StudentProfileEditor.tsx
│       │   ├── tabs/
│       │   │   ├── BasicInfoTab.tsx
│       │   │   ├── SubjectsTab.tsx
│       │   │   ├── ModulesTab.tsx
│       │   │   ├── PracticeSettingsTab.tsx
│       │   │   ├── ExamModeTab.tsx
│       │   │   ├── MetricsTab.tsx
│       │   │   └── GradeHistoryTab.tsx
│       │   ├── components/
│       │   │   ├── ChapterList.tsx
│       │   │   ├── ChapterScheduler.tsx
│       │   │   ├── BulkScheduleModal.tsx
│       │   │   ├── BoostPeriodCard.tsx
│       │   │   └── PerformanceChart.tsx
│       │   └── StudentDashboard.tsx
│       └── FamilyDashboard.tsx
├── services/
│   └── admin/
│       ├── studentService.ts
│       ├── metricsService.ts
│       └── gradeHistoryService.ts
├── hooks/
│   └── admin/
│       ├── useStudents.ts
│       ├── useStudentMetrics.ts
│       └── useGradeHistory.ts
└── types/
    └── admin/
        ├── student.ts
        ├── metrics.ts
        └── gradeHistory.ts

functions/
├── src/
│   ├── scheduled/
│   │   ├── autoEnableModules.ts
│   │   ├── calculateRecency.ts
│   │   └── updateMetrics.ts
│   └── callable/
│       ├── promoteGrade.ts
│       └── calculateGradeStats.ts
```

---

## Testing Strategy

### Unit Tests
- Form validation
- Data transformations
- Utility functions

### Integration Tests
- Firestore operations
- Cloud Functions
- API calls

### E2E Tests
- Student creation flow
- Module scheduling
- Grade promotion
- Dashboard views

---

## Success Criteria

### Phase 1
- ✅ Admin can view all students
- ✅ Admin can edit basic info
- ✅ Admin can enroll subjects
- ✅ Admin can set daily limits

### Phase 2
- ✅ Admin can enable/disable modules
- ✅ Admin can schedule future modules
- ✅ Admin can create boost periods
- ✅ Recency weighting works automatically

### Phase 3
- ✅ Admin can configure exam mode
- ✅ Admin can view student performance
- ✅ Admin can view family dashboard
- ✅ Admin can promote students to next grade
- ✅ Grade history is preserved

---

## Notes

1. **No User Creation:** Students self-register via Google/Email sign-in. Admin only manages existing users.

2. **Responsive Design:** 
   - Admin uses 15" laptops
   - Students use 10" tablets or phones
   - Ensure mobile-first approach

3. **Dark Mode:** All admin interfaces should support dark mode.

4. **Performance:** Optimize Firestore queries with proper indexing.

5. **Security:** Implement proper security rules for admin-only access.

---

**Document Status:** Implementation Plan v1.0  
**Ready for Development:** Phase 1
