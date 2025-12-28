/**
 * TYPE DEFINITIONS FOR UCIV v3
 * Centralized interfaces to ensure consistency across refactored sub-components.
 */

export interface LearningOutcome {
  outcome_id: string;
  type: 'conceptual' | 'procedural' | 'logical' | 'transfer';
  statement: string;
}

export interface Misconception {
  id: string;
  tag: string;
  description: string;
  symptoms: string[];
  remedial_strategy_id?: string;
}

export interface MasteryProfile {
  mastery_profile_id: string;
  name: string;
  intent: string;
  requirements: {
    min_attempts: number;
    accuracy_last_10: number;
    retention_interval_days: number;
  };
}

export interface Template {
  template_id: string;
  name: string;
  interaction_mode: string;
  cognitive_load: 'low' | 'medium' | 'high';
  data_contract: Record<string, any>;
}

export interface Atom {
  atom_id: string;
  title: string;
  core_idea: string;
  domain: string;
  mastery_profile_id: string;
  outcomes: LearningOutcome[];
  prerequisites: string[];
  misconception_ids: string[];
  template_ids: string[];
  module_id: string;
  module_title?: string;
  // Hydrated fields
  mastery?: MasteryProfile;
  templates?: Template[];
  misconceptions?: any[];
}

export interface Module {
  module_id: string;
  title: string;
  domain: string;
  track_tags: string[];
  atoms: Atom[];
}

export interface CoreCurriculum {
  modules: Module[];
  misconception_library: Record<string, Misconception>;
}

export interface UCIVProps {
  coreCurriculum: CoreCurriculum;
  templateLibrary: { templates: Template[] };
  assessmentGuide: { 
    mastery_profiles: MasteryProfile[]; 
    scaffolding_strategies: Record<string, any> 
  };
}

// export type Dimension = 'PEDAGOGICAL' | 'MATRIX' | 'DIAGNOSTIC' | 'BENCHMARK';
export type ThemeMode = 'ENGINEERING' | 'EXPLORER';

// Add to your existing Dimension type in types.ts
export type Dimension = 'PEDAGOGICAL' | 'MATRIX' | 'DIAGNOSTIC' | 'BENCHMARK' | 'COVERAGE';

export interface CoverageStats {
  totalAtoms: number;
  outcomeDistribution: {
    conceptual: number;
    procedural: number;
    transfer: number;
  };
  templateUtilization: Record<string, number>;
  gapAnalysis: {
    missingTransfer: string[]; // IDs of atoms with no transfer outcomes
    lowInteractivity: string[]; // Atoms with < 2 templates
  };
}