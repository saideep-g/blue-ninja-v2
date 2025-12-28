/**
 * src/services/questionValidatorV2.ts
 * ===================================
 * 
 * Validates questions in the new V2 MathQuest Gold Standard format.
 */

interface ValidationResultV2 {
  itemId: string;
  templateId: string;
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: { code: string; message: string }[];
  qualityGrade: 'A' | 'B' | 'C' | 'D' | 'F';
}

interface TemplateConfig {
  name: string;
  requiredFields: string[];
  interactionType: string;
  validatePayload?: (payload: any) => string | null;
}

const TEMPLATE_CONFIGS: Record<string, TemplateConfig> = {
  MCQ_CONCEPT: {
    name: 'Multiple Choice Concept',
    requiredFields: ['prompt', 'interaction', 'template_payload', 'answer_key', 'worked_solution'],
    interactionType: 'mcq_concept',
    validatePayload: (payload: any) => {
      if (!payload.stem) return 'Missing stem in template_payload';
      if (!Array.isArray(payload.options)) return 'Options must be an array';
      if (payload.options.length < 2) return 'Must have at least 2 options';
      if (!payload.correct_option_id) return 'Missing correct_option_id';
      return null;
    }
  },
  NUMERIC_INPUT: {
    name: 'Numeric Input',
    requiredFields: ['prompt', 'interaction', 'template_payload', 'answer_key', 'worked_solution'],
    interactionType: 'numeric_input',
    validatePayload: (payload: any) => {
      if (!payload.stem) return 'Missing stem in template_payload';
      if (payload.correct_value === undefined && payload.correct_value === null) return 'Missing correct_value';
      return null;
    }
  },
  TWO_TIER: {
    name: 'Two-Tier',
    requiredFields: ['prompt', 'interaction', 'template_payload', 'answer_key', 'worked_solution'],
    interactionType: 'two_tier',
    validatePayload: (payload: any) => {
      if (!payload.stem) return 'Missing stem in template_payload';
      if (!Array.isArray(payload.tier1_options)) return 'Tier 1 options must be an array';
      if (!Array.isArray(payload.tier2_reason_options)) return 'Tier 2 reason options must be an array';
      if (!payload.correct_tier1_id) return 'Missing correct_tier1_id';
      if (!payload.correct_tier2_id) return 'Missing correct_tier2_id';
      return null;
    }
  },
  ERROR_ANALYSIS: {
    name: 'Error Analysis',
    requiredFields: ['prompt', 'interaction', 'template_payload', 'answer_key', 'worked_solution'],
    interactionType: 'error_analysis',
    validatePayload: (payload: any) => {
      if (!payload.prompt) return 'Missing prompt';
      if (!payload.error_type_options) return 'Missing error_type_options';
      if (!payload.correct_error_type) return 'Missing correct_error_type';
      if (!payload.response_inputs) return 'Missing response_inputs';
      return null;
    }
  },
  WORKED_EXAMPLE_COMPLETE: {
    name: 'Worked Example Complete',
    requiredFields: ['prompt', 'interaction', 'template_payload', 'answer_key', 'worked_solution'],
    interactionType: 'worked_example_complete',
    validatePayload: (payload: any) => {
      if (!payload.prompt) return 'Missing prompt';
      if (!Array.isArray(payload.steps)) return 'Steps must be an array';
      if (payload.steps.length === 0) return 'Must have at least 1 step';
      return null;
    }
  },
  STEP_ORDER: {
    name: 'Step Order',
    requiredFields: ['prompt', 'interaction', 'template_payload', 'answer_key'],
    interactionType: 'step_order'
  },
  CLASSIFY_SORT: {
    name: 'Classify / Sort',
    requiredFields: ['prompt', 'interaction', 'template_payload', 'answer_key'],
    interactionType: 'classify_sort'
  },
  NUMBER_LINE_PLACE: {
    name: 'Number Line Place',
    requiredFields: ['prompt', 'interaction', 'template_payload', 'answer_key'],
    interactionType: 'number_line_place'
  },
  BALANCE_OPS: {
    name: 'Balance Operations',
    requiredFields: ['prompt', 'interaction', 'template_payload', 'answer_key'],
    interactionType: 'balance_ops'
  },
  EXPRESSION_INPUT: {
    name: 'Expression Input',
    requiredFields: ['prompt', 'interaction', 'template_payload', 'answer_key'],
    interactionType: 'expression_input'
  },
  MATCHING: {
    name: 'Matching',
    requiredFields: ['prompt', 'interaction', 'template_payload', 'answer_key'],
    interactionType: 'matching'
  },
  GEOMETRY_TAP: {
    name: 'Geometry Tap',
    requiredFields: ['prompt', 'interaction', 'template_payload', 'answer_key'],
    interactionType: 'geometry_tap'
  },
  MULTI_STEP_WORD: {
    name: 'Multi-Step Word Problem',
    requiredFields: ['prompt', 'interaction', 'template_payload', 'answer_key'],
    interactionType: 'multi_step_word'
  }
};

