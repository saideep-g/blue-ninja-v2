# User Management - Family Edition
**Last Updated:** February 2026

---

## Overview
Simple user management for a family learning app supporting up to 5 students across different grades. The parent acts as the admin and can easily configure each child's learning experience.

---

## 1. Student Selection

### 1.1 Student List
**Location:** Admin Sidebar → Manage Students

**Display:**
- Simple list view (no dropdown needed for 5 students)
- Each student card shows:
  - Student Name
  - Grade (e.g., "Grade 7")
  - Current streak (e.g., "🔥 5 days")
  - Quick status (Active practice / Needs attention)

**Quick Actions:**
- Click any student card to open their profile
- Visual indicator for who practiced today

---

## 2. Student Profile Editor

### 2.1 Basic Information
**Firestore Path:** `students/{studentId}`

**Editable Fields:**
- Student Name
- Grade (dropdown: 1-12)
- Email
- Curriculum (CBSE / Telangana State Board)

### 2.2 Interface Layout
**Field:** `preferredLayout`

**Options:**
- **Mobile Quest** - Gamified experience (recommended for younger students)
- **Study Era** - Subject-based navigation (recommended for older students)

**Quick Toggle:**
- Simple radio button selection
- Preview thumbnail for each layout

---

## 3. Subject & Module Configuration

### 3.1 Subject Enrollment
**Field:** `enrolledSubjects`

**Interface:**
- Checkbox list of available subjects:
  - ☑️ Mathematics
  - ☑️ Science
  - ☑️ English
  - ☑️ Social Studies
  - ☑️ Geography (optional)
  - ☑️ Tables Practice

**Behavior:**
- Select all subjects relevant to the student's grade
- Automatically loads grade-appropriate curriculum

### 3.2 Module (Chapter) Management
**Field:** `enabledModules`

**Purpose:**
Enable only the chapters that have been taught in school so students practice what they know.

**Interface Design:**

```
┌─────────────────────────────────────────┐
│ Mathematics - Grade 7                    │
├─────────────────────────────────────────┤
│                                          │
│ ☑️ Chapter 1: Integers                   │
│    Enabled on: Jan 15, 2026             │
│                                          │
│ ☑️ Chapter 2: Fractions & Decimals       │
│    Enabled on: Jan 22, 2026             │
│                                          │
│ ☐ Chapter 3: Data Handling               │
│    [Enable Now] [Schedule for: ___]     │
│                                          │
│ ☐ Chapter 4: Simple Equations            │
│    [Enable Now] [Schedule for: ___]     │
│                                          │
└─────────────────────────────────────────┘

[Bulk Enable] [Schedule Multiple]
```

**Key Features:**

1. **Visual Chapter List:**
   - Checkbox for each chapter
   - Shows when it was enabled
   - Clear visual distinction between enabled/disabled

2. **Enable Options:**
   - **Enable Now** - Immediately available for practice
   - **Schedule for Date** - Auto-enable on a specific date (e.g., when school will teach it)

3. **Bulk Operations:**
   - "Enable All Up To Chapter X" button
   - "Schedule Next 5 Chapters" with date picker
   - "Import School Calendar" (paste dates for each chapter)

4. **Smart Scheduling:**
   ```
   Schedule Multiple Chapters:
   
   Chapter 3: [Feb 1, 2026]
   Chapter 4: [Feb 8, 2026]
   Chapter 5: [Feb 15, 2026]
   
   [Apply Schedule]
   ```

### 3.3 Recency Weighting
**Field:** `recentTopics`

**Automatic Behavior:**
- Chapters enabled in the last 15 days get **2x more questions**
- Acts as automatic revision for recently learned topics
- No manual configuration needed

**Visual Indicator:**
```
☑️ Chapter 2: Fractions & Decimals
   Enabled on: Jan 22, 2026
   ⭐ Recent Topic - Extra Practice Active
```

---

## 4. Practice Volume Settings

### 4.1 Daily Question Limits
**Field:** `dailyQuestionConfig`

Daily Practice Questions:

Regular Days:     [25] questions per all subject / {subjectName}
Sundays:         [30] questions per all subject / {subjectName} (every Sunday)
Holidays:         [35] questions per all subject / {subjectName} (ability to provide specific date range for holidays)
Add rows

