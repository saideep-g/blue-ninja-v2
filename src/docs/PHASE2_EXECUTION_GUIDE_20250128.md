# Phase 2 Complete Execution Guide - Steps 11-20
## Blue Ninja v3 Rebuild - Core Features

**Status**: Ready after Phase 1 completion  
**Version**: 1.0 | December 28, 2025  
**Target Timeline**: 8-10 days (after Phase 1)  
**Total Time**: 120-150 hours  
**Dependencies**: Phase 1 (Steps 1-10) MUST be complete

---

## 🏻 Quick Overview

**Phase 1 Built**: Foundation (Database, Auth, Theme, Logging)  
**Phase 2 Builds**: Features (Questions, Assessments, Dashboards)  
**Phase 3 Will Build**: Polish (Testing, Optimization, Deployment)

---

## 📋 Phase 2 Steps at a Glance

| # | Step | Duration | What It Creates | Status |
|---|------|----------|-----------------|--------|
| 11 | Question Templates | 8-10 hrs | 14+ question types w/ validation | 🔸 Ready |
| 12 | Question Bank | 10-12 hrs | Load/filter/search questions | 🔸 Ready |
| 13 | Diagnostic Assessment | 12-15 hrs | Timed assessment w/ scoring | 🔸 Ready |
| 14 | Daily Missions | 10-12 hrs | Daily practice tasks | 🔸 Ready |
| 15 | Student Dashboard | 10-12 hrs | Main student view | 🔸 Ready |
| 16 | Admin Dashboard | 12-15 hrs | Admin control panel | 🔸 Ready |
| 17 | Content Authoring | 15-20 hrs | Question editor | 🔸 Ready |
| 18 | Validation (Zod) | 10-12 hrs | Runtime type safety | 🔸 Ready |
| 19 | Analytics | 10-12 hrs | Track & report data | 🔸 Ready |
| 20 | Curriculum | 10-12 hrs | Learning paths | 🔸 Ready |
| | **TOTAL** | **120-150 hrs** | **All core features** | |

---

# STEP 11: Question Templates

**Duration**: 8-10 hours  
**Goal**: Define all 14+ question types with validation  
**Creates**: Types + Zod schemas + Factory functions  

## 11.1: Question Type Definitions

**Create**: `src/types/questions.ts`

