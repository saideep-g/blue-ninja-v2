# Phase 2 Implementation Guide - Core Features (Steps 11-20)

**Timeline**: 120-150 hours
**Duration**: 3-4 weeks for 1 developer
**Focus**: All core functionality working
**Prerequisite**: Phase 1 complete

---

## Overview

Phase 2 implements the complete feature set:
- 2 question templates (MCQ, Match)
- Diagnostic test system
- Daily missions system
- Student dashboard
- Admin dashboard  
- Question authoring tool
- Data validation
- Enhanced analytics

---

## STEP 11: Question Templates - MCQ (8-12 hours)

**Goal**: Implement Multiple Choice Question template

**Create Schema**:
```typescript
// src/schemas/questions.ts
import { z } from 'zod';

export const MCQTemplateSchema = z.object({
  id: z.string().uuid(),
  type: z.literal('mcq'),
  questionText: z.string().min(10),
  options: z.array(
    z.object({
      id: z.string().uuid(),
      text: z.string().min(1),
      isCorrect: z.boolean(),
    })
  ).min(2).max(6),
  explanation: z.string().min(10),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  subject: z.string(),
  topic: z.string(),
  chapter: z.string(),
  curriculumVersion: z.literal('v3'),
});

export type MCQTemplate = z.infer<typeof MCQTemplateSchema>;
```

**Component**:
```typescript
// src/components/assessment/MCQQuestion.tsx
import React, { useState } from 'react';
import { MCQTemplate } from '../../schemas/questions';

interface Props {
  question: MCQTemplate;
  onAnswer: (optionId: string) => void;
  selectedOption?: string;
}

export const MCQQuestion: React.FC<Props> = ({
  question,
  onAnswer,
  selectedOption,
}) => {
  return (
    <div className="mcq-container">
      <div className="question-text">
        <p>{question.questionText}</p>
      </div>
      <div className="options">
        {question.options.map((option) => (
          <button
            key={option.id}
            className={`option ${selectedOption === option.id ? 'selected' : ''}`}
            onClick={() => onAnswer(option.id)}
          >
            {option.text}
          </button>
        ))}
      </div>
    </div>
  );
};
```

**Acceptance Criteria**:
- [ ] MCQ schema validates properly
- [ ] Component renders correctly
- [ ] Answer selection works
- [ ] Zod validation catches errors
- [ ] TypeScript types correct

---

## STEP 12: Question Templates - Match (8-12 hours)

**Goal**: Implement Matching template

**Create Schema**:
```typescript
// In src/schemas/questions.ts, add:

export const MatchTemplateSchema = z.object({
  id: z.string().uuid(),
  type: z.literal('match'),
  instructions: z.string(),
  pairs: z.array(
    z.object({
      id: z.string().uuid(),
      left: z.string(),
      right: z.string(),
    })
  ).min(2),
  explanation: z.string(),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  subject: z.string(),
  topic: z.string(),
  chapter: z.string(),
  curriculumVersion: z.literal('v3'),
});

export type MatchTemplate = z.infer<typeof MatchTemplateSchema>;
```

**Component**:
```typescript
// src/components/assessment/MatchQuestion.tsx
import React, { useState } from 'react';
import { MatchTemplate } from '../../schemas/questions';

interface Props {
  question: MatchTemplate;
  onAnswer: (matches: Record<string, string>) => void;
  selectedMatches?: Record<string, string>;
}

export const MatchQuestion: React.FC<Props> = ({
  question,
  onAnswer,
  selectedMatches = {},
}) => {
  const [matches, setMatches] = useState(selectedMatches);

  const handleMatch = (leftId: string, rightId: string) => {
    const newMatches = { ...matches, [leftId]: rightId };
    setMatches(newMatches);
    onAnswer(newMatches);
  };

  return (
    <div className="match-container">
      <p className="instructions">{question.instructions}</p>
      <div className="match-grid">
        <div className="left-column">
          {question.pairs.map((pair) => (
            <div key={pair.id} className="match-item left">
              {pair.left}
            </div>
          ))}
        </div>
        <div className="right-column">
          {question.pairs.map((pair) => (
            <div
              key={pair.id}
              className={`match-item right ${
                Object.values(matches).includes(pair.id) ? 'matched' : ''
              }`}
              onClick={() => handleMatch(pair.id, pair.id)}
            >
              {pair.right}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
```