function isEmptyString(value: any): boolean {
  return typeof value !== 'string' || value.trim().length === 0;
}

function validatePrompt(prompt: any): string[] {
  if (!prompt || typeof prompt !== 'object') {
    return ['Prompt must be an object'];
  }

  const errors: string[] = [];
  if (isEmptyString(prompt.text) && !prompt.latex && !prompt.diagram) {
    errors.push('Prompt must have text, latex, or diagram');
  }
  return errors;
}

function validateInteraction(interaction: any, templateId: string): string[] {
  const errors: string[] = [];

  if (!interaction || typeof interaction !== 'object') {
    errors.push('Interaction must be an object');
    return errors;
  }

  if (!interaction.type) {
    errors.push('Interaction must have a type field');
  } else if (interaction.type !== TEMPLATE_CONFIGS[templateId]?.interactionType) {
    errors.push(
      `Interaction type '${interaction.type}' does not match template '${templateId}'`
    );
  }

  if (!interaction.config) {
    errors.push('Interaction must have a config field');
  }

  return errors;
}

function validateWorkedSolution(solution: any): { errors: string[], warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!solution || typeof solution !== 'object') {
    errors.push('Worked solution must be an object');
    return { errors, warnings };
  }

  if (!Array.isArray(solution.steps) || solution.steps.length === 0) {
    errors.push('Worked solution must have at least one step');
  } else {
    for (let i = 0; i < solution.steps.length; i++) {
      const step = solution.steps[i];
      // Ensure step is content we expect, for now check if string or object
      if (typeof step === 'string' && isEmptyString(step)) {
        errors.push(`Step ${i + 1} is empty`);
      }
    }
  }

  if (isEmptyString(solution.final_answer)) {
    warnings.push('Worked solution should have a final_answer');
  }

  if (isEmptyString(solution.why_it_works)) {
    warnings.push('Worked solution should have a why_it_works explanation');
  }

  return { errors, warnings };
}

function validateMisconceptions(misconceptions: any): { errors: string[], warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!misconceptions) {
    warnings.push('No misconceptions defined for this question');
    return { errors, warnings };
  }

  if (!Array.isArray(misconceptions)) {
    errors.push('Misconceptions must be an array');
    return { errors, warnings };
  }

  for (let i = 0; i < misconceptions.length; i++) {
    const mis = misconceptions[i];
    if (!mis.misconception_id) {
      errors.push(`Misconception ${i + 1} missing misconception_id`);
    }
    if (isEmptyString(mis.symptom)) {
      errors.push(`Misconception ${i + 1} missing symptom`);
    }
    if (isEmptyString(mis.hint)) {
      errors.push(`Misconception ${i + 1} missing hint`);
    }
  }

  return { errors, warnings };
}