```typescript
// Base question structure
export interface BaseQuestion {
  id: string;
  template: QuestionType;
  subject: string;      // 'math', 'science', 'english'
  topic: string;        // 'algebra', 'geometry', etc.
  level: DifficultyLevel;
  content: string;      // Question text (HTML/Markdown)
  explanation: string;  // Why the answer is correct
  points: number;       // Points for correct answer (1-10)
  timeLimit?: number;   // Optional: time in seconds
  imageUrl?: string;    // Optional: question image
  createdBy: string;    // Admin ID
  createdAt: number;    // Timestamp
  updatedAt: number;    // Timestamp
  version: number;      // For versioning
  tags?: string[];      // Search tags
  metadata?: Record<string, unknown>; // Extensible fields
}

export type DifficultyLevel = 'easy' | 'medium' | 'hard';
export type QuestionType =
  | 'multiple_choice'       // MCQ with 4 options
  | 'fill_blank'           // Fill in the blank
  | 'true_false'           // True/False
  | 'short_answer'         // Short text (manual grading)
  | 'essay'                // Long form (manual grading)
  | 'match'                // Matching pairs
  | 'drag_drop'            // Drag & drop ordering
  | 'dropdown'             // Dropdown selection
  | 'numeric'              // Numeric answer
  | 'click_image'          // Click on image area
  | 'multiple_select'      // Select multiple from list
  | 'sequencing'           // Order steps
  | 'table_fill'           // Fill table cells
  | 'formula'              // Math formula entry
  | 'code'                 // Code writing (future)
  | 'diagram'              // Draw diagram (future);

// Type-specific question interfaces

export interface MultipleChoiceQuestion extends BaseQuestion {
  template: 'multiple_choice';
  options: {
    id: string;
    text: string;
    imageUrl?: string;  // Optional: option image
  }[];
  correctOptionId: string;
  explanation: string;
}

export interface FillBlankQuestion extends BaseQuestion {
  template: 'fill_blank';
  content: string;     // Text with [BLANK] placeholder
  answers: {
    answers: string[];  // Acceptable answers (case-insensitive)
    partialCredit?: boolean;
  };
}

export interface TrueFalseQuestion extends BaseQuestion {
  template: 'true_false';
  correctAnswer: boolean;
}

export interface ShortAnswerQuestion extends BaseQuestion {
  template: 'short_answer';
  content: string;
  expectedAnswers?: string[];
  requiresManualGrading: true;
}

export interface EssayQuestion extends BaseQuestion {
  template: 'essay';
  content: string;
  minWords?: number;
  maxWords?: number;
  rubric?: {
    criteria: string;
    points: number;
  }[];
  requiresManualGrading: true;
}

export interface MatchingQuestion extends BaseQuestion {
  template: 'match';
  pairs: Array<{
    id: string;
    left: string;   // Left side item
    rightId: string; // ID of matching right item
    right: string;  // Right side item
  }>;
}

export interface DragDropQuestion extends BaseQuestion {
  template: 'drag_drop';
  content: string;        // HTML with drop zones
  items: string[];        // Items to drag
  correctOrder: string[]; // Correct ordering
}

export interface DropdownQuestion extends BaseQuestion {
  template: 'dropdown';
  content: string;  // Text with [SELECT] placeholders
  blanks: Array<{
    id: string;
    correctAnswer: string;
    options: string[];
  }>;
}

export interface NumericQuestion extends BaseQuestion {
  template: 'numeric';
  content: string;
  correctAnswer: number;
  tolerance?: number;  // Acceptable range
  unit?: string;       // Unit (m, cm, kg, etc.)
}

export interface ClickImageQuestion extends BaseQuestion {
  template: 'click_image';
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  correctAreas: Array<{
    id: string;
    x: number;  // Left
    y: number;  // Top
    width: number;
    height: number;
  }>;
}

export interface MultipleSelectQuestion extends BaseQuestion {
  template: 'multiple_select';
  options: {
    id: string;
    text: string;
  }[];
  correctOptionIds: string[];
  partialCredit?: boolean;
}

export interface SequencingQuestion extends BaseQuestion {
  template: 'sequencing';
  items: string[];
  correctSequence: string[];
}

export interface TableFillQuestion extends BaseQuestion {
  template: 'table_fill';
  headers: {
    row: string[];   // Row headers
    column: string[]; // Column headers
  };
  answers: Record<string, Record<string, string>>; // [row][col] = answer
}

export interface FormulaQuestion extends BaseQuestion {
  template: 'formula';
  content: string;
  correctFormulas: string[]; // Multiple acceptable formats
  variables?: Record<string, string>; // Variable definitions
}

// Union type of all questions
export type Question =
  | MultipleChoiceQuestion
  | FillBlankQuestion
  | TrueFalseQuestion
  | ShortAnswerQuestion
  | EssayQuestion
  | MatchingQuestion
  | DragDropQuestion
  | DropdownQuestion
  | NumericQuestion
  | ClickImageQuestion
  | MultipleSelectQuestion
  | SequencingQuestion
  | TableFillQuestion
  | FormulaQuestion;
```

## 11.2: Zod Validation Schemas

**Create**: `src/schemas/questions.ts`