**Acceptance Criteria**:
- [ ] Match schema validates
- [ ] Component renders 2-column layout
- [ ] Matching logic works
- [ ] Answer tracking correct
- [ ] TypeScript types correct

---

## STEP 13: Diagnostic Test System (10-14 hours)

**Goal**: Implement complete diagnostic test flow

**Service**:
```typescript
// src/services/assessment/diagnostic.ts
import { Question } from '../../types';
import { questionDB } from '../idb/db';
import { useAssessmentStore } from '../../store/assessmentStore';

export const diagnosticService = {
  async getQuestions(userId: string, count: number): Promise<Question[]> {
    // Get user preferences from profile
    // Filter questions by:
    // - curriculum_version: 'v3'
    // - NOT in excludedChapters
    // - Balanced difficulty
    // - Random selection
    const allQuestions = await questionDB.getAll();
    return allQuestions.slice(0, count);
  },

  async submitTest(
    userId: string,
    answers: Map<string, string>,
    questions: Question[]
  ) {
    // Calculate score
    let correct = 0;
    const responses = [];

    for (const [questionId, selectedOptionId] of answers) {
      const question = questions.find((q) => q.id === questionId);
      if (!question) continue;

      const isCorrect = question.correctAnswer === selectedOptionId;
      if (isCorrect) correct++;

      responses.push({
        questionId,
        selectedOptionId,
        isCorrect,
        timeSpent: 0, // Track in component
      });
    }

    const accuracy = (correct / questions.length) * 100;

    return {
      userId,
      totalQuestions: questions.length,
      correctAnswers: correct,
      accuracy,
      timestamp: new Date(),
      responses,
    };
  },
};
```

**Component**:
```typescript
// src/components/assessment/DiagnosticTest.tsx
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useAssessment } from '../../hooks/useAssessment';
import { diagnosticService } from '../../services/assessment/diagnostic';
import { MCQQuestion } from './MCQQuestion';

export const DiagnosticTest: React.FC = () => {
  const { user } = useAuth();
  const assessment = useAssessment();
  const [questions, setQuestions] = useState([]);

  useEffect(() => {
    const loadQuestions = async () => {
      if (!user) return;
      const qs = await diagnosticService.getQuestions(user.id, 30);
      setQuestions(qs);
      assessment.startAssessment('diagnostic', qs.length);
    };
    loadQuestions();
  }, [user]);

  if (!questions.length || !assessment.type) return <div>Loading...</div>;

  const currentQuestion = questions[assessment.currentIndex];

  return (
    <div className="diagnostic-test">
      <div className="progress">
        Question {assessment.currentIndex + 1} of {assessment.totalQuestions}
      </div>
      {currentQuestion.type === 'mcq' && (
        <MCQQuestion
          question={currentQuestion}
          onAnswer={(optionId) => {
            assessment.recordAnswer(currentQuestion.id, optionId);
          }}
        />
      )}
      <div className="controls">
        {assessment.currentIndex < assessment.totalQuestions - 1 && (
          <button onClick={() => assessment.nextQuestion()}>Next</button>
        )}
        {assessment.currentIndex === assessment.totalQuestions - 1 && (
          <button onClick={() => assessment.completeAssessment()}>
            Submit Test
          </button>
        )}
      </div>
    </div>
  );
};
```

**Acceptance Criteria**:
- [ ] Questions load from IndexedDB
- [ ] Test UI functional
- [ ] Progress tracking works
- [ ] Answer submission works
- [ ] Results calculated correctly

---

## STEP 14: Daily Missions System (10-12 hours)

**Similar to Step 13**, but:
- Generates 1-15 questions daily based on user preference
- Tracks completion status
- Shows progress for the day
- Resets daily

---

## STEP 15: Student Dashboard (12-16 hours)

**Components**:
- Profile card (name, class, progress)
- Today's missions (status and progress)
- Diagnostic results (score, recommendations)
- Recent activity (timeline of completed tests)
- Learning streak (consecutive days)

