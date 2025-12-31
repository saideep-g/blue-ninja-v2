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
  | 'formula'
  | 'mcq_branching'
  | 'balance_ops';

// Type-specific question interfaces

// New Branching MCQ Types
export interface McqBranchingQuestion extends BaseQuestion {
  template: 'mcq_branching';
  flow: {
    mode: 'branching';
    entry_stage_id: string;
    return_behavior: 'reload_with_new_vars' | 'continue';
  };
  stages: BranchStage[];
}

export interface BalanceOpsQuestion extends BaseQuestion {
  template: 'balance_ops';
  interaction: {
    config: {
      equation: {
        left: {
          a: number;
          variable: string;
          b: number;
        };
        right: {
          value: number;
        };
      };
      operations: Array<{
        op_id: string;
        label: string;
        value: number;
      }>;
    };
  };
}

export interface BranchStage {
  stage_id: string;
  intent: 'MAIN_CHALLENGE' | 'REPAIR_VISUAL' | 'REPAIR_CONCEPT' | 'REPAIR_PROCEDURE';
  prompt: {
    text: string;
    latex?: string;
    media_ref?: string | null;
  };
  stimulus?: {
    type: 'table' | 'image' | 'steps' | 'none';
    content: any;
  };
  instruction?: string;
  interaction: {
    type: 'mcq' | 'mcq_procedural' | 'mcq_concept';
    config: {
      options: BranchOption[];
    };
  };
}

export interface BranchOption {
  id: string;
  text?: string;
  latex?: string;
  is_correct: boolean;
  feedback?: string;
  diagnostic?: string | null;
  next: BranchNextAction;
}

export type BranchNextAction =
  | { type: 'exit'; outcome: 'pass' | 'fail' }
  | { type: 'branch'; target: string }
  | { type: 'return_to_entry' }
  | { type: 'loop' };

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
    imageUrl?: string;
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
  | McqBranchingQuestion
  | BalanceOpsQuestion
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
