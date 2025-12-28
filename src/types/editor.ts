/**
 * Question Editor Types
 * Defines types for the question authoring and editing system
 */

/**
 * Editor Question - In-progress question being edited
 */
export interface EditorQuestion {
  id: string;
  type: QuestionType;
  statement: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  subject: string;
  topic: string;
  tags: string[];
  points: number;
  markdown: string; // Markdown formatted statement
  latex: string; // LaTeX support
  image?: ImageAsset;
  metadata: QuestionMetadata;
  createdAt: Date;
  updatedAt: Date;
  status: 'DRAFT' | 'REVIEW' | 'PUBLISHED';
  version: number;
  authorId: string;
  notes?: string; // Internal notes
}

/**
 * Question Type - All supported question types
 */
export type QuestionType =
  | 'MULTIPLE_CHOICE'
  | 'MULTI_SELECT'
  | 'TRUE_FALSE'
  | 'SHORT_ANSWER'
  | 'FILL_BLANKS'
  | 'MATCHING'
  | 'ORDERING'
  | 'IMAGE_BASED'
  | 'DRAG_DROP'
  | 'NUMERIC'
  | 'EQUATION'
  | 'CODE'
  | 'ESSAY'
  | 'HOTSPOT';

/**
 * Question Metadata - Type-specific configuration
 */
export interface QuestionMetadata {
  // Multiple Choice / Multi-Select
  options?: OptionChoice[];
  correctAnswers?: string[]; // IDs or values
  singleSelection?: boolean;
  randomizeOptions?: boolean;
  caseInsensitive?: boolean;

  // True/False
  correctBool?: boolean;
  explanation?: string;

  // Short Answer / Fill Blanks
  acceptedAnswers?: AcceptedAnswer[];
  caseSensitive?: boolean;
  whitespaceSensitive?: boolean;
  partialCredit?: boolean;
  partialCreditRules?: PartialCreditRule[];

  // Matching
  pairs?: MatchingPair[];
  scrambleMatches?: boolean;

  // Ordering / Sequencing
  items?: OrderingItem[];
  displayAs?: 'VERTICAL' | 'HORIZONTAL';

  // Image-based
  regions?: ImageRegion[];
  imageUrl?: string;
  coordinates?: CoordinateAnswer[];

  // Drag & Drop
  dropZones?: DropZone[];
  draggables?: DraggableItem[];
  allowFreeForm?: boolean;

  // Numeric
  correctValue?: number;
  tolerance?: number; // +/- tolerance
  toleranceType?: 'ABSOLUTE' | 'PERCENTAGE';
  units?: string;
  acceptedUnits?: string[];

  // Code
  language?: string;
  template?: string;
  testCases?: TestCase[];
  expectedOutput?: string;

  // Common
  timeLimit?: number; // Seconds
  showHints?: boolean;
  hints?: Hint[];
  references?: string[];
}

/**
 * Option Choice - For multiple choice questions
 */
export interface OptionChoice {
  id: string;
  content: string;
  isCorrect: boolean;
  explanation?: string;
  order: number;
}

/**
 * Accepted Answer - For short answer validation
 */
export interface AcceptedAnswer {
  id: string;
  answer: string;
  isCorrect: boolean;
  weight?: number; // For partial credit
}

/**
 * Partial Credit Rule - For nuanced scoring
 */
export interface PartialCreditRule {
  id: string;
  pattern: string; // Regex or text pattern
  creditPercentage: number; // 0-100
  description?: string;
}

/**
 * Matching Pair - For matching questions
 */
export interface MatchingPair {
  id: string;
  left: string; // Item to match
  right: string; // Correct match
  explanation?: string;
}

/**
 * Ordering Item - For ordering/sequencing questions
 */
export interface OrderingItem {
  id: string;
  content: string;
  correctPosition: number;
  explanation?: string;
}

/**
 * Image Region - For image-based questions
 */