**Acceptance Criteria**:
- [ ] All sections render
- [ ] Data from stores displays correctly
- [ ] Responsive design
- [ ] Performance acceptable

---

## STEP 16: Admin Dashboard (14-18 hours)

**Features**:
- Question statistics (total, by subject, by difficulty)
- User statistics (total, active, completion rates)
- Recent uploads
- Analytics charts
- System health status

**Acceptance Criteria**:
- [ ] Statistics calculated correctly
- [ ] Charts render
- [ ] Real-time data
- [ ] Admin-only access

---

## STEP 17: Question Authoring Tool (16-20 hours)

**Features**:
- Create/edit questions
- Preview before save
- Bulk import from CSV
- Version control (draft/published)
- Auto-validation using Zod schemas

**Form Component**:
```typescript
// src/components/admin/QuestionAuthor.tsx
import React, { useState } from 'react';
import { MCQTemplateSchema } from '../../schemas/questions';
import { questionDB } from '../../services/idb/db';

export const QuestionAuthor: React.FC = () => {
  const [formData, setFormData] = useState({...});
  const [errors, setErrors] = useState([]);

  const handleSave = async () => {
    try {
      const validated = MCQTemplateSchema.parse(formData);
      await questionDB.save(validated);
      alert('Question saved!');
    } catch (error) {
      setErrors(error.errors);
    }
  };

  return (
    <div className="question-author">
      {/* Form fields */}
      <button onClick={handleSave}>Save Question</button>
      {errors.map((err) => (
        <div key={err.path.join('.')} className="error">
          {err.message}
        </div>
      ))}
    </div>
  );
};
```

---

## STEP 18: Data Validation Framework (8-10 hours)

**Zod Schemas** for all data types:
- User profile validation
- Question validation
- Answer validation
- Assessment results validation

**Already covered**: Use Zod in all forms and services

---

## STEP 19: Curriculum Integration (6-8 hours)

**Create curriculum data**:
```typescript
// src/data/curriculum-v3.ts
export const curriculumV3 = {
  class6: {
    subjects: [
      {
        name: 'Mathematics',
        chapters: ['Numbers', 'Whole Numbers', ...],
      },
      {
        name: 'Science',
        chapters: ['Living Organisms', 'Plant Structure', ...],
      },
    ],
  },
  class7: { ... },
  class8: { ... },
};
```

---

## STEP 20: Analytics Engine (10-14 hours)

**Track**:
- User progress
- Question difficulty calibration
- Time per question
- Error patterns
- Learning curves

**Service**:
```typescript
// src/services/analytics/analyzer.ts
export const analytics = {
  calculateAccuracy(answers: Answer[]): number {
    const correct = answers.filter((a) => a.isCorrect).length;
    return (correct / answers.length) * 100;
  },

  identifyWeakAreas(answers: Answer[], questions: Question[]) {
    // Group by subject/topic
    // Calculate accuracy per group
    // Return low-accuracy areas
  },

  getRecommendations(userId: string) {
    // Based on weak areas and progress
  },
};
```

---

## Phase 2 Testing Checklist

**Each Step**:
```bash
npm run check-types
npm run lint
npm run build
```

**After Phase 2**:
- All templates working
- Diagnostic test functional
- Daily missions functional
- Dashboards responsive
- Author tool working
- Validation prevents errors
- Analytics tracking data

---

## Phase 2 Success Criteria

✅ All requirements met:

- [ ] 2 question templates working (MCQ, Match)
- [ ] Diagnostic test end-to-end
- [ ] Daily missions system complete
- [ ] Student dashboard functional
- [ ] Admin dashboard functional
- [ ] Question authoring tool works
- [ ] All data validated with Zod
- [ ] Curriculum v3 integrated
- [ ] Analytics capturing data
- [ ] Zero TypeScript errors
- [ ] Zero ESLint errors
- [ ] Build succeeds
- [ ] Ready for Phase 3

---

**Estimated Completion**: 3-4 weeks

**Next**: Phase 3 - Integration & Polish (Steps 21-30)