[Save Settings]

### 4.2 Boost Periods
**Field:** `boostPeriods`

**Purpose:**
Increase practice during holidays, exam prep, or when focusing on specific subjects.

**Interface:**
```
┌─────────────────────────────────────────┐
│ Create Boost Period                      │
├─────────────────────────────────────────┤
│                                          │
│ Period Name: [Winter Break Practice]    │
│                                          │
│ From: [Dec 20, 2026]  To: [Jan 5, 2027] │
│                                          │
│ Extra Questions Per Subject:             │
│   Mathematics:  [+10] questions          │
│   Science:      [+8]  questions          │
│   English:      [+5]  questions          │
│   Social:       [+0]  questions          │
│                                          │
│ ☑️ Active                                │
│                                          │
│ [Save Boost Period]                      │
└─────────────────────────────────────────┘

Active Boost Periods:
• Winter Break Practice (Dec 20 - Jan 5)
• Exam Prep - March (Mar 1 - Mar 15)
```

**Features:**
- Simple date range picker
- Subject-specific boost amounts
- Toggle to activate/deactivate
- Visual calendar showing active periods

---

## 5. Exam Mode

### 5.1 Exam Configuration
**Field:** `examMode`

**Purpose:**
Focus practice on specific exam topics during exam preparation period.

**Interface:**
```
┌─────────────────────────────────────────┐
│ Exam Mode Configuration                  │
├─────────────────────────────────────────┤
│                                          │
│ ☑️ Enable Exam Mode                     │
│                                          │
│ Exam Name: [Mid-Term - March 2026]      │
│                                          │
│ Exam Period:                             │
│   From: [Mar 1, 2026]                   │
│   To:   [Mar 15, 2026]                  │
│                                          │
│ Focus Topics:                            │
│                                          │
│ Mathematics:                             │
│   ☑️ Chapter 1: Integers                │
│   ☑️ Chapter 2: Fractions               │
│   ☐ Chapter 3: Data Handling            │
│   ☑️ Chapter 5: Lines & Angles          │
│                                          │
│ Science:                                 │
│   ☑️ Chapter 3: Heat & Temperature      │
│   ☑️ Chapter 4: Acids & Bases           │
│                                          │
│ Question Settings:                       │
│   Difficulty: [●●●○○] Hard              │
│   Questions per day: [×1.5] (30 total)  │
│                                          │
│ [Save Exam Mode]                         │
└─────────────────────────────────────────┘
```

**Behavior When Active:**
- Only shows questions from selected chapters
- Increases difficulty level
- Provides exam-style timed practice
- Shows exam readiness score

---

## 6. Student Performance Metrics

### 6.1 Individual Student Dashboard
**Accessible from:** Student profile page

**Key Metrics:**

```
┌─────────────────────────────────────────┐
│ Arjun's Performance - Grade 7           │
├─────────────────────────────────────────┤
│                                          │
│ This Week:                               │
│   Questions Answered: 142                │
│   Overall Accuracy: 78%                  │
│   Current Streak: 🔥 12 days             │
│   Time Spent: 3h 45m                     │
│                                          │
│ Subject Performance:                     │
│   Mathematics:  85% ████████░░ (120 Qs)  │
│   Science:      72% ███████░░░ (95 Qs)   │
│   English:      81% ████████░░ (87 Qs)   │
│   Social:       68% ██████░░░░ (64 Qs)   │
│                                          │
│ Needs Attention:                         │
│   ⚠️ Science Ch.4: Only 45% accuracy    │
│   ⚠️ Math Ch.3: Hasn't practiced in 5d  │
│                                          │
└─────────────────────────────────────────┘
```

### 6.2 Progress Tracking
**Visual Charts:**
- **Weekly Accuracy Trend:** Line graph showing daily accuracy
- **Subject Distribution:** Pie chart of time spent per subject
- **Mastery Heatmap:** Visual grid showing strong/weak topics

