# Student Profile - Requirements
**Version:** 1.0  
**Last Updated:** February 2026

---

## Overview
The Student Profile is a **read-only** view where students can see all information stored about them, track their consistency, and view their practice history. Accessible on 10-inch tablets and mobile devices.

---

## 1. Profile Information (Read-Only)

### 1.1 Basic Details
Display the following information (no editing allowed):
- **Student Name**
- **Email**
- **Grade** (current)
- **Curriculum** (CBSE / Telangana State Board)
- **Interface Layout** (Mobile Quest / Study Era)
- **Enrolled Subjects** (list with icons)

### 1.2 Practice Settings
Display current configuration:
- **Daily Question Limits:**
  - Weekdays: X questions
  - Weekends: Y questions
  - Holidays: Z questions
- **Active Boost Periods** (if any)
- **Exam Mode Status** (if active)

### 1.3 Grade History
**Display:** List of completed grades with summary stats

**For Each Completed Grade:**
- Grade number and academic year
- Total questions answered
- Overall accuracy
- Total time spent
- Subject-wise breakdown (questions, accuracy, time)

**Interaction:**
- Click "View Detailed Logs" to filter Practice History by that grade

---

## 2. Consistency Calendar & Streak Dashboard

### 2.1 Purpose
Visual engagement tool to track daily completion of all allotted subject questions and build long-term learning habits.

### 2.2 Grade Year (Academic Year)
- **Definition:** June 1st to May 31st (configurable)
- **Stats Display:** Show total Perfect Days and Partial Days for entire Grade Year
- **Context:** All metrics aligned to academic cycle, not calendar year

### 2.3 Consistency Calendar

**Visual Coding:**
- 🟢 **Perfect Day (Green):** All 6 subjects completed
- 🔵 **Partial Day (Blue):** 1-5 subjects completed
- ⚪ **Inactive Day (White):** 0 subjects completed

**Features:**
- Navigate between months (prev/next arrows)
- Click any date to view details in side pane
- Highlight current date
- Empty states for days with no tracking

**Layout:**
- Desktop/Tablet: Calendar on left, detail pane on right
- Mobile: Stacked view (calendar above, details below)

### 2.4 Daily Detail Side Pane

**Current Date Selected:**
- Interactive checklist to mark subjects complete
- Visual progress ring showing X/6 subjects
- Check/circle icons per subject

**Past Date Selected:**
- Read-only list of completed subjects
- Visual indicators for completed (✓) vs missed (○)
- Summary: "4/6 subjects completed"

**UI Elements:**
- Subject icons with color coding
- Progress percentage
- Time spent (if available)

### 2.5 Streak Mechanics

**All-or-Nothing Rule:**
- Streak increments ONLY on Perfect Days (6/6 subjects)
- Partial days do NOT break streak but don't increment it
- Provides visual evidence of effort

**Display:**
- Current streak count (large, prominent)
- Longest streak achieved
- Streak status indicator

**Example:**
```
🔥 Current Streak: 12 Days
🏆 Longest Streak: 18 Days
```

### 2.6 Yearly Summary Stats

**Display for Current Grade Year:**
- Total Perfect Days: X
- Total Partial Days: Y
- Total Inactive Days: Z
- Completion Rate: X%

---

## 3. Practice History

### 3.1 Grade Filter
- Dropdown to select grade (All Grades / Grade 7 / Grade 6 / etc.)
- Default: Current grade only

### 3.2 Monthly View
**For Each Month:**
- Month/Year header with grade indicator
- Total questions answered
- Overall accuracy
- Subject breakdown (questions, accuracy per subject)

**Interaction:**
- Expand/collapse monthly details
- Click to view day-by-day logs

---

## 4. UI/UX Requirements

### 4.1 Responsive Design
- **Desktop/Tablet (10-inch):** Side-by-side layouts
- **Mobile:** Stacked vertical layouts
- Touch-friendly targets (min 44px)

### 4.2 Visual Design
- **Color Palette:** Soft Slate, Blue, Green
- **Borders:** Rounded corners (3xl)
- **Shadows:** Subtle elevation
- **Typography:** Clear hierarchy, readable sizes

### 4.3 Navigation
- Tab-based navigation:
  - **Profile Info**
  - **Consistency & Streaks**
  - **Chapter Analytics**
  - **Practice History**
  - **Grade History**

### 4.4 Empty States
- Clear messaging when no data available
- Encouraging prompts for new students
- Visual placeholders

---

## 3. Chapter-wise Analytics

### 3.1 Purpose
Detailed breakdown of student performance at the chapter/module level, showing questions answered, time spent, accuracy, and mastery for each chapter across all subjects.

### 3.2 Subject Filter
- Dropdown to select subject (All Subjects / Math / Science / English / etc.)
- Default: All Subjects

### 3.3 Chapter List View