```typescript
import { z } from 'zod';

const baseQuestionSchema = z.object({
  id: z.string().uuid(),
  subject: z.string(),
  topic: z.string(),
  level: z.enum(['easy', 'medium', 'hard']),
  content: z.string().min(10),
  explanation: z.string().min(5),
  points: z.number().min(1).max(10),
  timeLimit: z.number().optional(),
  imageUrl: z.string().url().optional(),
  createdBy: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
  version: z.number().min(1),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const multipleChoiceSchema = baseQuestionSchema.extend({
  template: z.literal('multiple_choice'),
  options: z.array(z.object({
    id: z.string(),
    text: z.string(),
    imageUrl: z.string().url().optional(),
  })),
  correctOptionId: z.string(),
});

export const fillBlankSchema = baseQuestionSchema.extend({
  template: z.literal('fill_blank'),
  answers: z.object({
    answers: z.array(z.string()),
    partialCredit: z.boolean().optional(),
  }),
});

export const trueFalseSchema = baseQuestionSchema.extend({
  template: z.literal('true_false'),
  correctAnswer: z.boolean(),
});

export const shortAnswerSchema = baseQuestionSchema.extend({
  template: z.literal('short_answer'),
  expectedAnswers: z.array(z.string()).optional(),
  requiresManualGrading: z.literal(true),
});

export const essaySchema = baseQuestionSchema.extend({
  template: z.literal('essay'),
  minWords: z.number().optional(),
  maxWords: z.number().optional(),
  rubric: z.array(z.object({
    criteria: z.string(),
    points: z.number(),
  })).optional(),
  requiresManualGrading: z.literal(true),
});

export const numericSchema = baseQuestionSchema.extend({
  template: z.literal('numeric'),
  correctAnswer: z.number(),
  tolerance: z.number().optional(),
  unit: z.string().optional(),
});

// Additional schemas for other types...

export const questionSchema = z.union([
  multipleChoiceSchema,
  fillBlankSchema,
  trueFalseSchema,
  shortAnswerSchema,
  essaySchema,
  numericSchema,
]);
```

## 11.3: Question Factory

**Create**: `src/services/questions/factory.ts`

```typescript
import { v4 as uuidv4 } from 'uuid';
import type { Question } from '../../types/questions';

export function createMultipleChoiceQuestion(
  subject: string,
  topic: string,
  level: 'easy' | 'medium' | 'hard',
  content: string,
  options: string[],
  correctIndex: number,
  explanation: string,
  createdBy: string
): Question {
  return {
    id: uuidv4(),
    template: 'multiple_choice',
    subject,
    topic,
    level,
    content,
    options: options.map((text, id) => ({ id: String(id), text })),
    correctOptionId: String(correctIndex),
    explanation,
    points: 1,
    createdBy,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    version: 1,
  } as any; // Type will be validated by Zod
}

export function createFillBlankQuestion(
  subject: string,
  topic: string,
  level: 'easy' | 'medium' | 'hard',
  content: string,
  answers: string[],
  explanation: string,
  createdBy: string
): Question {
  return {
    id: uuidv4(),
    template: 'fill_blank',
    subject,
    topic,
    level,
    content,
    answers: { answers },
    explanation,
    points: 1,
    createdBy,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    version: 1,
  } as any;
}

// Factory functions for other question types...
```

---

# STEP 12: Question Bank

**Duration**: 10-12 hours  
**Goal**: Load, filter, and search questions  
**Creates**: Question service + Query engine  

## 12.1: Question Service

**Create**: `src/services/questions/index.ts`

