import { z } from 'zod';

const baseQuestionSchema = z.object({
  id: z.string().uuid(),
  subject: z.string().min(1),
  topic: z.string().min(1),
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
  options: z.array(
    z.object({
      id: z.string(),
      text: z.string(),
      imageUrl: z.string().url().optional(),
    })
  ),
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
  rubric: z
    .array(
      z.object({
        criteria: z.string(),
        points: z.number(),
      })
    )
    .optional(),
  requiresManualGrading: z.literal(true),
});

export const matchingSchema = baseQuestionSchema.extend({
  template: z.literal('match'),
  pairs: z.array(
    z.object({
      id: z.string(),
      left: z.string(),
      rightId: z.string(),
      right: z.string(),
    })
  ),
});

export const dragDropSchema = baseQuestionSchema.extend({
  template: z.literal('drag_drop'),
  items: z.array(z.string()),
  correctOrder: z.array(z.string()),
});

export const dropdownSchema = baseQuestionSchema.extend({
  template: z.literal('dropdown'),
  blanks: z.array(
    z.object({
      id: z.string(),
      correctAnswer: z.string(),
      options: z.array(z.string()),
    })
  ),
});

export const numericSchema = baseQuestionSchema.extend({
  template: z.literal('numeric'),
  correctAnswer: z.number(),
  tolerance: z.number().optional(),
  unit: z.string().optional(),
});

export const clickImageSchema = baseQuestionSchema.extend({
  template: z.literal('click_image'),
  imageUrl: z.string().url(),
  imageWidth: z.number(),
  imageHeight: z.number(),
  correctAreas: z.array(
    z.object({
      id: z.string(),
      x: z.number(),
      y: z.number(),
      width: z.number(),
      height: z.number(),
    })
  ),
});

export const multipleSelectSchema = baseQuestionSchema.extend({
  template: z.literal('multiple_select'),
  options: z.array(
    z.object({
      id: z.string(),
      text: z.string(),
    })
  ),
  correctOptionIds: z.array(z.string()),
  partialCredit: z.boolean().optional(),
});

export const sequencingSchema = baseQuestionSchema.extend({
  template: z.literal('sequencing'),
  items: z.array(z.string()),
  correctSequence: z.array(z.string()),
});

export const tableFillSchema = baseQuestionSchema.extend({
  template: z.literal('table_fill'),
  headers: z.object({
    row: z.array(z.string()),
    column: z.array(z.string()),
  }),
  answers: z.record(z.record(z.string())),
});

export const formulaSchema = baseQuestionSchema.extend({
  template: z.literal('formula'),
  correctFormulas: z.array(z.string()),
  variables: z.record(z.string()).optional(),
});

export const questionSchema = z.union([
  multipleChoiceSchema,
  fillBlankSchema,
  trueFalseSchema,
  shortAnswerSchema,
  essaySchema,
  matchingSchema,
  dragDropSchema,
  dropdownSchema,
  numericSchema,
  clickImageSchema,
  multipleSelectSchema,
  sequencingSchema,
  tableFillSchema,
  formulaSchema,
]);

// Validation helpers
export function validateQuestion(data: unknown) {
  return questionSchema.parse(data);
}

export function validateMultipleChoice(data: unknown) {
  return multipleChoiceSchema.parse(data);
}

export function validateNumericQuestion(data: unknown) {
  return numericSchema.parse(data);
}