### 6.3 Comparative View (All Students)
**Family Dashboard:**
```
┌─────────────────────────────────────────┐
│ Family Learning Summary - This Week      │
├─────────────────────────────────────────┤
│                                          │
│ Arjun (Grade 7):    142 Qs | 78% | 🔥12 │
│ Priya (Grade 9):    156 Qs | 84% | 🔥15 │
│ Rohan (Grade 6):    98 Qs  | 71% | 🔥8  │
│ Ananya (Grade 2):   67 Qs  | 88% | 🔥10 │
│                                          │
│ Total Family Practice: 463 questions     │
│                                          │
└─────────────────────────────────────────┘
```

### 6.4 Admin Notifications Page
**Auto-Generated Notifications:**
- "Arjun hasn't practiced in 3 days"
- "Priya's Math accuracy dropped to 65%"
- "Rohan completed 7-day streak! 🎉"
- "Ananya mastered Chapter 2!"

---


## 6.5 Yearly Rollover & Grade Promotion

### Purpose
When a student completes a grade and moves to the next academic year, the system needs to:
1. Update the student's current grade
2. Reset grade-specific configurations

### Admin Interface

**Location:** Student Profile → Basic Info Tab

**Grade Promotion UI:**
```
┌─────────────────────────────────────────┐
│ Current Grade: 7                         │
│                                          │
│ [Promote to Grade 8]                    │
│                                          │
│ ⚠️ This will:                           │
│   • Move student to Grade 8             │
│   • Archive Grade 7 performance data    │
│   • Load Grade 8 curriculum             │
│   • Reset module selections             │
│                                          │
│ Previous grades will remain viewable    │
│ in the Grade History section.           │
│                                          │
│ [Confirm Promotion] [Cancel]            │
└─────────────────────────────────────────┘
```

### Grade History Tracking

**Field:** `gradeHistory` (added to Student Profile)

**Structure:**
```typescript
gradeHistory: Array<{
  grade: number;
  academicYear: string; // e.g., "2025-2026"
  startDate: string;    // YYYY-MM-DD
  endDate: string;      // YYYY-MM-DD
  curriculum: string;
  totalQuestions: number;
  overallAccuracy: number;
  subjectStats: {
    [subject: string]: {
      questionsAnswered: number;
      accuracy: number;
      masteryLevel: number;
      timeSpent: number;  // Total minutes spent on this subject
    }
  };
}>;
```

**Example:**
```json
"gradeHistory": [
  {
    "grade": 6,
    "academicYear": "2024-2025",
    "startDate": "2024-04-01",
    "endDate": "2025-03-31",
    "curriculum": "CBSE",
    "totalQuestions": 2847,
    "overallAccuracy": 82,
    "subjectStats": {
      "math": {
        "questionsAnswered": 856,
        "accuracy": 85,
        "masteryLevel": 78,
        "timeSpent": 428
      },
      "science": {
        "questionsAnswered": 743,
        "accuracy": 79,
        "masteryLevel": 72,
        "timeSpent": 371
      }
    }
  }
]
```

### Session Logs Enhancement

**Current Structure:** `students/{studentId}/session_logs/{YYYY-MM}/entries`

**Add Grade Field to Each Entry:**
```typescript
interface SessionLogEntry {
  questionId: string;
  questionText: string;
  studentAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  timestamp: Timestamp;
  subject: string;
  grade: number;        // ← NEW: Track which grade this was for
  timeSpent: number;
  questionType: string;
  // ... other fields
}
```

**Why Store Grade in Logs?**
- Enables filtering logs by grade
- Maintains accurate historical context
- Supports year-over-year progress comparison

### Viewing Grade History

**Admin UI - Grade History Tab:**
```
┌─────────────────────────────────────────┐
│ Grade History                            │
├─────────────────────────────────────────┤
│                                          │
│ Current: Grade 7 (2025-2026)            │
│                                          │
│ Previous Grades:                         │
│                                          │
│ ┌─────────────────────────────────────┐ │
│ │ Grade 6 (2024-2025)                 │ │
│ │ Questions: 2,847 | Accuracy: 82%    │ │
│ │                                     │ │
│ │ Math:    856 Qs | 85%               │ │
│ │ Science: 743 Qs | 79%               │ │
│ │ English: 672 Qs | 84%               │ │
│ │                                     │ │
│ │ [View Practice Logs]                │ │
│ └─────────────────────────────────────┘ │
│                                          │
│ ┌─────────────────────────────────────┐ │
│ │ Grade 5 (2023-2024)                 │ │
│ │ Questions: 1,923 | Accuracy: 78%    │ │
│ │ [View Practice Logs]                │ │
│ └─────────────────────────────────────┘ │
│                                          │
└─────────────────────────────────────────┘
```