```typescript
import * as idb from '../idb';
import { logger } from '../logging';
import type { Question } from '../../types/questions';

// ===== LOAD QUESTIONS =====

export async function loadQuestions(source: 'cache' | 'firestore' = 'cache') {
  try {
    logger.info(`📚 Loading questions from ${source}...`);

    if (source === 'cache') {
      const cached = await idb.db.questions.toArray();
      logger.info(`✅ Loaded ${cached.length} questions from cache`);
      return cached;
    }

    // Load from Firestore in Phase 2
    const questions = await idb.db.questions.toArray();
    return questions;
  } catch (error) {
    logger.error('Error loading questions:', error);
    return [];
  }
}

// ===== SEARCH & FILTER =====

export async function searchQuestions(
  query: string,
  filters?: {
    subject?: string;
    topic?: string;
    level?: 'easy' | 'medium' | 'hard';
    template?: string;
  }
): Promise<Question[]> {
  const questions = await idb.db.questions.toArray();
  const lowerQuery = query.toLowerCase();

  return questions.filter((q) => {
    // Text search
    const matchesQuery =
      q.content.toLowerCase().includes(lowerQuery) ||
      q.topic.toLowerCase().includes(lowerQuery) ||
      (q.tags?.some((tag) => tag.toLowerCase().includes(lowerQuery)) || false);

    if (!matchesQuery) return false;

    // Filter by subject
    if (filters?.subject && q.subject !== filters.subject) return false;

    // Filter by topic
    if (filters?.topic && q.topic !== filters.topic) return false;

    // Filter by level
    if (filters?.level && q.level !== filters.level) return false;

    // Filter by template
    if (filters?.template && q.template !== filters.template) return false;

    return true;
  });
}

export async function getQuestionsBySubject(subject: string): Promise<Question[]> {
  return await idb.db.questions
    .where('subject')
    .equals(subject)
    .toArray();
}

export async function getQuestionsByTopic(topic: string): Promise<Question[]> {
  return await idb.db.questions
    .where('topic')
    .equals(topic)
    .toArray();
}

export async function getQuestionsByLevel(
  level: 'easy' | 'medium' | 'hard'
): Promise<Question[]> {
  return await idb.db.questions
    .where('level')
    .equals(level)
    .toArray();
}

// ===== GET RANDOM QUESTIONS =====

export async function getRandomQuestions(
  count: number,
  filters?: {
    subject?: string;
    topic?: string;
    level?: 'easy' | 'medium' | 'hard';
  }
): Promise<Question[]> {
  let questions = await idb.db.questions.toArray();

  // Apply filters
  if (filters?.subject) {
    questions = questions.filter((q) => q.subject === filters.subject);
  }
  if (filters?.topic) {
    questions = questions.filter((q) => q.topic === filters.topic);
  }
  if (filters?.level) {
    questions = questions.filter((q) => q.level === filters.level);
  }

  // Shuffle and return
  return questions
    .sort(() => Math.random() - 0.5)
    .slice(0, count);
}

// ===== SAVE QUESTION =====

export async function saveQuestion(question: Question): Promise<string> {
  try {
    logger.info(`💾 Saving question: ${question.id}`);
    const id = await idb.saveQuestion(question as any);
    logger.info(`✅ Question saved`);
    return id;
  } catch (error) {
    logger.error('Error saving question:', error);
    throw error;
  }
}

// ===== STATISTICS =====

export async function getQuestionStats() {
  const questions = await idb.db.questions.toArray();

  const stats = {
    total: questions.length,
    bySubject: {} as Record<string, number>,
    byTopic: {} as Record<string, number>,
    byLevel: { easy: 0, medium: 0, hard: 0 },
    byTemplate: {} as Record<string, number>,
  };

  for (const q of questions) {
    stats.bySubject[q.subject] = (stats.bySubject[q.subject] || 0) + 1;
    stats.byTopic[q.topic] = (stats.byTopic[q.topic] || 0) + 1;
    stats.byLevel[q.level]++;
    stats.byTemplate[q.template] = (stats.byTemplate[q.template] || 0) + 1;
  }

  return stats;
}
```

---

# STEP 13: Diagnostic Assessment

**Duration**: 12-15 hours  
**Goal**: Initial assessment to determine student level  
**Creates**: Assessment engine + Scoring + Results  

## 13.1: Assessment Service

**Create**: `src/services/assessments/diagnostic.ts`

