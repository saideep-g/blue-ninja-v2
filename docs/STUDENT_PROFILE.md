# Student Profile - Requirements Document
**Version:** 2.0  
**Last Updated:** February 4, 2026  
**Status:** Implementation Complete

---

## Table of Contents
1. [Overview](#overview)
2. [Data Structure](#data-structure)
3. [Profile Information](#profile-information)
4. [Consistency Calendar & Streaks](#consistency-calendar--streaks)
5. [Chapter Analytics](#chapter-analytics)
6. [Grade History](#grade-history)
7. [Theme Support](#theme-support)
8. [UI/UX Requirements](#uiux-requirements)
9. [Access Control](#access-control)
10. [Technical Implementation](#technical-implementation)

---

## Overview

The Student Profile is a comprehensive interface where students can:
- **View** all information stored about them (read-only except theme)
- **Track** daily consistency and streaks
- **Analyze** chapter-wise performance
- **Review** grade history and practice logs
- **Customize** theme preference (light/dark)

**Target Users:** Students (ages 7-16)  
**Devices:** 10-inch tablets, Android phones, iOS devices  
**Layouts:** Mobile Quest, Study Era

---

## Data Structure

### Root Level: `students/{studentId}`

**Top-level fields** (outside profile map):

```typescript
{
  name: string,              // Student's full name
  email: string,             // Student's email address
  role: string,              // "STUDENT" or "ADMIN"
  createdAt: Timestamp,      // Account creation date
  lastUpdated: Timestamp     // Last profile update
}
```

### Profile Map: `students/{studentId}/profile`

**Profile configuration** (stored as map):

```typescript
{
  // Academic Information
  grade: number,                    // Current grade level (1-12)
  curriculum: string,               // "CBSE", "Telangana State Board", etc.
  enrolledSubjects: string[],       // ["math", "science", "english", "social", "geography", "tables"]
  
  // Gamification
  heroLevel: number,                // Student's hero level
  powerPoints: number,              // Total power points earned
  
  // Consistency Metrics
  streakCount: number,              // Current streak count
  perfectDays: number,              // Total perfect days (6/6 subjects)
  partialDays: number,              // Total partial days (1-5 subjects)
  
  // Interface Preferences
  layout: string,                   // "mobile-quest-v1" | "study-era" | "default"
  theme: string,                    // "light" | "dark"
  
  // Practice Configuration
  dailyQuestionConfig: {
    weekday: number,                // Questions per weekday
    weekend: number,                // Questions per weekend
    holiday: number                 // Questions per holiday
  },
  
  // Boost Periods
  boostPeriods: [{
    name: string,                   // e.g., "Exam Preparation"
    startDate: string,              // ISO date string
    endDate: string,                // ISO date string
    multiplier: number              // Boost multiplier (e.g., 1.5)
  }],
  
  // Exam Mode
  examMode: {
    enabled: boolean,               // Is exam mode active?
    examName: string,               // e.g., "Final Exams"
    startDate: string,              // ISO date string
    endDate: string                 // ISO date string
  },
  
  // Schedule Configuration
  weekendDays: string[],            // ["Sunday"] or ["Saturday", "Sunday"]
  holidayDates: string[],           // Array of ISO date strings
  activeChapters: string[],         // Currently active chapter IDs
  
  // Other Settings
  notificationsEnabled: boolean,    // Email/push notifications
  language: string,                 // "en", "hi", "te", etc.
  timezone: string                  // "Asia/Kolkata"
}
```

---

## Sub-collections

### 1. Metrics: `students/{studentId}/metrics/`

#### Current Metrics: `metrics/current`
```typescript
{
  totalQuestions: number,
  totalCorrect: number,
  overallAccuracy: number,
  totalTimeSpent: number,
  subjectStats: {
    [subject: string]: {
      questions: number,
      correct: number,
      accuracy: number,
      timeSpent: number
    }
  },
  lastUpdated: Timestamp
}
```

#### Grade History: `metrics/gradeHistory`
```typescript
{
  studentId: string,
  completedGrades: [{
    grade: number,
    academicYear: string,           // "2025-2026"
    startDate: string,              // ISO date
    endDate: string,                // ISO date
    curriculum: string,
    totalQuestions: number,
    totalCorrect: number,
    overallAccuracy: number,
    totalTimeSpent: number,         // in minutes
    subjectStats: {
      [subject: string]: {
        questions: number,
        correct: number,
        accuracy: number,
        timeSpent: number,
        masteryLevel: number        // 0-100
      }
    }
  }],
  lastUpdated: Timestamp
}
```

### 2. Daily Completion: `students/{studentId}/daily_completion/grade_{N}`

```typescript
{
  grade: number,
  entries: [{
    date: string,                   // "YYYY-MM-DD"
    completedSubjects: string[],    // ["math", "science", ...]
    totalSubjects: number,          // 6
    isPerfectDay: boolean,          // true if all 6 subjects completed
    timestamp: Timestamp
  }],
  lastUpdated: Timestamp
}
```

### 3. Session Logs: `students/{studentId}/session_logs/{YYYY-MM}/logs`

```typescript
{
  sessionId: string,
  studentId: string,
  grade: number,
  subject: string,
  chapterId: string,
  chapterName: string,
  moduleId: string,
  questionResults: [{
    questionId: string,
    isCorrect: boolean,
    timeSpent: number,
    selectedAnswer: any,
    correctAnswer: any
  }],
  totalQuestions: number,
  correctAnswers: number,
  accuracy: number,
  totalTime: number,                // in seconds
  timestamp: Timestamp
}
```

### 4. Tables Practice Logs: `students/{studentId}/tables_practice_logs/logs_until_{jun|dec}{YYYY}`

```typescript
{
  period: string,                   // "jun2026" or "dec2026"
  logs: [{
    date: string,
    table: number,                  // 2-20
    questionsAnswered: number,
    correctAnswers: number,
    accuracy: number,
    timeSpent: number,
    timestamp: Timestamp
  }],
  lastUpdated: Timestamp
}
```

---

## Profile Information

### Tab 1: Profile Info

#### 1.1 Basic Details (Read-Only)
Display the following information:
- **Student Name** (from `students/{studentId}.name`)
- **Email** (from `students/{studentId}.email`)
- **Grade** (from `profile.grade`)
- **Curriculum** (from `profile.curriculum`)
- **Interface Layout** (from `profile.layout`)
  - Display as: "Mobile Quest" or "Study Era"
- **Enrolled Subjects** (from `profile.enrolledSubjects`)
  - Display with subject icons:
    - 📐 Math
    - 🔬 Science
    - 📚 English
    - 🏛️ Social
    - 🌍 Geography
    - ✖️ Tables

#### 1.2 Theme Preference (Editable) ⭐
**Only editable field for students:**
- Toggle between Light and Dark themes
- Visual button with Sun/Moon icons
- Saves to `profile.theme`
- Applies immediately to UI

**UI Design:**
```
┌─────────────────────────────────────────┐
│ 🌙 Theme Preference                     │
├─────────────────────────────────────────┤
│ Choose your preferred color scheme      │
│                                          │
│ Current: Light                           │
│                                          │
│ [🌙 Switch to Dark] ← Button            │
└─────────────────────────────────────────┘
```

#### 1.3 Practice Settings (Read-Only)
Display current configuration:
- **Daily Question Limits:**
  - Weekdays: `profile.dailyQuestionConfig.weekday`
  - Weekends: `profile.dailyQuestionConfig.weekend`
  - Holidays: `profile.dailyQuestionConfig.holiday`
- **Active Boost Periods** (from `profile.boostPeriods`)
  - Show name, dates, and multiplier
- **Exam Mode Status** (from `profile.examMode`)
  - Show if active, exam name, and dates

#### 1.4 Gamification Stats (Read-Only)
- **Hero Level:** `profile.heroLevel`
- **Power Points:** `profile.powerPoints`
- **Current Streak:** `profile.streakCount`

#### 1.5 Read-Only Notice
Display prominent notice:
> ℹ️ **Read-Only Profile**  
> All profile settings are managed by your admin/parent. Contact them to make changes.  
> You can only change your theme preference above.

---

## Consistency Calendar & Streaks

### Tab 2: Consistency

#### 2.1 Purpose
Visual engagement tool to track daily completion of all allotted subject questions and build long-term learning habits.

#### 2.2 Grade Year (Academic Year)
- **Definition:** June 1st to May 31st
- **Stats Display:** Show total Perfect Days and Partial Days for entire Grade Year
- **Context:** All metrics aligned to academic cycle, not calendar year

#### 2.3 Consistency Calendar

**Visual Coding:**
- 🟢 **Perfect Day (Green):** All 6 subjects completed (`isPerfectDay: true`)
- 🔵 **Partial Day (Blue):** 1-5 subjects completed
- ⚪ **Inactive Day (White):** 0 subjects completed
- ⚫ **Future Date (Gray):** Disabled, cannot select

**Features:**
- Navigate between months (prev/next arrows)
- Click any date to view details in side pane
- Highlight current date with pink ring
- Highlight selected date with purple ring
- Empty states for days with no tracking

**Layout:**
- **Desktop/Tablet:** Calendar on left (60%), detail pane on right (40%)
- **Mobile:** Stacked view (calendar above, details below)

**Data Source:** `students/{studentId}/daily_completion/grade_{currentGrade}`

#### 2.4 Daily Detail Side Pane

**Current Date Selected:**
- **Interactive checklist** to mark subjects complete
- Visual **progress ring** showing X/6 subjects
- Click subject to toggle completion
- Updates Firestore in real-time
- Recalculates `isPerfectDay` automatically

**Past Date Selected:**
- **Read-only list** of completed subjects
- Visual indicators:
  - ✓ Completed (green checkmark)
  - ○ Not completed (gray circle)
- Summary: "4/6 subjects completed"
- Status badge: "Perfect Day" | "Good Progress" | "Inactive"

**Future Date Selected:**
- Message: "Future date - no data yet"
- No interaction allowed

**UI Elements:**
- Subject icons with color coding
- Circular progress indicator
- Progress percentage (X/6)
- Status badges with emojis:
  - 🎉 Perfect Day (6/6)
  - 💪 Good Progress (3-5/6)
  - 🚀 Let's Start (1-2/6)
  - 😴 Inactive (0/6)

#### 2.5 Streak Mechanics

**All-or-Nothing Rule:**
- Streak increments ONLY on Perfect Days (6/6 subjects)
- Partial days (1-5 subjects) do NOT break streak
- Partial days do NOT increment streak
- Inactive days (0 subjects) break streak
- Provides visual evidence of effort

**Display:**
```
┌─────────────────────────────────────────┐
│ 🔥 Current Streak: 12 Days              │
│ 🏆 Longest Streak: 18 Days              │
└─────────────────────────────────────────┘
```

**Visual States:**
- **Active Streak (>0):** Filled flame icon, orange color
- **No Streak (0):** Outline flame icon, gray color

**Calculation Logic:**
```typescript
// Count consecutive Perfect Days from today backwards
let currentStreak = 0;
for (const entry of sortedByDateDesc) {
  if (entry.date > today) continue;
  if (!entry.isPerfectDay) break;
  currentStreak++;
}

// Find longest sequence of Perfect Days
let longestStreak = 0;
let tempStreak = 0;
for (const entry of allEntries) {
  if (entry.isPerfectDay) {
    tempStreak++;
    longestStreak = Math.max(longestStreak, tempStreak);
  } else {
    tempStreak = 0;
  }
}
```

#### 2.6 Grade Year Summary Stats

**Display for Current Grade Year (June 1 - May 31):**
```
┌─────────────────────────────────────────┐
│ Perfect Days: 45 🟢                     │
│ Partial Days: 23 🔵                     │
│ Inactive Days: 12 ⚪                    │
│ Completion Rate: 75%                    │
└─────────────────────────────────────────┘
```

**Calculations:**
- Perfect Days: Count where `isPerfectDay === true`
- Partial Days: Count where `completedSubjects.length > 0 && !isPerfectDay`
- Inactive Days: Count where `completedSubjects.length === 0`
- Completion Rate: `(Perfect Days / Total Days) × 100`

---

## Chapter Analytics

### Tab 3: Chapter Analytics

#### 3.1 Purpose
Detailed breakdown of student performance at the chapter/module level, showing questions answered, time spent, accuracy, and mastery for each chapter across all subjects.

#### 3.2 Data Syncing

**Question Bundle Metadata:**
- **Global Collection:** `question_bundle_metadata`
- **Purpose:** Track question bundles and enable efficient syncing to IndexedDB
- **Query:** Single read to get all bundles for current grade

**Structure:**
```typescript
{
  bundleId: string,           // "math_g7_fractions_v2"
  bundleName: string,         // "Grade 7 Math - Fractions"
  subject: string,            // "math"
  grade: number,              // 7
  moduleId: string,           // "math_ch3"
  questionCount: number,      // 60
  lastUpdated: string,        // ISO date
  version: number,            // 2 (increment on updates)
  difficulty?: string,        // "easy" | "medium" | "hard"
  topics?: string[]           // ["proper_fractions", "improper_fractions"]
}
```

**Sync Strategy:**
1. Query `question_bundle_metadata` where `grade == currentGrade`
2. Compare `version` with IndexedDB cached version
3. Download only bundles where `version > cachedVersion`
4. Store in IndexedDB for offline access

**IndexedDB Schema (Dexie):**
```typescript
{
  bundleId: string,           // Primary key
  metadata: QuestionBundleMetadata,
  questions: Question[],      // Full question data
  cachedAt: string,
  lastSyncedVersion: number
}
```

#### 3.3 Subject Filter
- Dropdown to select subject
- Options: All Subjects, Math, Science, English, Social, Geography, Tables
- Default: All Subjects
- Updates chapter list in real-time

#### 3.4 Sorting Options
- **By Mastery:** Low to High / High to Low
- **By Recent:** Most recently practiced first
- **By Accuracy:** Highest to lowest

#### 3.5 Chapter List View

**For Each Chapter:**
```
┌─────────────────────────────────────────┐
│ 📐 Math - Chapter 3: Fractions          │
├─────────────────────────────────────────┤
│ Questions: 45 | Accuracy: 82%           │
│ Time: 2h 15m | Mastery: 78%             │
│                                          │
│ [████████████░░░░] 78%                  │
│                                          │
│ Last Practiced: 2 days ago              │
└─────────────────────────────────────────┘
```

**Display Fields:**
- Subject icon and chapter name
- Questions answered
- Accuracy percentage
- Time spent (formatted: Xh Ym)
- Mastery level (0-100%)
- Visual progress bar
- Last practiced date (relative)

**Mastery Color Coding:**
- 🟢 **Strong (80-100%):** Green progress bar
- 🟡 **Developing (50-79%):** Yellow progress bar
- 🔴 **Needs Practice (0-49%):** Red progress bar

#### 3.6 Chapter Detail View (Expandable)

**Click on a chapter to expand:**
```
┌─────────────────────────────────────────┐
│ 📐 Fractions (Chapter 3)                │
├─────────────────────────────────────────┤
│ Detailed Stats:                          │
│ • Questions: 45                          │
│ • Accuracy: 82% (37 correct, 8 wrong)   │
│ • Correct: 37                            │
│ • Time Spent: 2h 15m                    │
│                                          │
│ Mastery Progress:                        │
│ [████████████░░░░] 78%                  │
│                                          │
│ Weak Topics: (if available)              │
│ • Improper fractions                     │
│ • Mixed numbers                          │
└─────────────────────────────────────────┘
```

#### 3.7 Data Aggregation

**Source:** Aggregate from `session_logs/{YYYY-MM}/logs` filtered by:
- Current grade
- Selected subject (if not "All")
- Group by `chapterId`

**Calculations:**
- **Questions Answered:** Count of all question results per chapter
- **Correct Answers:** Count where `isCorrect === true`
- **Accuracy:** `(Correct / Total) × 100`
- **Time Spent:** Sum of `totalTime` per chapter (convert to minutes)
- **Mastery:** Currently same as accuracy (can be enhanced with weighted algorithm)
- **Last Practiced:** Most recent `timestamp` for that chapter

#### 3.8 Summary Stats

Display at top of Chapter Analytics:
```
┌─────────────────────────────────────────┐
│ Chapters: 12                             │
│ Avg Accuracy: 78%                        │
│ Total Questions: 450                     │
│ Total Time: 15h 30m                     │
└─────────────────────────────────────────┘
```

#### 3.9 Sync Button

- **Button:** "Sync Data" with download icon
- **Action:** Triggers `questionBundleSyncService.syncUpdatedBundles()`
- **Progress:** Shows "Syncing... X/Y bundles"
- **Disabled:** While syncing in progress

---

## Grade History

### Tab 4: Grade History

#### 4.1 Purpose
Display summary of all completed grades with expandable subject breakdowns.

#### 4.2 Data Source
`students/{studentId}/metrics/gradeHistory`

#### 4.3 Grade Cards

**For Each Completed Grade:**
```
┌─────────────────────────────────────────┐
│ Grade 6 (2024-2025)                     │
├─────────────────────────────────────────┤
│ CBSE Curriculum                          │
│ June 1, 2024 - May 31, 2025            │
│                                          │
│ Summary:                                 │
│ • Questions: 1,250                       │
│ • Accuracy: 85%                          │
│ • Time: 45h 30m                         │
│ • Subjects: 6                            │
│                                          │
│ [▼ View Subject Breakdown]              │
└─────────────────────────────────────────┘
```

**Expandable Subject Breakdown:**
```
┌─────────────────────────────────────────┐
│ Subject Breakdown:                       │
├─────────────────────────────────────────┤
│ 📐 Math                                  │
│ • Questions: 250 | Accuracy: 88%        │
│ • Time: 8h 15m | Mastery: 85%           │
│ [████████████████░░] 85%                │
│                                          │
│ 🔬 Science                               │
│ • Questions: 220 | Accuracy: 82%        │
│ • Time: 7h 30m | Mastery: 80%           │
│ [████████████████░░] 80%                │
│                                          │
│ ... (other subjects)                     │
└─────────────────────────────────────────┘
```

#### 4.4 Features
- Sorted by grade (descending - most recent first)
- Click to expand/collapse subject breakdown
- Mastery progress bars with color coding
- "View Detailed Logs" button (future: filters Practice History)
- Empty state if no completed grades

---

## Theme Support

### 7.1 Theme Options
- **Light Theme:** Default, bright background
- **Dark Theme:** Dark background, light text

### 7.2 Theme Toggle
- **Location:** Profile Info tab
- **Control:** Toggle button with Sun/Moon icons
- **Storage:** Saves to `students/{studentId}/profile.theme`
- **Application:** Applies `dark` class to `document.documentElement`

### 7.3 Theme Persistence
- Loads theme preference on app initialization
- Applies saved theme before rendering
- Syncs across all tabs and pages

### 7.4 CSS Implementation
```css
/* Light theme (default) */
:root {
  --bg-primary: #ffffff;
  --text-primary: #1a1a1a;
  --card-bg: #f9fafb;
}

/* Dark theme */
.dark {
  --bg-primary: #1a1a1a;
  --text-primary: #ffffff;
  --card-bg: #2d2d2d;
}
```

---

## UI/UX Requirements

### 8.1 Navigation Structure

**Tab-based Navigation:**
1. **Profile Info** - User icon
2. **Consistency** - Flame icon
3. **Chapter Analytics** - BookOpen icon
4. **Grade History** - History icon

**Routing:**
- Base route: `/profile`
- All tabs on same route with tab state management
- Hardware back button returns to dashboard

### 8.2 Responsive Design

**Desktop/Tablet (≥768px):**
- Side-by-side layouts
- Calendar + Detail pane horizontal
- 2-column grids for stats

**Mobile (<768px):**
- Stacked vertical layouts
- Calendar above detail pane
- Single column grids
- Bottom tab navigation for thumb access

**Touch Targets:**
- Calendar dates: Min 44px tap area
- Subject checkboxes: Min 44px
- Navigation buttons: Min 48px
- All interactive elements: Min 44px

### 8.3 Visual Design

**Color Palette:**
- **Primary:** Pink/Purple gradients
- **Success:** Green (#10B981)
- **Warning:** Yellow (#F59E0B)
- **Error:** Red (#EF4444)
- **Info:** Blue (#3B82F6)

**Design Elements:**
- **Borders:** Rounded-3xl (24px)
- **Cards:** Backdrop blur, soft shadows
- **Buttons:** Rounded-xl (12px), bold text
- **Progress Bars:** Rounded-full, color-coded
- **Badges:** Rounded-full, uppercase, small text

**Typography:**
- **Headers:** Serif italic (font-serif)
- **Body:** Sans-serif (font-sans)
- **Labels:** Uppercase, bold, tracking-widest
- **Numbers:** Bold, large for emphasis

### 8.4 Animations

**Framer Motion:**
- Tab transitions: 300ms fade + slide
- Card entrance: Stagger children (100ms delay)
- Expand/collapse: Height animation
- Loading states: Spin animation

**Performance:**
- All animations <300ms
- Use `transform` and `opacity` for GPU acceleration
- Lazy load tabs and data

### 8.5 Empty States

**No Data Available:**
```
┌─────────────────────────────────────────┐
│         📚                               │
│                                          │
│    No Chapter Data                       │
│                                          │
│ Start practicing to see your             │
│ chapter-wise performance here            │
└─────────────────────────────────────────┘
```

**Encouraging Messages:**
- Clear, friendly language
- Visual icons
- Call-to-action where appropriate

---

## Access Control

### 9.1 Students Can:
- ✅ View all their profile information
- ✅ View consistency calendar and streaks
- ✅ Mark current day subjects as complete
- ✅ View chapter analytics
- ✅ View grade history summaries
- ✅ **Toggle theme preference** (only editable field)

### 9.2 Students Cannot:
- ❌ Edit profile information (name, email, grade, etc.)
- ❌ Change practice settings (daily limits, boost periods)
- ❌ Modify past completion records
- ❌ Delete any data
- ❌ Change enrolled subjects
- ❌ Modify exam mode or boost periods

### 9.3 Admin/Parent Control
All profile edits (except theme) are done by admin/parent through User Management interface.

---

## Technical Implementation

### 10.1 Technology Stack
- **Framework:** React with TypeScript
- **Routing:** React Router DOM
- **State Management:** React Context (NinjaContext)
- **Database:** Firebase Firestore
- **Offline Storage:** IndexedDB (Dexie)
- **Animations:** Framer Motion
- **Icons:** Lucide React
- **Styling:** Tailwind CSS

### 10.2 File Structure
```
src/components/student/profile/
├── StudentProfileLayout.tsx          # Main layout with tabs
├── tabs/
│   ├── ProfileInfoTab.tsx            # Profile info + theme toggle
│   ├── ConsistencyTab.tsx            # Calendar + streaks
│   ├── ChapterAnalyticsTab.tsx       # Chapter performance
│   └── GradeHistoryTab.tsx           # Completed grades
└── components/
    ├── ConsistencyCalendar.tsx       # Calendar grid
    ├── DailyDetailPane.tsx           # Daily subject checklist
    ├── StreakDisplay.tsx             # Streak indicators
    └── ChapterCard.tsx               # Expandable chapter card
```

### 10.3 Services
```
src/services/
├── indexedDBService.ts               # Dexie wrapper for question bundles
└── questionBundleSync.ts             # Sync service for bundles
```

### 10.4 Performance Optimizations
- **Lazy Loading:** All tabs lazy loaded
- **Data Caching:** IndexedDB for question bundles
- **Query Optimization:** Indexed Firestore queries
- **Batch Operations:** Bulk saves for syncing
- **Limited Time Window:** 6-month session log window

### 10.5 Error Handling
- Try-catch blocks for all Firestore operations
- Loading states for async operations
- Error messages for failed operations
- Graceful degradation for missing data

---

## Key Metrics Displayed

### 11.1 Consistency Metrics
- Current streak (from calculation)
- Longest streak (from calculation)
- Perfect days this grade year
- Partial days this grade year
- Inactive days this grade year
- Completion rate

### 11.2 Performance Metrics
- Total questions answered (current grade)
- Overall accuracy (current grade)
- Subject-wise accuracy
- Time spent per subject
- Mastery levels per chapter

### 11.3 Chapter-wise Metrics
- Questions answered per chapter
- Accuracy per chapter
- Time spent per chapter
- Mastery level per chapter
- Last practiced date
- Weak topics (future enhancement)

### 11.4 Historical Metrics
- Grade-by-grade comparison
- Subject performance per grade
- Accuracy trends
- Time investment per grade

---

## Implementation Status

### ✅ Completed (Phase 1-3)
- [x] Profile Info Tab with theme toggle
- [x] Consistency Calendar with color coding
- [x] Daily Detail Pane (interactive + read-only)
- [x] Streak Display and calculation
- [x] Grade Year stats
- [x] Chapter Analytics Tab
- [x] Question Bundle syncing
- [x] IndexedDB integration (Dexie)
- [x] Chapter Cards (expandable)
- [x] Grade History Tab
- [x] Subject filtering and sorting
- [x] Responsive design
- [x] Theme support
- [x] Routing integration

### 🔮 Future Enhancements
- [ ] Practice History Tab (filterable session logs)
- [ ] Weak topic detection algorithm
- [ ] Recommended practice based on weak areas
- [ ] Export functionality (PDF/CSV)
- [ ] Compare with peers (anonymized)
- [ ] Advanced mastery algorithm (time-weighted)
- [ ] Trend analysis charts
- [ ] Notifications for streak milestones

---

**Document Status:** Requirements v2.0 - Reflects Actual Implementation  
**Last Reviewed:** February 4, 2026  
**Implementation Status:** Complete (Phases 1-3)  
**Next Review:** After user testing feedback