**Clicking "View Practice Logs":**
- Opens the Practice History view
- Automatically filters to show only that grade's logs
- Uses the `grade` field in session logs for filtering

### Promotion Workflow

**Step-by-Step Process:**

1. **Admin Clicks "Promote to Grade X"**
   
2. **System Calculates Final Stats:**
   - Aggregate all performance data for current grade
   - Calculate overall accuracy, total questions, subject stats
   
3. **Create Grade History Entry:**
   - Add completed grade to `gradeHistory` array
   - Store final performance summary
   
4. **Update Current Grade:**
   - Increment `grade` field
   - Update `curriculum` if needed (e.g., Grade 10 → different board)
   
5. **Reset Module Configuration:**
   - Clear `enabledModules` (new grade = new chapters)
   - Admin will re-enable modules as they're taught
   
6. **Preserve All Logs:**
   - Session logs remain untouched
   - Can still be viewed via Grade History

### Data Archiving Strategy

**What Gets Archived:**
- Final performance summary → `gradeHistory`
- All session logs → Remain in `session_logs/{YYYY-MM}`

**What Gets Reset:**
- `enabledModules` → Empty (admin re-enables for new grade)
- `boostPeriods` → Cleared (new academic year)
- `examMode` → Reset to default

**What Stays:**
- `enrolledSubjects` → Typically same subjects
- `preferredLayout` → Student's preference
- `dailyQuestionConfig` → Practice settings

### Implementation Notes

**Cloud Function: `promoteStudentGrade`**
```typescript
async function promoteStudentGrade(studentId: string, newGrade: number) {
  const studentRef = doc(db, 'students', studentId);
  const studentSnap = await getDoc(studentRef);
  const studentData = studentSnap.data();
  const currentGrade = studentData.grade;
  
  // 1. Calculate aggregate stats for completed grade
  const gradeStats = await calculateGradeStats(studentId, currentGrade);
  
  // 2. Append to grade history document
  const gradeHistoryRef = doc(db, `students/${studentId}/metrics/gradeHistory`);
  const gradeHistorySnap = await getDoc(gradeHistoryRef);
  
  const completedGradeEntry = {
    grade: currentGrade,
    academicYear: gradeStats.academicYear,
    startDate: gradeStats.startDate,
    endDate: new Date().toISOString().split('T')[0],
    curriculum: studentData.curriculum,
    totalQuestions: gradeStats.totalQuestions,
    totalCorrect: gradeStats.totalCorrect,
    overallAccuracy: gradeStats.overallAccuracy,
    totalTimeSpent: gradeStats.totalTimeSpent,
    subjectStats: gradeStats.subjectStats,
    completedAt: serverTimestamp()
  };
  
  if (gradeHistorySnap.exists()) {
    // Append to existing array
    await updateDoc(gradeHistoryRef, {
      completedGrades: arrayUnion(completedGradeEntry),
      lastUpdated: serverTimestamp()
    });
  } else {
    // Create new gradeHistory document
    await setDoc(gradeHistoryRef, {
      studentId: studentId,
      completedGrades: [completedGradeEntry],
      lastUpdated: serverTimestamp()
    });
  }
  
  // 3. Update student profile for new grade
  await updateDoc(studentRef, {
    grade: newGrade,
    enabledModules: {},
    boostPeriods: [],
    'examMode.enabled': false,
    'examMode.examName': '',
    'examMode.focusTopics': {},
    updatedAt: serverTimestamp()
  });
  
  // 4. Reset current metrics for new grade
  const currentMetricsRef = doc(db, `students/${studentId}/metrics/current`);
  await updateDoc(currentMetricsRef, {
    currentStreak: 0,
    weeklyStats: {
      questionsAnswered: 0,
      correctAnswers: 0,
      accuracy: 0,
      timeSpent: 0
    },
    subjectStats: {},
    moduleStats: {}
  });
  
  console.log(`Student ${studentId} promoted from Grade ${currentGrade} to ${newGrade}`);
  console.log(`Grade ${currentGrade} summary appended to gradeHistory`);
}

async function calculateGradeStats(studentId: string, grade: number) {
  // Query all session logs where grade == specified grade
  // Aggregate total questions, correct answers, time spent per subject
  // Return aggregated stats including academicYear and startDate
  // Implementation details...
}
```

