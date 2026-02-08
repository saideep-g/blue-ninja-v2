# Student Practice Logs Documentation

This document outlines the logging strategy for student activities across "Study Era" (General Practice) and "Multiplication Tables" (Specialized Feature).

## 1. Study Era Logs (General)

Used for all standard question types including MCQ, Short Answer, Numeric, and branching scenarios.

**Storage Pattern:** Monthly Buckets
**Path:** `students/{studentId}/session_logs/{YYYY-MM}`
**Example:** `students/user123/session_logs/2026-02`

### Document Structure
Each document contains an `entries` array (optimized for write aggregation).

```typescript
interface SessionLogDocument {
  entries: LogEntry[];
  lastUpdated: Timestamp;
}

interface LogEntry {
  // Metadata
  timestamp: number | Date;
  subject: string;          // e.g., 'math', 'science', 'vocabulary', 'tables' (generic)
  questionId: string;
  questionType: string;     // 'MCQ', 'SHORT_ANSWER', 'NUMERIC_AUTO'
  
  // Content
  questionText: string;
  studentAnswer: string;
  correctAnswer: string;
  explanation?: string;     // Optional explanation text
  
  // Performance
  isCorrect: boolean;
  score?: number;           // For Short Answer (0-N)
  timeSpent: number;        // In seconds
  masteryDelta?: number;    // XP gained/lost
  isSuccess: boolean;       // System success flag
  
  // AI Specific (Short Answer)
  aiFeedback?: {
    score: number;
    summary: string;
    results: {
      criterion: string;
      passed: boolean;
      feedback: string;
    }[];
  };
}
```

### Usage
- **Dashboard:** Fetched by `MonthlyLogsView.tsx` to display detailed history.
- **Subjects:** Includes 'math', 'science', 'social', 'vocabulary', 'gk', 'geography'.

---

## 2. Multiplication Tables Logs (High-Frequency)

Dedicated storage for rapid-fire multiplication practice to handle high volume without bloating the main session logs.

**Storage Pattern:** Time-Based Buckets
**Path:** `students/{studentId}/table_practice_logs/{bucketId}`
**Buckets:**
- `logs_until_jun2026`: Archive for all data until June 2026.
- `logs_{YYYY}_h1` / `logs_{YYYY}_h2`: Semiannual buckets thereafter.

### Document Structure
Stores raw arrays of rapid attempts.

```typescript
interface TableLogDocument {
  logs: TableLog[];
  lastUpdated: Timestamp;
}

interface TableLog {
  table: number;       // e.g., 7
  multiplier: number;  // e.g., 8 (7x8)
  type: string;        // 'multiplication'
  isCorrect: boolean;
  timeTaken: number;   // In Milliseconds (ms)
  timestamp: Timestamp;
  isValidForSpeed?: boolean; // False if outlier (>30s)
}
```

### Usage
- **Heatmap:** Used to generate the `FluencyHeatmap`.
- **Mastery:** Aggregated to calculate `accuracy` and `avgTime` per fact.

---

## 3. Tables Ledger (State)

To avoid re-calculating mastery from thousands of raw logs every time, the current state of mastery is maintained in the student's root document.

**Path:** `students/{studentId}` inside field `tables_config`

```typescript
interface TablesConfig {
  version: number;
  // Stats per Table (Rows)
  tableStats: Record<number, {
    accuracy: number;
    avgTime: number;    // In ms
    totalAttempts: number;
    lastPracticed: number; // Timestamp
    status: 'NOT_STARTED' | 'PRACTICING' | 'MASTERED' | 'FOCUS_NEEDED';
  }>;
  
  // Specific Fact Matrix (7x8)
  ledger: Record<number, Record<number, {
    correct: number;
    total: number;
    timeSum: number;
    speedSamples: number;
  }>>;
}
```

### Sync Strategy
1. **Write-Ahead:** When a student answers 7x8, the `tablesFirestore` service:
   - Updates the `ledger` in memory.
   - Saves the updated `tables_config` to `students/{studentId}`.
   - Appends the raw log to `table_practice_logs/{bucketId}`.
2. **Rehydration:** If the ledger is corrupted, `rehydrateStudentStats` can verify all raw logs and rebuild the `tables_config`.
