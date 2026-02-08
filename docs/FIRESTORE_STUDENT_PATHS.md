# Firestore Student Paths & Structure

This document serves as the source of truth for all student-related Firestore paths, including Profile, Session Logs, and Feature Specific Data.

## 1. Student Document (Root)
**Path:** `students/{studentId}`

The main entry point for a student.

### Fields
```typescript
{
  // --- Profile Identity (Primary Source) ---
  // Managed by `services/user` (ProfileService)
  profile: {
    userId: string;
    studentName: string || user.displayName;
    grade: string | number;         // e.g., "7"
    school?: string;
    preferredLanguage: 'en' | 'te' | 'hi';
    theme: 'light' | 'dark' | 'system';
    notifications: boolean;
    autoAdvance: boolean;           // Default: true
    dailyQuestionCount: number;     // Default: 5
    diagnosticQuestionCount: number; // Default: 10
    excludedChapters: string[];
    updatedAt: number;              // Timestamp (ms)
  },

  // --- Legacy / Mixed Fields ---
  // (Might exist from old migrations or Auth Sync)
  email: string;
  username: string;
  role: 'STUDENT' | 'ADMIN';
  createdAt: Timestamp;
  lastActive: Timestamp;          // Updated daily by Tables/Quests

  // --- Feature: Study Era Stats ---
  // (Often merged into root for quick access)
  powerPoints: number;
  heroLevel: number;
  streakCount: number;
  lastMissionDate: string;
  currentQuest: string;           // e.g., 'DIAGNOSTIC'
  completedMissions: number;

  // --- Feature: Multiplication Tables (Ledger) ---
  // Stores currently calculated mastery to avoid re-scanning logs
  tables_config: {
    currentPathStage: number;     // e.g., 2 (Table 2)
    daily: {                      // Daily progress reset at 4AM
      Tables: number;             // Count for today
    };
    tableStats: Record<number, {  // Mastery per table
      accuracy: number;
      avgTime: number;
      status: 'MASTERED' | ...;
    }>;
    ledger: Record<number, { ... }>; // Raw counts (correct/total)
  };
}
```

---

## 2. Study Era Logs (Subcollection)
**Path:** `students/{studentId}/session_logs/{YYYY-MM}`
**Example:** `students/user123/session_logs/2026-02`

Stores detailed practice history for general subjects (Math, Science, etc.).

### Document Schema
```typescript
{
  entries: [
    {
      timestamp: number | Date;
      subject: string;            // 'math', 'science', 'vocabulary', etc.
      questionId: string;
      questionType: 'MCQ' | 'SHORT_ANSWER';
      questionText: string;
      studentAnswer: string;
      correctAnswer: string;
      isCorrect: boolean;
      score?: number;             // 0-3 for Short Answer
      timeSpent: number;          // Seconds
      aiFeedback?: {              // Only for Short Answer
        score: number,
        summary: string,
        results: [...]
      }
    }
  ],
  lastUpdated: Timestamp
}
```

---

## 3. AI Evaluation Logs (Short Answer Specific)
**Path:** `students/{studentId}/monthly_logs/{YYYY-MM}`

Stores detailed AI interaction metrics (latency, tokens) for Short Answer questions.

### Document Schema
```typescript
{
  entries: [
    {
      timestamp: number;
      questionId: string;
      questionType: 'SHORT_ANSWER';
      inputText: string;
      outputText: string;         // Full JSON response string
      aiFeedback: Object;         // Parsed feedback
      score: number;
      inputTokensCount: number;
      outputTokensCount: number;
      thoughtsTokenCount: number;
      responseTime: number;       // Latency (ms)
      isSuccess: boolean;
      errorMessage?: string;
    }
  ],
  lastUpdated: string
}
```

---

## 4. Multiplication Logs (Subcollection)
**Path:** `students/{studentId}/table_practice_logs/{bucketId}`
**Buckets:** `logs_until_jun2026` (Archive), `logs_{YYYY}_h1`, `logs_{YYYY}_h2`

Stores high-frequency, rapid-fire multiplication attempts.

### Document Schema
```typescript
{
  logs: [
    {
      table: number;      // 7
      multiplier: number; // 8
      timeTaken: number;  // ms
      isCorrect: boolean;
      timestamp: Timestamp;
      isValidForSpeed: boolean;
    }
  ],
  lastUpdated: Timestamp
}
```

---

## 5. Admin Monitoring (System)
**Path:** `admin/system/ai_monitoring/{YYYY-QUARTER}`
**Example:** `admin/system/ai_monitoring/2026-JAN-MAR`

Stores system-wide AI usage metrics for cost tracking.

### Document Schema
```typescript
{
  entries: [
    {
      studentId: string;
      questionId: string;
      inputTokensCount: number;
      outputTokensCount: number;
      thoughtsTokenCount: number;
      responseTime: number;       // E2E Latency (ms)
      isSuccess: boolean;
      errorMessage?: string;
      timestamp: number;
      outputText: string;         // Full JSON response
    }
  ],
  lastUpdated: string
}
```