---

## 7. Data Structure

### 7.1 Student Profile Schema
```typescript
interface StudentProfile {
  // Basic Info
  studentId: string;
  studentName: string;
  email: string;
  grade: number; // 1-12
  curriculum: 'CBSE' | 'Telangana State Board';
  
  // Interface
  preferredLayout: 'mobile-quest-v1' | 'study-era';
  
  // Subjects
  enrolledSubjects: string[]; // ['math', 'science', 'english', 'social', 'geography', 'tables']
  
  // Module Configuration
  enabledModules: {
    [subject: string]: {
      [moduleId: string]: {
        enabled: boolean;
        enabledDate: string; // ISO date (YYYY-MM-DD)
        scheduledDate?: string; // Optional: For future auto-enable (YYYY-MM-DD)
      }
    }
  };
  
  // Practice Settings
  dailyQuestionConfig: {
    weekday: number;    // default: 20
    weekend: number;    // default: 25
    holiday: number;    // default: 30
  };
  
  // Boost Periods
  boostPeriods: Array<{
    id: string;
    name: string;
    startDate: string; // YYYY-MM-DD
    endDate: string;   // YYYY-MM-DD
    subjectBoosts: { 
      [subject: string]: number  // Extra questions per subject (e.g., math: 10)
    };
    active: boolean;
  }>;
  
  // Exam Mode
  examMode: {
    enabled: boolean;
    examName: string;
    startDate: string; // YYYY-MM-DD
    endDate: string;   // YYYY-MM-DD
    focusTopics: { 
      [subject: string]: string[]  // Array of module IDs
    };
    questionMultiplier: number; // e.g., 1.5 for 50% more questions
    difficultyLevel: 'medium' | 'hard';
  };
  
  
  // Metadata
  lastActive: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 7.2 Example Student Document
```json
{
  "studentId": "arjun_2026",
  "studentName": "Arjun Kumar",
  "email": "arjun@example.com",
  "grade": 7,
  "curriculum": "CBSE",
  "preferredLayout": "study-era",
  
  "enrolledSubjects": ["math", "science", "english", "social"],
  
  "enabledModules": {
    "math": {
      "ch1_integers": {
        "enabled": true,
        "enabledDate": "2026-01-15"
      },
      "ch2_fractions": {
        "enabled": true,
        "enabledDate": "2026-01-22"
      },
      "ch3_data_handling": {
        "enabled": false,
        "scheduledDate": "2026-02-05"
      }
    },
    "science": {
      "ch1_nutrition": {
        "enabled": true,
        "enabledDate": "2026-01-10"
      }
    }
  },
  
  "dailyQuestionConfig": {
    "weekday": 20,
    "weekend": 25,
    "holiday": 30
  },
  
  "boostPeriods": [
    {
      "id": "winter_break_2026",
      "name": "Winter Break Practice",
      "startDate": "2026-12-20",
      "endDate": "2027-01-05",
      "subjectBoosts": {
        "math": 10,
        "science": 8,
        "english": 5
      },
      "active": true
    }
  ],
  
  "examMode": {
    "enabled": false,
    "examName": "",
    "startDate": "",
    "endDate": "",
    "focusTopics": {},
    "questionMultiplier": 1.0,
    "difficultyLevel": "medium"
  },
  
  "lastActive": "2026-02-03T10:30:00Z",
  "createdAt": "2026-01-01T00:00:00Z",
  "updatedAt": "2026-02-03T10:30:00Z"
}
```

### 7.3 Performance Metrics (Separate Collection)
**Firestore Path:** `students/{studentId}/metrics/current`

Performance data is stored separately to avoid bloating the main student profile and to enable efficient querying.

```typescript
interface StudentMetrics {
  studentId: string;
  
  // Current Streak
  currentStreak: number;
  longestStreak: number;
  lastPracticeDate: string; // YYYY-MM-DD
  
