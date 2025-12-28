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
  | 'multiple_choice'
  | 'fill_blank'
  | 'true_false'
  | 'short_answer'
  | 'essay'
  | 'match'
  | 'drag_drop'
  | 'dropdown'
  | 'numeric'
  | 'click_image'
  | 'multiple_select'
  | 'sequencing'
  | 'table_fill'
  | 'formula';

// Type-specific question interfaces

export interface MultipleChoiceQuestion extends BaseQuestion {
  template: 'multiple_choice';
  options: {
    id: string;
    text: string;
    imageUrl?: string;
  }[];
  correctOptionId: string;
}

export interface FillBlankQuestion extends BaseQuestion {
  template: 'fill_blank';
  answers: {
    answers: string[];
    partialCredit?: boolean;
  };
}

export interface TrueFalseQuestion extends BaseQuestion {
  template: 'true_false';
  correctAnswer: boolean;
}

export interface ShortAnswerQuestion extends BaseQuestion {
  template: 'short_answer';
  expectedAnswers?: string[];
  requiresManualGrading: true;
}

export interface EssayQuestion extends BaseQuestion {
  template: 'essay';
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
    left: string;
    rightId: string;
    right: string;
  }>;
}

export interface DragDropQuestion extends BaseQuestion {
  template: 'drag_drop';
  items: string[];
  correctOrder: string[];
}

export interface DropdownQuestion extends BaseQuestion {
  template: 'dropdown';
  blanks: Array<{
    id: string;
    correctAnswer: string;
    options: string[];
  }>;
}

export interface NumericQuestion extends BaseQuestion {
  template: 'numeric';
  correctAnswer: number;
  tolerance?: number;
  unit?: string;
}

export interface ClickImageQuestion extends BaseQuestion {
  template: 'click_image';
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  correctAreas: Array<{
    id: string;
    x: number;
    y: number;
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
    row: string[];
    column: string[];
  };
  answers: Record<string, Record<string, string>>;
}

export interface FormulaQuestion extends BaseQuestion {
  template: 'formula';
  correctFormulas: string[];
  variables?: Record<string, string>;
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