```typescript
import * as idb from '../idb';
import * as questionService from '../questions';
import { logger } from '../logging';
import { v4 as uuidv4 } from 'uuid';

interface DiagnosticAssessmentConfig {
  userId: string;
  questionsPerLevel: number; // e.g., 3 easy, 3 medium, 3 hard
  timeLimit?: number;        // Total time in seconds
}

export async function createDiagnosticAssessment(
  config: DiagnosticAssessmentConfig
): Promise<string> {
  try {
    logger.info('📄 Creating diagnostic assessment...');

    // Get random questions for each difficulty level
    const easyQuestions = await questionService.getRandomQuestions(
      config.questionsPerLevel,
      { level: 'easy' }
    );
    const mediumQuestions = await questionService.getRandomQuestions(
      config.questionsPerLevel,
      { level: 'medium' }
    );
    const hardQuestions = await questionService.getRandomQuestions(
      config.questionsPerLevel,
      { level: 'hard' }
    );

    const questions = [...easyQuestions, ...mediumQuestions, ...hardQuestions];

    // Create assessment
    const assessment = {
      id: uuidv4(),
      userId: config.userId,
      type: 'diagnostic' as const,
      status: 'in_progress' as const,
      startedAt: Date.now(),
      duration: 0,
      answers: {} as Record<string, string>,
      synced: false,
    };

    const id = await idb.saveAssessment(assessment as any);
    logger.info(`✅ Assessment created: ${id}`);

    return id;
  } catch (error) {
    logger.error('Error creating assessment:', error);
    throw error;
  }
}

// ===== ANSWER SUBMISSION =====

export async function submitAnswer(
  assessmentId: string,
  questionId: string,
  answer: string
): Promise<void> {
  try {
    const assessment = await idb.getAssessment(assessmentId);
    if (!assessment) throw new Error('Assessment not found');

    assessment.answers[questionId] = answer;
    await idb.saveAssessment(assessment as any);

    logger.debug(`👍 Answer saved for question ${questionId}`);
  } catch (error) {
    logger.error('Error submitting answer:', error);
    throw error;
  }
}

// ===== COMPLETE ASSESSMENT =====

export async function completeAssessment(assessmentId: string): Promise<object> {
  try {
    logger.info('♾️ Completing assessment...');

    const assessment = await idb.getAssessment(assessmentId);
    if (!assessment) throw new Error('Assessment not found');

    assessment.status = 'completed';
    assessment.completedAt = Date.now();
    assessment.duration = (assessment.completedAt - assessment.startedAt) / 1000;

    // Calculate score
    const score = await calculateScore(assessment as any);
    assessment.score = score.percentage;

    await idb.saveAssessment(assessment as any);

    // Save progress
    await saveProgressFromAssessment(assessment as any);

    logger.info(`✅ Assessment completed. Score: ${score.percentage}%`);

    return generateResults(assessment as any, score);
  } catch (error) {
    logger.error('Error completing assessment:', error);
    throw error;
  }
}

// ===== SCORING =====

async function calculateScore(assessment: any) {
  let correctCount = 0;
  let totalCount = 0;

  for (const [questionId, answer] of Object.entries(assessment.answers)) {
    const question = await idb.getQuestion(questionId);
    if (!question) continue;

    totalCount++;

    // Check answer based on question type
    if (isAnswerCorrect(question as any, answer)) {
      correctCount++;
    }
  }

  return {
    correctCount,
    totalCount,
    percentage: totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0,
  };
}

function isAnswerCorrect(question: any, answer: string): boolean {
  switch (question.template) {
    case 'multiple_choice':
      return question.correctOptionId === answer;
    case 'true_false':
      return question.correctAnswer === (answer === 'true');
    case 'fill_blank':
      return question.answers.answers.some(
        (a: string) => a.toLowerCase() === answer.toLowerCase()
      );
    case 'numeric':
      const num = parseFloat(answer);
      const correct = question.correctAnswer;
      const tolerance = question.tolerance || 0;
      return Math.abs(num - correct) <= tolerance;
    default:
      return false;
  }
}

// ===== SAVE PROGRESS =====

async function saveProgressFromAssessment(assessment: any): Promise<void> {
  const date = new Date().toISOString().split('T')[0];
  const existing = await idb.getProgressByDate(assessment.userId, date);

  const score = await calculateScore(assessment);

  const progress = existing || {
    id: uuidv4(),
    userId: assessment.userId,
    date,
    questionsAttempted: 0,
    questionsCorrect: 0,
    timeSpent: 0,
    topics: {} as Record<string, any>,
    synced: false,
  };

  progress.questionsAttempted += score.totalCount;
  progress.questionsCorrect += score.correctCount;
  progress.timeSpent += assessment.duration;

  await idb.saveProgress(progress as any);
}

// ===== RESULTS =====

function generateResults(assessment: any, score: any) {
  const percentage = score.percentage;
  let level = 'beginner';
  let recommendation = '';

  if (percentage >= 80) {
    level = 'advanced';
    recommendation = 'You have strong knowledge. Try harder questions to improve further.';
  } else if (percentage >= 60) {
    level = 'intermediate';
    recommendation = 'Good progress! Focus on topics you find challenging.';
  } else {
    level = 'beginner';
    recommendation = 'You have foundational knowledge. Regular practice will help you improve.';
  }

  return {
    assessmentId: assessment.id,
    userId: assessment.userId,
    score: assessment.score,
    level,
    recommendation,
    completedAt: assessment.completedAt,
    duration: assessment.duration,
    questionsAttempted: score.totalCount,
    questionsCorrect: score.correctCount,
  };
}
```