**For Each Chapter:**
```
┌─────────────────────────────────────────┐
│ 📐 Math - Chapter 3: Fractions          │
├─────────────────────────────────────────┤
│ Questions: 45 | Time: 2h 15m            │
│ Accuracy: 82% | Mastery: 78%            │
│                                          │
│ [████████████░░░░] 78%                  │
└─────────────────────────────────────────┘
```

**Display Fields:**
- Chapter icon and name
- Questions answered
- Time spent (formatted: Xh Ym)
- Accuracy percentage
- Mastery level (0-100%)
- Visual progress bar

**Sorting Options:**
- By mastery (low to high / high to low)
- By questions answered
- By accuracy
- Alphabetical

### 3.4 Chapter Detail View

**Click on a chapter to expand:**
- Total questions in bundle vs answered
- Breakdown by difficulty (if available)
- Recent practice sessions for this chapter
- Weak topics/concepts (based on incorrect answers)
- Recommended next steps

**Example:**
```
┌─────────────────────────────────────────┐
│ 📐 Fractions (Chapter 3)                │
├─────────────────────────────────────────┤
│ Progress: 45/60 questions               │
│ Accuracy: 82% (37 correct, 8 incorrect) │
│ Time Spent: 2h 15m                      │
│ Mastery: 78%                            │
│                                          │
│ Recent Sessions:                         │
│ • Feb 2: 12 Qs | 85% | 25m              │
│ • Jan 28: 15 Qs | 80% | 32m             │
│ • Jan 25: 18 Qs | 81% | 28m             │
│                                          │
│ Needs Attention:                         │
│ • Improper fractions (60% accuracy)     │
│ • Mixed numbers (65% accuracy)          │
└─────────────────────────────────────────┘
```

### 3.5 Data Aggregation

**Source:** Aggregate from `session_logs` filtered by:
- Current grade
- Selected subject
- Group by `moduleId` (chapter)

**Calculations:**
- Questions answered: Count of log entries per chapter
- Accuracy: (Correct answers / Total answers) × 100
- Time spent: Sum of `timeSpent` per chapter
- Mastery: Weighted calculation based on recent performance

### 3.6 Visual Indicators

**Mastery Levels:**
- 🟢 **Mastered (80-100%):** Green progress bar
- 🟡 **Learning (50-79%):** Yellow progress bar
- 🔴 **Needs Practice (0-49%):** Red progress bar

**Icons:**
- Subject-specific icons (📐 Math, 🔬 Science, 📚 English, etc.)
- Status badges (New, In Progress, Mastered)

---

- Visual placeholders

---

## 5. Data Sources

### 5.1 Profile Data
- **Source:** `students/{studentId}`
- **Fields:** All configuration and basic info

### 5.2 Current Metrics
- **Source:** `students/{studentId}/metrics/current`
- **Fields:** Streaks, weekly stats, subject performance

### 5.3 Grade History
- **Source:** `students/{studentId}/metrics/gradeHistory`
- **Fields:** Array of completed grades with stats

### 5.4 Session Logs
- **Source:** `students/{studentId}/session_logs/{YYYY-MM}`
- **Fields:** Detailed practice logs with grade field for filtering

### 5.5 Daily Completion Tracking
- **Source:** `students/{studentId}/daily_completion/{grade}`
- **Fields:** Array of daily completion records for a grade 

**Structure:**
```typescript
interface DailyCompletion {
  date: string;           // YYYY-MM-DD
  completedSubjects: string[];  // ['math', 'science', ...]
  totalSubjects: number;  // 6
  isPerfectDay: boolean;
  timestamp: Timestamp;
}
```

### 5.6 Question Bundle Metadata
- **Source:** `question_bundle_metadata` (global collection)
- **Purpose:** Track question bundles and enable efficient syncing to IndexedDB
- **Query:** Single read to get all bundles for a grade and subject

**Structure:**
```typescript
interface QuestionBundleMetadata {
  bundleId: string;           // Unique identifier
  bundleName: string;         // e.g., "Math Grade 7 - Fractions"
  subject: string;            // 'math', 'science', etc.
  grade: number;              // 7
  moduleId: string;           // Chapter/module identifier
  questionCount: number;      // Total questions in bundle
  lastUpdated: Timestamp;     // When bundle was last modified
  version: number;            // Version number for tracking
  difficulty?: string;        // Optional: 'easy', 'medium', 'hard'
  topics?: string[];          // Optional: Sub-topics covered
}
```

**Example Document:**
```json
{
  "bundleId": "math_g7_fractions_v2",
  "bundleName": "Grade 7 Math - Fractions",
  "subject": "math",
  "grade": 7,
  "moduleId": "math_ch3",
  "questionCount": 60,
  "lastUpdated": "2026-01-15T10:30:00Z",
  "version": 2,
  "difficulty": "medium",
  "topics": ["proper_fractions", "improper_fractions", "mixed_numbers"]
}
```