export interface ImageRegion {
  id: string;
  name: string;
  type: 'RECTANGLE' | 'CIRCLE' | 'POLYGON';
  coordinates: number[]; // x, y, width, height or x, y, r
  isCorrect: boolean;
  explanation?: string;
}

/**
 * Coordinate Answer - For image-based questions
 */
export interface CoordinateAnswer {
  id: string;
  x: number;
  y: number;
  regionId?: string;
}

/**
 * Drop Zone - For drag & drop questions
 */
export interface DropZone {
  id: string;
  label: string;
  acceptedDraggables: string[]; // IDs of draggables that can drop here
  position?: { x: number; y: number; width: number; height: number };
}

/**
 * Draggable Item - For drag & drop questions
 */
export interface DraggableItem {
  id: string;
  content: string;
  correctZoneId: string;
  explanation?: string;
}

/**
 * Test Case - For code-based questions
 */
export interface TestCase {
  id: string;
  input: string;
  expectedOutput: string;
  isHidden?: boolean; // Hidden from students
  weight?: number; // Scoring weight
}

/**
 * Hint - For guided learning
 */
export interface Hint {
  id: string;
  content: string;
  revealedAfter?: number; // Seconds before hint available
  penaltyPoints?: number; // Points lost for using hint
}

/**
 * Image Asset - Uploaded image
 */
export interface ImageAsset {
  id: string;
  url: string;
  fileName: string;
  fileSize: number;
  dimensions?: { width: number; height: number };
  uploadedAt: Date;
  publicUrl?: string;
}

/**
 * Editor State - Current editing state
 */
export interface EditorState {
  question: EditorQuestion | null;
  isDirty: boolean;
  isSaving: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  mode: 'CREATE' | 'EDIT' | 'DUPLICATE';
  version: number;
}

/**
 * Validation Error - Errors that prevent publishing
 */
export interface ValidationError {
  field: string;
  message: string;
  severity: 'ERROR';
}

/**
 * Validation Warning - Issues that don't prevent publishing
 */
export interface ValidationWarning {
  field: string;
  message: string;
  severity: 'WARNING';
}

/**
 * Editor Preview - How question appears to students
 */
export interface EditorPreview {
  question: EditorQuestion;
  html: string; // Rendered HTML
  mediaAssets: ImageAsset[];
}

/**
 * Bulk Upload Result - Results from CSV upload
 */
export interface BulkUploadResult {
  id: string;
  uploadDate: Date;
  totalRows: number;
  successfullyAdded: number;
  failed: number;
  errors: {
    rowNumber: number;
    reason: string;
  }[];
  summary: {
    byType: Record<string, number>;
    byDifficulty: Record<string, number>;
    bySubject: Record<string, number>;
  };
}

/**
 * Question Template - Pre-built question templates
 */
export interface QuestionTemplate {
  id: string;
  type: QuestionType;
  name: string;
  description: string;
  exampleStatement: string;
  sampleMetadata: QuestionMetadata;
  guidelines: string[];
  fields: TemplateField[];
}

/**
 * Template Field - Field in a question template
 */
export interface TemplateField {
  name: string;
  label: string;
  type: 'TEXT' | 'TEXTAREA' | 'NUMBER' | 'SELECT' | 'MULTISELECT' | 'CHECKBOX' | 'RICHTEXT';
  required: boolean;
  placeholder?: string;
  options?: string[];
  help?: string;
}

/**
 * Editor Configuration - Settings for the editor
 */
export interface EditorConfig {
  enableMarkdown: boolean;
  enableLatex: boolean;
  enableImageUpload: boolean;
  enableVideoEmbed: boolean;
  maxImageSize: number; // MB
  supportedLanguages: string[];
  autoSaveInterval: number; // Seconds
  defaultDifficulty: 'EASY' | 'MEDIUM' | 'HARD';
  defaultPoints: number;
  defaultSubject: string;
}