---

# STEP 14: Daily Missions

**Duration**: 10-12 hours  
**Goal**: Generate and track daily practice tasks  
**Creates**: Mission service + Streak tracking  

## 14.1: Daily Mission Service

**Create**: `src/services/missions/index.ts`

```typescript
import * as idb from '../idb';
import * as questionService from '../questions';
import { logger } from '../logging';
import { v4 as uuidv4 } from 'uuid';

const MISSION_COUNT_PER_DAY = 5;
const MISSION_QUESTIONS_PER_MISSION = 3;

export async function generateDailyMissions(userId: string): Promise<void> {
  try {
    const today = new Date().toISOString().split('T')[0];
    const existing = await idb.getDailyMissionsForDate(userId, today);

    if (existing.length > 0) {
      logger.info('📋 Missions already exist for today');
      return;
    }

    logger.info('🌟 Generating daily missions...');

    // Generate varied missions
    const missions = [
      {
        mission: 'Morning Challenge',
        description: 'Solve 3 easy questions to warm up',
        difficulty: 'easy',
        reward: 10,
      },
      {
        mission: 'Mid-Day Practice',
        description: 'Solve 3 medium questions',
        difficulty: 'medium',
        reward: 20,
      },
      {
        mission: 'Afternoon Review',
        description: 'Review yesterday\'s difficult topics',
        difficulty: 'medium',
        reward: 15,
      },
      {
        mission: 'Evening Challenge',
        description: 'Solve 3 hard questions',
        difficulty: 'hard',
        reward: 30,
      },
      {
        mission: 'Daily Streak',
        description: 'Complete 2 of above to maintain your streak',
        difficulty: 'mixed',
        reward: 25,
      },
    ];

    for (const mission of missions) {
      await idb.saveDailyMission({
        id: uuidv4(),
        userId,
        date: today,
        mission: mission.mission,
        description: mission.description,
        completed: false,
        reward: mission.reward,
        synced: false,
      });
    }

    logger.info(`✅ Generated ${missions.length} daily missions`);
  } catch (error) {
    logger.error('Error generating daily missions:', error);
    throw error;
  }
}

// ===== COMPLETE MISSION =====

export async function completeMission(
  userId: string,
  missionId: string
): Promise<void> {
  try {
    const missions = await idb.getDailyMissionsForDate(
      userId,
      new Date().toISOString().split('T')[0]
    );

    const mission = missions.find((m) => m.id === missionId);
    if (!mission) throw new Error('Mission not found');

    mission.completed = true;
    mission.completedAt = Date.now();

    await idb.saveDailyMission(mission as any);
    logger.info(`✅ Mission completed: ${mission.mission}`);
  } catch (error) {
    logger.error('Error completing mission:', error);
    throw error;
  }
}

// ===== STREAK TRACKING =====

export async function calculateStreak(userId: string): Promise<number> {
  try {
    let streak = 0;
    let date = new Date();

    while (true) {
      const dateStr = date.toISOString().split('T')[0];
      const missions = await idb.getDailyMissionsForDate(userId, dateStr);

      const completedCount = missions.filter((m) => m.completed).length;
      if (completedCount >= 2) {
        streak++;
        date.setDate(date.getDate() - 1);
      } else {
        break;
      }
    }

    return streak;
  } catch (error) {
    logger.error('Error calculating streak:', error);
    return 0;
  }
}
```