**Sync Strategy:**

1. **Initial Load:**
   - Query `question_bundle_metadata` where `grade == currentGrade`
   - Get all bundle metadata in one read
   - Compare `lastUpdated` with IndexedDB cache

2. **Incremental Sync:**
   - Check if bundle exists in IndexedDB
   - If not exists OR `lastUpdated` is newer: Download bundle
   - Store in IndexedDB with metadata

3. **Usage for Analytics:**
   - Chapter analytics needs original question data (difficulty, topics, etc.)
   - Session logs don't store all question details
   - IndexedDB provides fast local access to question bundles
   - Enables offline analytics and detailed breakdowns

**IndexedDB Schema:**
```typescript
interface CachedQuestionBundle {
  bundleId: string;
  metadata: QuestionBundleMetadata;
  questions: Question[];      // Full question data
  cachedAt: Timestamp;
  lastSyncedVersion: number;
}
```

**Query Pattern:**
```typescript
// Get all bundles for current grade
const bundlesQuery = query(
  collection(db, 'question_bundle_metadata'),
  where('grade', '==', currentGrade)
);

const bundlesSnapshot = await getDocs(bundlesQuery);
const bundles = bundlesSnapshot.docs.map(doc => doc.data());

// Check which bundles need updating
const bundlesToSync = bundles.filter(bundle => {
  const cached = await getFromIndexedDB(bundle.bundleId);
  return !cached || cached.lastSyncedVersion < bundle.version;
});

// Download and cache only updated bundles
for (const bundle of bundlesToSync) {
  const questions = await fetchQuestionBundle(bundle.bundleId);
  await saveToIndexedDB(bundle.bundleId, { metadata: bundle, questions });
}
```

**Benefits:**
- ✅ **One Read:** Single query gets all bundle metadata for a grade
- ✅ **Efficient Sync:** Only download bundles that changed
- ✅ **Offline Support:** Questions cached in IndexedDB
- ✅ **Rich Analytics:** Access to full question data for detailed analysis
- ✅ **Version Control:** Track bundle updates with version numbers

---

## 6. Consistency Calendar Implementation

### 6.1 Data Aggregation
- Query and display `daily_completion/{grade}` for current month and current grade year
- Calculate Perfect/Partial/Inactive days
- Update streak based on consecutive Perfect Days

### 6.2 Interaction Flow

**User clicks a date:**
1. Fetch daily completion record for that date
2. Display in side pane
3. If current date: Allow marking subjects complete
4. If past date: Show read-only summary

**User marks subject complete (current date only):**
1. Update `daily_completion` document
2. Recalculate day status (Perfect/Partial)
3. Update streak if necessary
4. Refresh calendar visual

### 6.3 Streak Calculation
```typescript
function calculateStreak(dailyCompletions: DailyCompletion[]): number {
  let streak = 0;
  const sortedDays = dailyCompletions
    .filter(d => d.isPerfectDay)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  
  for (const day of sortedDays) {
    if (isConsecutive(day.date, streak)) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}
```

---

## 7. Mobile Optimization

### 7.1 Touch Targets
- Calendar dates: Min 44px tap area
- Subject checkboxes: Min 44px
- Navigation buttons: Min 48px

### 7.2 Stacked Layouts
- Calendar takes full width
- Detail pane below calendar
- Tabs at bottom for easy thumb access

### 7.3 Performance
- Lazy load monthly data
- Cache current month
- Smooth animations (< 300ms)

---

## 8. Access Control

**Students Can:**
- ✅ View all their profile information
- ✅ View consistency calendar and streaks
- ✅ Mark current day subjects as complete
- ✅ View practice history filtered by grade
- ✅ View grade history summaries

**Students Cannot:**
- ❌ Edit profile information (name, email, grade, etc.)
- ❌ Change practice settings (daily limits, boost periods)
- ❌ Modify past completion records
- ❌ Delete any data

**Note:** All profile edits are done by admin/parent through User Management interface.

---

## 9. Key Metrics Displayed

### 9.1 Consistency Metrics
- Current streak
- Longest streak
- Perfect days this grade year
- Partial days this grade year
- Completion rate

### 9.2 Performance Metrics
- Total questions answered (current grade)
- Overall accuracy (current grade)
- Subject-wise accuracy
- Time spent per subject
- Mastery levels per module

### 9.3 Chapter-wise Metrics
- Questions answered per chapter
- Accuracy per chapter
- Time spent per chapter
- Mastery level per chapter
- Weak topics/concepts identification
- Progress tracking (answered vs total questions in bundle)

### 9.4 Historical Metrics
- Grade-by-grade comparison
- Year-over-year improvement
- Subject performance trends

---

**Document Status:** Requirements v1.0  
**Target Users:** Students (ages 7-16)  
**Devices:** 10-inch tablets, Android phones, iOS devices