  // Weekly Stats
  weeklyStats: {
    questionsAnswered: number;
    correctAnswers: number;
    accuracy: number; // percentage
    timeSpent: number; // minutes
  };
  
  // Subject Performance
  subjectStats: {
    [subject: string]: {
      totalQuestions: number;
      correctAnswers: number;
      accuracy: number; // percentage
      lastPracticed: string; // YYYY-MM-DD
    }
  };
  
  // Chapter/Module Performance
  moduleStats: {
    [subject: string]: {
      [moduleId: string]: {
        questionsAnswered: number;
        accuracy: number;
        masteryLevel: number; // 0-100
        lastPracticed: string;
      }
    }
  };
  
  // Metadata
  lastUpdated: Timestamp;
}
```

### 7.4 Example Metrics Document
```json
{
  "studentId": "arjun_2026",
  "currentStreak": 12,
  "longestStreak": 18,
  "lastPracticeDate": "2026-02-03",
  
  "weeklyStats": {
    "questionsAnswered": 142,
    "correctAnswers": 111,
    "accuracy": 78,
    "timeSpent": 225
  },
  
  "subjectStats": {
    "math": {
      "totalQuestions": 120,
      "correctAnswers": 102,
      "accuracy": 85,
      "lastPracticed": "2026-02-03"
    },
    "science": {
      "totalQuestions": 95,
      "correctAnswers": 68,
      "accuracy": 72,
      "lastPracticed": "2026-02-02"
    }
  },
  
  "moduleStats": {
    "math": {
      "ch1_integers": {
        "questionsAnswered": 45,
        "accuracy": 91,
        "masteryLevel": 85,
        "lastPracticed": "2026-02-01"
      },
      "ch2_fractions": {
        "questionsAnswered": 38,
        "accuracy": 76,
        "masteryLevel": 65,
        "lastPracticed": "2026-02-03"
      }
    }
  },
  
  "lastUpdated": "2026-02-03T10:30:00Z"
}
```

### 7.5 Data Storage Strategy

**Main Collections:**
1. `students/{studentId}` - Student profile and configuration
2. `students/{studentId}/metrics/current` - Current grade performance metrics
3. `students/{studentId}/metrics/gradeHistory` - All completed grades summary
4. `students/{studentId}/session_logs/{YYYY-MM}` - Detailed practice history logs

**Why Separate Metrics?**
- Student profile changes infrequently (configuration)
- Metrics update after every practice session (high write frequency)
- Separating them improves performance and reduces costs
- Easier to query and aggregate metrics across students

**Grade History Metrics Structure:**

**Two-Document Approach:**
- **`metrics/current`** - Always shows current grade performance (queried frequently)
- **`metrics/gradeHistory`** - Contains array of all completed grades (queried only when viewing profile/history)

When a student is promoted from Grade 6 to Grade 7, append to:
`students/{studentId}/metrics/gradeHistory`

```typescript
interface GradeHistoryDocument {
  studentId: string;
  completedGrades: Array<{
    grade: number;
    academicYear: string;     // e.g., "2024-2025"
    startDate: string;        // YYYY-MM-DD
    endDate: string;          // YYYY-MM-DD
    curriculum: string;
    
    // Overall Stats
    totalQuestions: number;
    totalCorrect: number;
    overallAccuracy: number;  // percentage
    totalTimeSpent: number;   // minutes
    
    // Subject-wise Performance
    subjectStats: {
      [subject: string]: {
        questionsAnswered: number;
        correctAnswers: number;
        accuracy: number;       // percentage
        timeSpent: number;      // minutes
        masteryLevel: number;   // 0-100
      }
    };
    
    completedAt: Timestamp;  // When grade was completed
  }>;
  
