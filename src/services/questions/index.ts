import { db } from '../idb';
import { logger } from '../logging';
import type { Question } from '../../types/questions';

// ===== LOAD QUESTIONS =====

export async function loadQuestions(source: 'cache' | 'firestore' = 'cache') {
  try {
    logger.info(`📚 Loading questions from ${source}...`);

    const cached = await db.questions.toArray();
    logger.info(`✅ Loaded ${cached.length} questions from cache`);
    return cached as Question[];
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
  const questions = await db.questions.toArray();
  const lowerQuery = query.toLowerCase();

  return (questions as Question[]).filter((q) => {
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
  return (await db.questions
    .where('subject')
    .equals(subject)
    .toArray()) as Question[];
}

export async function getQuestionsByTopic(topic: string): Promise<Question[]> {
  return (await db.questions
    .where('topic')
    .equals(topic)
    .toArray()) as Question[];
}

export async function getQuestionsByLevel(
  level: 'easy' | 'medium' | 'hard'
): Promise<Question[]> {
  return (await db.questions
    .where('level')
    .equals(level)
    .toArray()) as Question[];
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
  let questions = (await db.questions.toArray()) as Question[];

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

// ===== GET SINGLE QUESTION =====

export async function getQuestion(id: string): Promise<Question | undefined> {
  return (await db.questions.get(id)) as Question | undefined;
}

// ===== SAVE QUESTION =====

export async function saveQuestion(question: Question): Promise<string> {
  try {
    logger.info(`💾 Saving question: ${question.id}`);
    const id = await db.questions.put(question as any);
    logger.info(`✅ Question saved`);
    return id;
  } catch (error) {
    logger.error('Error saving question:', error);
    throw error;
  }
}

export async function saveQuestions(questions: Question[]): Promise<void> {
  try {
    logger.info(`💾 Saving ${questions.length} questions...`);
    await db.questions.bulkPut(questions as any);
    logger.info(`✅ Questions saved`);
  } catch (error) {
    logger.error('Error saving questions:', error);
    throw error;
  }
}

// ===== DELETE QUESTION =====

export async function deleteQuestion(id: string): Promise<void> {
  try {
    logger.info(`🗑️ Deleting question: ${id}`);
    await db.questions.delete(id);
    logger.info(`✅ Question deleted`);
  } catch (error) {
    logger.error('Error deleting question:', error);
    throw error;
  }
}

// ===== STATISTICS =====

export async function getQuestionStats() {
  const questions = (await db.questions.toArray()) as Question[];

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

export async function getAllTopics(): Promise<string[]> {
  const questions = (await db.questions.toArray()) as Question[];
  const topics = new Set(questions.map((q) => q.topic));
  return Array.from(topics);
}

export async function getAllSubjects(): Promise<string[]> {
  const questions = (await db.questions.toArray()) as Question[];
  const subjects = new Set(questions.map((q) => q.subject));
  return Array.from(subjects);
}
