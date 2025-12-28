/**
 * MathQuest v3 Unified Schema - Multi-Stage Architecture
 */

export interface Option {
  id: string;
  text: string;
  latex?: string | null;
  diagnostic?: {
    misconception_id: string;
    confidence: number;
  };
}

export interface InteractionConfig {
  options?: Option[];
  shuffle?: boolean;
  single_select?: boolean;
  rubric_points?: string[];
  max_chars?: number;
}

export interface Stage {
  stage_id: string;
  prompt: {
    text: string;
    latex: string | null;
  };
  instruction: string;
  interaction: {
    type: string;
    config: InteractionConfig;
  };
  answer_key: {
    correct_option_id?: string;
    key_points?: string[];
  };
  unlock_logic?: {
    show_when: string;
    depends_on_stage_id: string | null;
  };
}

export interface QuestionItem {
  item_id: string;
  atom_id: string;
  template_id: string;
  difficulty: number;
  context_tags: string[];
  stages: Stage[]; // The actual structure in your Gold Questions JSON
  evidence: Array<{ outcome_type: string }>;
}

export interface ScaffoldingStrategy {
  strategy_id: string;
  name: string;
  intent: string;
  hint_ladder: Array<{ level: number; type: string; text: string }>;
}