  lastUpdated: Timestamp;
}
```

**Example Grade History Document:**
```json
// Path: students/arjun_2026/metrics/gradeHistory
{
  "studentId": "arjun_2026",
  "completedGrades": [
    {
      "grade": 5,
      "academicYear": "2023-2024",
      "startDate": "2023-04-01",
      "endDate": "2024-03-31",
      "curriculum": "CBSE",
      "totalQuestions": 1923,
      "totalCorrect": 1500,
      "overallAccuracy": 78,
      "totalTimeSpent": 965,
      "subjectStats": {
        "math": {
          "questionsAnswered": 612,
          "correctAnswers": 478,
          "accuracy": 78,
          "timeSpent": 306,
          "masteryLevel": 72
        },
        "science": {
          "questionsAnswered": 534,
          "correctAnswers": 420,
          "accuracy": 79,
          "timeSpent": 267,
          "masteryLevel": 70
        }
      },
      "completedAt": "2024-03-31T18:00:00Z"
    },
    {
      "grade": 6,
      "academicYear": "2024-2025",
      "startDate": "2024-04-01",
      "endDate": "2025-03-31",
      "curriculum": "CBSE",
      "totalQuestions": 2847,
      "totalCorrect": 2335,
      "overallAccuracy": 82,
      "totalTimeSpent": 1425,
      "subjectStats": {
        "math": {
          "questionsAnswered": 856,
          "correctAnswers": 728,
          "accuracy": 85,
          "timeSpent": 428,
          "masteryLevel": 78
        },
        "science": {
          "questionsAnswered": 743,
          "correctAnswers": 587,
          "accuracy": 79,
          "timeSpent": 371,
          "masteryLevel": 72
        },
        "english": {
          "questionsAnswered": 672,
          "correctAnswers": 564,
          "accuracy": 84,
          "timeSpent": 336,
          "masteryLevel": 80
        },
        "social": {
          "questionsAnswered": 576,
          "correctAnswers": 456,
          "accuracy": 79,
          "timeSpent": 290,
          "masteryLevel": 75
        }
      },
      "completedAt": "2025-03-31T18:00:00Z"
    }
  ],
  "lastUpdated": "2025-03-31T18:00:00Z"
}
```

**Benefits of Single gradeHistory Document:**
- **Two-Document Query:** Only need to fetch `current` and `gradeHistory`
- **Efficient:** One read operation gets all historical grades
- **Clean Structure:** Array makes it easy to iterate and display
- **Chronological:** Grades naturally ordered from oldest to newest
- **Profile View:** Perfect for "View Grade History" section in student profile

**Data Flow:**

1. **During Grade 6:**
   - Session logs → `session_logs/2024-04`, `session_logs/2024-05`, etc.
   - Current metrics → `metrics/current` (updated live)
   - Grade history → Not touched

2. **When Promoted to Grade 7:**
   - Calculate aggregate stats from all Grade 6 session logs
   - Append Grade 6 summary to `metrics/gradeHistory.completedGrades[]`
   - Update student profile: `grade = 7`
   - Reset `metrics/current` for Grade 7
   - All session logs remain untouched

3. **Viewing Performance:**
   - **Current Grade:** Read `metrics/current` (fast, frequently accessed)
   - **Grade History:** Read `metrics/gradeHistory` (only when viewing profile)
   - **Detailed Logs:** Query `session_logs/{YYYY-MM}` where `grade == X`

**Query Efficiency:**
- **Student Dashboard:** 1 read (`metrics/current`)
- **Profile/History View:** 2 reads (`metrics/current` + `metrics/gradeHistory`)
- **Detailed Analysis:** Query `session_logs` collection

**Data Flow:**

1. **During Grade 6:**
   - Session logs → `session_logs/2024-04`, `session_logs/2024-05`, etc.
   - Current metrics → `metrics/current` (updated live)

2. **When Promoted to Grade 7:**
   - Calculate aggregate stats from all Grade 6 session logs
   - Create summary → `metrics/grade_6`
   - Reset `metrics/current` for Grade 7
   - All session logs remain untouched

3. **Viewing History:**
   - Quick summary → Read `metrics/grade_6`
   - Detailed logs → Query `session_logs/{YYYY-MM}` where `grade == 6`

**Auto-Calculated Fields:**
- Current metrics updated by Cloud Functions after each practice session
- Weekly stats reset every Monday at 4 AM
- Streak calculations run daily at 4 AM
- Module mastery levels recalculated based on recent performance
- **Grade history metrics created during promotion workflow**



---

## 8. Admin UI Layout

### 8.1 Student Management Page
```
┌─────────────────────────────────────────────────────────┐
│ [← Back to Dashboard]     Manage Students                │
├─────────────────────────────────────────────────────────┤
│                                                           │
│ ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      │
│ │ Arjun       │  │ Priya       │  │ Rohan       │      │
│ │ Grade 7     │  │ Grade 9     │  │ Grade 6     │      │
│ │ 🔥 12 days  │  │ 🔥 15 days  │  │ 🔥 8 days   │      │
│ │ [Edit]      │  │ [Edit]      │  │ [Edit]      │      │
│ └─────────────┘  └─────────────┘  └─────────────┘      │
│                                                           │
│ ┌─────────────┐  ┌─────────────┐                        │
│ │ Ananya      │  │ + Add        │                        │
│ │ Grade 2     │  │   Student    │                        │
│ │ 🔥 10 days  │  │              │                        │
│ │ [Edit]      │  │              │                        │
│ └─────────────┘  └─────────────┘                        │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