function validateTransferItem(transferItem: any, templateId: string): { errors: string[], warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!transferItem) {
    warnings.push('No transfer item defined');
    return { errors, warnings };
  }

  if (typeof transferItem !== 'object') {
    errors.push('Transfer item must be an object');
    return { errors, warnings };
  }

  if (!transferItem.prompt) {
    errors.push('Transfer item must have a prompt');
  }

  if (!transferItem.answer_key) {
    errors.push('Transfer item must have an answer_key');
  }

  if (!transferItem.interaction) {
    errors.push('Transfer item must have an interaction');
  }

  if (!transferItem.worked_solution) {
    warnings.push('Transfer item should have a worked_solution');
  }

  return { errors, warnings };
}

export async function validateQuestionV2(item: any, options: any = {}): Promise<ValidationResultV2> {
  const result: ValidationResultV2 = {
    itemId: item?.item_id || 'UNKNOWN',
    templateId: item?.template_id || 'UNKNOWN',
    isValid: true,
    errors: [],
    warnings: [],
    suggestions: [],
    qualityGrade: 'A'
  };

  const requiredTopLevelFields = [
    'item_id',
    'template_id',
    'prompt',
    'interaction',
    'answer_key',
    'telemetry'
  ];

  for (const field of requiredTopLevelFields) {
    if (!item || item[field] === undefined || item[field] === null) {
      result.errors.push(`Missing required field: ${field}`);
    }
  }

  if (result.errors.length > 0) {
    result.isValid = false;
    result.qualityGrade = 'F';
    return result;
  }

  // Validate item_id format
  if (!item.item_id || typeof item.item_id !== 'string') {
    result.errors.push('item_id must be a non-empty string');
  } else if (!/^[A-Z]+\.[A-Z_0-9]+\.[0-9]{4}$/.test(item.item_id)) {
    result.warnings.push(
      `item_id '${item.item_id}' doesn't follow expected format (e.g., SAMPLE.MCQ.0001)`
    );
  }

  if (!TEMPLATE_CONFIGS[item.template_id]) {
    result.errors.push(`Unknown template_id: '${item.template_id}'`);
  }

  const templateConfig = TEMPLATE_CONFIGS[item.template_id];
  if (templateConfig) {
    for (const field of templateConfig.requiredFields) {
      if (item[field] === undefined || item[field] === null) {
        result.errors.push(
          `Template '${item.template_id}' requires field: ${field}`
        );
      }
    }
  }

  if (item.prompt) {
    const promptErrors = validatePrompt(item.prompt);
    result.errors.push(...promptErrors);
  }

  if (item.interaction) {
    const interactionErrors = validateInteraction(item.interaction, item.template_id);
    result.errors.push(...interactionErrors);
  }

  if (item.template_payload && templateConfig?.validatePayload) {
    const payloadError = templateConfig.validatePayload(item.template_payload);
    if (payloadError) {
      result.errors.push(payloadError);
    }
  }

  if (!item.answer_key || typeof item.answer_key !== 'object') {
    result.errors.push('answer_key must be an object');
  } else {
    const hasAnswerProperty =
      item.answer_key.value !== undefined ||
      item.answer_key.correct_option_id !== undefined ||
      item.answer_key.correct_tier1_id !== undefined ||
      item.answer_key.first_wrong_line !== undefined;

    if (!hasAnswerProperty) {
      result.errors.push(
        'answer_key must have a value property (value, correct_option_id, etc.)'
      );
    }
  }

  if (item.worked_solution) {
    const { errors: solErrors, warnings: solWarnings } = validateWorkedSolution(
      item.worked_solution
    );
    result.errors.push(...solErrors);
    result.warnings.push(...solWarnings);
  } else {
    result.warnings.push('No worked_solution provided');
  }

  if (item.misconceptions) {
    const { errors: misErrors, warnings: misWarnings } = validateMisconceptions(
      item.misconceptions
    );
    result.errors.push(...misErrors);
    result.warnings.push(...misWarnings);
  } else {
    result.warnings.push('No misconceptions defined');
  }

  if (!item.feedback_map || typeof item.feedback_map !== 'object') {
    result.warnings.push('No feedback_map defined (recommended for better UX)');
  } else {
    const feedbackKeys = Object.keys(item.feedback_map);
    if (feedbackKeys.length === 0) {
      result.warnings.push('feedback_map is empty');
    }
  }

  if (!item.recovery || typeof item.recovery !== 'object') {
    result.warnings.push('No recovery strategy defined (hints/scaffolds)');
  } else {
    if (!item.recovery.max_attempts) {
      result.warnings.push('recovery should define max_attempts');
    }
    if (!Array.isArray(item.recovery.hint_ladder)) {
      result.warnings.push('recovery should have hint_ladder array');
    }
  }

  if (item.transfer_item) {
    const { errors: tfErrors, warnings: tfWarnings } = validateTransferItem(
      item.transfer_item,
      item.template_id
    );
    result.errors.push(...tfErrors);
    result.warnings.push(...tfWarnings);
  } else {
    result.warnings.push('No transfer_item defined (limits knowledge transfer testing)');
  }

  if (!item.telemetry || typeof item.telemetry !== 'object') {
    result.warnings.push('No telemetry data');
  } else {
    if (!Array.isArray(item.telemetry.tags) || item.telemetry.tags.length === 0) {
      result.warnings.push('telemetry should have tags for categorization');
    }
    if (!Array.isArray(item.telemetry.concept_types) || item.telemetry.concept_types.length === 0) {
      result.warnings.push('telemetry should specify concept_types');
    }
  }

  if (result.errors.length > 0) {
    result.isValid = false;
    result.qualityGrade = 'F';
  } else if (result.warnings.length >= 5) {
    result.qualityGrade = 'D';
  } else if (result.warnings.length >= 3) {
    result.qualityGrade = 'C';
  } else if (result.warnings.length >= 1) {
    result.qualityGrade = 'B';
  } else {
    result.qualityGrade = 'A';
  }

  if (result.warnings.length > 0 && !result.errors.length) {
    if (result.warnings.some(w => w.includes('transfer_item'))) {
      result.suggestions.push({
        code: 'ADD_TRANSFER_ITEM',
        message: 'Add a transfer_item to enable knowledge transfer testing'
      });
    }
    if (result.warnings.some(w => w.includes('feedback_map'))) {
      result.suggestions.push({
        code: 'ADD_FEEDBACK_MAP',
        message: 'Add feedback_map for better student feedback on correctness/incorrectness'
      });
    }
    if (result.warnings.some(w => w.includes('recovery'))) {
      result.suggestions.push({
        code: 'ADD_RECOVERY',
        message: 'Add recovery strategy with hints and scaffolds for struggling students'
      });
    }
  }

  return result;
}

export async function validateQuestionBankV2(document: any, options: any = {}) {
  const results: any = {
    schemaVersion: document?.schema_version || 'UNKNOWN',
    bankId: document?.bank_id || 'UNKNOWN',
    totalItems: 0,
    validItems: 0,
    invalidItems: 0,
    itemResults: [],
    globalIssues: []
  };

  if (!document || !document.items) {
    results.globalIssues.push('Document must have an items array');
    return results;
  }

  results.totalItems = document.items.length;

  const itemIds = new Set();
  for (const item of document.items) {
    const itemResult = await validateQuestionV2(item, options);
    results.itemResults.push(itemResult);

    if (itemResult.isValid) {
      results.validItems++;
    } else {
      results.invalidItems++;
    }

    if (item.item_id) {
      if (itemIds.has(item.item_id)) {
        results.globalIssues.push(`Duplicate item_id: ${item.item_id}`);
      }
      itemIds.add(item.item_id);
    }
  }

  return results;
}

export default {
  validateQuestionV2,
  validateQuestionBankV2,
  TEMPLATE_CONFIGS
};