---

# STEP 15: Student Dashboard

**Duration**: 10-12 hours  
**Goal**: Main interface showing progress, missions, quick actions  
**Creates**: Dashboard component + Data visualization  

## 15.1: Dashboard Component

**Create**: `src/components/StudentDashboard.tsx`

```typescript
import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store/auth';
import { useProfileStore } from '../store/profile';
import * as missionService from '../services/missions';
import * as assessmentService from '../services/assessments/diagnostic';
import { logger } from '../services/logging';

export function StudentDashboard() {
  const { user } = useAuthStore();
  const { grade, school } = useProfileStore();
  const [streak, setStreak] = useState(0);
  const [missions, setMissions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;

    const loadDashboard = async () => {
      setIsLoading(true);
      try {
        // Generate today's missions
        await missionService.generateDailyMissions(user.uid);

        // Get streak
        const currentStreak = await missionService.calculateStreak(user.uid);
        setStreak(currentStreak);

        // Get today's missions
        const today = new Date().toISOString().split('T')[0];
        const todayMissions = await idb.getDailyMissionsForDate(user.uid, today);
        setMissions(todayMissions as any);

        logger.info('✅ Dashboard loaded');
      } catch (error) {
        logger.error('Error loading dashboard:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboard();
  }, [user]);

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">👋 Welcome back, {user?.displayName}!</h1>
        <p className="text-gray-600 dark:text-gray-400">
          {school || 'Blue Ninja'} | Grade {grade || 'N/A'}
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard
          title="🔥 Current Streak"
          value={streak}
          subtitle="days in a row"
        />
        <StatCard
          title="✅ Missions Today"
          value={missions.filter((m: any) => m.completed).length}
          subtitle={`of ${missions.length}`}
        />
        <StatCard
          title="🎓 Skill Level"
          value="Intermediate"
          subtitle="Based on assessment"
        />
      </div>

      {/* Daily Missions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-2xl font-bold mb-4">📋 Today's Missions</h2>
        <div className="space-y-3">
          {missions.map((mission: any) => (
            <MissionCard key={mission.id} mission={mission} />
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-4">🚀 Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ActionButton label="📝 Practice Questions" href="/practice" />
          <ActionButton label="📊 View Progress" href="/progress" />
          <ActionButton label="⚙️ Settings" href="/settings" />
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string | number;
  subtitle: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <p className="text-gray-600 dark:text-gray-400 mb-2">{title}</p>
      <p className="text-3xl font-bold mb-1">{value}</p>
      <p className="text-sm text-gray-500 dark:text-gray-500">{subtitle}</p>
    </div>
  );
}

function MissionCard({ mission }: { mission: any }) {
  const handleComplete = async () => {
    const { user } = useAuthStore();
    if (user?.uid) {
      await missionService.completeMission(user.uid, mission.id);
      // Refresh missions
    }
  };

  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded">
      <div className="flex-1">
        <p className="font-semibold">{mission.mission}</p>
        <p className="text-sm text-gray-600 dark:text-gray-400">{mission.description}</p>
      </div>
      <button
        onClick={handleComplete}
        className={`px-4 py-2 rounded ${
          mission.completed
            ? 'bg-green-500 text-white'
            : 'bg-blue-500 text-white hover:bg-blue-600'
        }`}
      >
        {mission.completed ? '✅ Done' : '▶️ Start'}
      </button>
    </div>
  );
}

function ActionButton({ label, href }: { label: string; href: string }) {
  return (
    <a
      href={href}
      className="block p-4 bg-blue-500 text-white rounded-lg text-center hover:bg-blue-600 transition"
    >
      {label}
    </a>
  );
}
```