### 8.2 Student Profile Editor (Tabbed)
```
┌─────────────────────────────────────────────────────────┐
│ Editing: Arjun (Grade 7)                    [Save] [×]   │
├─────────────────────────────────────────────────────────┤
│                                                           │
│ [Basic Info] [Subjects] [Modules] [Practice] [Metrics]  │
│ ───────────────────────────────────────────────────────  │
│                                                           │
│ (Tab content appears here)                               │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

**Tab 1: Basic Info**
- Name, Grade, Email, Curriculum, Interface Layout

**Tab 2: Subjects**
- Checkbox list of enrolled subjects

**Tab 3: Modules**
- Chapter enable/disable with scheduling
- Visual list per subject
- Bulk operations

**Tab 4: Practice Settings**
- Daily question limits
- Boost periods management
- Exam mode configuration

**Tab 5: Metrics**
- Performance dashboard
- Charts and graphs
- Notifications and recommendations

---

## 9. Quick Setup Wizard (First Time)

### 9.1 New Student Setup
```
Step 1: Basic Details
  Name: [_______]
  Grade: [Dropdown]
  Curriculum: [CBSE / Telangana]
  
Step 2: Choose Interface
  ○ Mobile Quest (Fun & Gamified)
  ○ Study Era (Subject-Focused)
  
Step 3: Select Subjects
  ☑️ Mathematics
  ☑️ Science
  ☑️ English
  ☑️ Social Studies
  
Step 4: Enable Current Chapters
  We'll enable chapters based on typical school pace.
  You can adjust these anytime.
  
  Mathematics: Chapters 1-3 ✓
  Science: Chapters 1-2 ✓
  
  [Finish Setup]
```

---

## 10. Implementation Checklist

### Phase 1: Core Features (Week 1-2)
- [ ] Student list view
- [ ] Basic profile editor (name, grade, curriculum)
- [ ] Subject enrollment
- [ ] Simple module enable/disable
- [ ] Daily question limits

### Phase 2: Scheduling (Week 3)
- [ ] Module scheduling (future dates)
- [ ] Bulk enable operations
- [ ] Boost periods configuration
- [ ] Recency weighting logic

### Phase 3: Exam Mode (Week 4)
- [ ] Exam mode UI
- [ ] Topic selection
- [ ] Difficulty adjustment
- [ ] Exam readiness scoring

### Phase 4: Metrics (Week 5)
- [ ] Individual student dashboard
- [ ] Performance charts
- [ ] Family summary view
- [ ] Notifications system

---

## 11. Key Design Principles

1. **Simplicity First:** Every feature should be usable without a manual
2. **Visual Clarity:** Use colors, icons, and spacing generously
3. **Smart Defaults:** Pre-fill sensible values, let parents adjust
4. **Date-Friendly:** Make scheduling intuitive with calendar pickers
5. **Instant Feedback:** Show what changed immediately
6. **Multi-Device Optimization:** 
   - Students use 10-inch tablets (Study Era layout) or Android phones (Mobile Quest layout)
   - Admin/Parents use 15-inch laptops for management
   - Ensure responsive design across all device sizes

---

**Document Status:** Functional Requirements v2.0  
**Focus:** Simple, intuitive, family-oriented

Note:
We will not be requiring admin to create any new user as they studentId is generated when the user registers using google or email sign-in. Any new user will be created by the user themself when they register. The admin will only be able to view and manage the users.