---

# STEPS 16-20: Overview

The remaining steps build on these foundations:

## Step 16: Admin Dashboard (12-15 hrs)
- Admin control panel with sidebar
- Student management
- Question management
- Analytics overview
- Role-based access

## Step 17: Content Authoring Tool (15-20 hrs)
- Rich question editor
- Template selector
- Image upload
- Markdown support
- Real-time validation

## Step 18: Validation Layer (10-12 hrs)
- Complete Zod schemas for all entities
- Runtime type checking
- Error messages
- Edge case handling

## Step 19: Analytics System (10-12 hrs)
- Event tracking
- Dashboard reports
- Performance metrics
- Progress analytics

## Step 20: Curriculum Management (10-12 hrs)
- Curriculum editor
- Topic organization
- Chapter management
- Learning paths

---

# 📝 Commit Messages for Phase 2

```bash
# Step 11
git commit -m "feat: Step 11 - Question templates and types

- Define 14+ question types with TypeScript
- Create Zod validation schemas
- Build factory functions for templates"

# Step 12
git commit -m "feat: Step 12 - Question bank service

- Load and cache questions
- Implement search and filtering
- Add random selection with filters
- Statistics and analytics"

# Step 13
git commit -m "feat: Step 13 - Diagnostic assessment

- Assessment creation and management
- Answer submission and scoring
- Results generation
- Progress tracking"

# Step 14
git commit -m "feat: Step 14 - Daily missions

- Mission generation
- Completion tracking
- Streak calculation
- Rewards system"

# Step 15
git commit -m "feat: Step 15 - Student dashboard

- Main student interface
- Progress visualization
- Mission display
- Quick action buttons"

# Steps 16-20
git commit -m "feat: Steps 16-20 - Admin features & analytics

- Admin dashboard with role-based access
- Content authoring tool
- Complete validation layer
- Analytics system
- Curriculum management"
```

---

# 🎯 Phase 2 Completion Checklist

- [ ] All 14+ question types implemented
- [ ] Question bank loads and searches correctly
- [ ] Diagnostic assessment generates and scores
- [ ] Daily missions generate and track
- [ ] Student dashboard displays all info
- [ ] Admin dashboard fully functional
- [ ] Content authoring tool works
- [ ] All Zod schemas complete
- [ ] Analytics system tracking events
- [ ] Curriculum management functional
- [ ] Zero TypeScript errors
- [ ] Zero ESLint errors
- [ ] No console errors/warnings
- [ ] All features tested offline and online

---

# 🚀 Ready for Phase 3

After Phase 2, you'll have:

✅ Complete question system  
✅ Full assessment flow  
✅ Student interface  
✅ Admin controls  
✅ Analytics tracking  
✅ Curriculum paths  

**Next**: Phase 3 - Testing, optimization, and deployment

---

**Version**: 1.0 | Ready for Implementation  
**Last Updated**: December 28, 2025  
**Estimated Duration**: 120-150 hours (8-10 days at 15-20 hrs/day)  
