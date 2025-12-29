// @ts-nocheck
/**
 * Diagnostic Assessment Service for Blue Ninja v3
 * 
 * This service handles the complete lifecycle of diagnostic assessments:
 * - Creating assessments with random questions
 * - Managing answer submissions
 * - Calculating scores and skill levels
 * - Generating results and recommendations
 * - Persisting assessment data
 * 
 * @module services/assessments/diagnostic
 */

import type {
  Assessment,
  AssessmentAnswer,
  DiagnosticAssessmentConfig,
  AssessmentResults,
  AssessmentScore,
  AssessmentRecommendation,
  AssessmentQuestion,
} from '../../types/assessment';
import { AssessmentStatus as Status, SkillLevel } from '../../types/assessment';
import type { Question } from '../../types/questions';
import { getRandomQuestions } from '../questions';
import * as idbService from '../db/idb';
import { logger } from '../logging';

const uuidv4 = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

/**
 * DiagnosticAssessmentService
 * Manages diagnostic assessments for students
 */
class DiagnosticAssessmentService {
  /**
   * Create a new diagnostic assessment
   * Selects random questions based on difficulty levels
   * 
   * @param config - Assessment configuration
   * @returns Assessment object with questions
   * @throws Error if unable to create assessment
   */
  async createDiagnosticAssessment(
    config: DiagnosticAssessmentConfig
  ): Promise<Assessment> {
    try {
      logger.info('Creating diagnostic assessment', { userId: config.userId });

      const assessmentId = uuidv4();
      const now = Date.now();

      // Default counts
      const easyCount = config.easyCount || 3;
      const mediumCount = config.mediumCount || 3;
      const hardCount = config.hardCount || 3;

      // Get random questions for each difficulty level
      const easyQuestions = await getRandomQuestions(easyCount, {
        level: 'easy',
        subject: config.subject,
        topic: config.topic,
      });
      const mediumQuestions = await getRandomQuestions(mediumCount, {
        level: 'medium',
        subject: config.subject,
        topic: config.topic,
      });
      const hardQuestions = await getRandomQuestions(hardCount, {
        level: 'hard',
        subject: config.subject,
        topic: config.topic,
      });

      // Combine and shuffle questions
      const allQuestions = [
        ...easyQuestions.map((q) => ({ q, difficulty: 'EASY' as const })),
        ...mediumQuestions.map((q) => ({ q, difficulty: 'MEDIUM' as const })),
        ...hardQuestions.map((q) => ({ q, difficulty: 'HARD' as const })),
      ];

      // Shuffle using Fisher-Yates
      for (let i = allQuestions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allQuestions[i], allQuestions[j]] = [allQuestions[j], allQuestions[i]];
      }

      // Create assessment questions
      const assessmentQuestions: AssessmentQuestion[] = allQuestions.map(
        (item, index) => ({
          id: uuidv4(),
          questionId: item.q.id,
          question: item.q,
          assignedAt: now,
          difficulty: item.difficulty,
          status: 'PENDING' as const,
        })
      );

      // Create assessment
      const assessment: Assessment = {
        id: assessmentId,
        userId: config.userId,
        type: 'DIAGNOSTIC',
        status: Status.CREATED,
        questions: assessmentQuestions,
        answers: [],
        config,
        createdAt: now,
      };

      // Save to IndexedDB
      await idbService.saveAssessment(assessment);

      logger.info('Assessment created successfully', {
        assessmentId,
        questionCount: assessmentQuestions.length,
      });

      return assessment;
    } catch (error) {
      logger.error('Failed to create diagnostic assessment', error);
      throw new Error('Unable to create assessment. Please try again.');
    }
  }

  /**
   * Submit an answer to a question in the assessment
   * Validates answer and updates assessment status
   * 
   * @param assessmentId - Assessment ID
   * @param questionId - Question ID
   * @param userAnswer - User's answer
   * @returns Assessment after answer submission
   * @throws Error if assessment or question not found
   */
  async submitAnswer(
    assessmentId: string,
    questionId: string,
    userAnswer: any
  ): Promise<Assessment> {
    try {
      logger.debug('Submitting answer', { assessmentId, questionId });

      // Get assessment
      const assessment = await idbService.getAssessment(assessmentId);
      if (!assessment) {
        throw new Error('Assessment not found');
      }

      // Find question
      const assessmentQuestion = assessment.questions.find(
        (q) => q.questionId === questionId
      );
      if (!assessmentQuestion) {
        throw new Error('Question not found in assessment');
      }

      // Get original question for validation
      const question = assessmentQuestion.question;

      // Check if answer is correct
      const isCorrect = this.validateAnswer(
        question,
        userAnswer,
        assessmentQuestion.difficulty
      );

      // Calculate points
      const pointsEarned = this.calculatePoints(
        isCorrect,
        assessmentQuestion.difficulty
      );

      // Create answer record
      const answer: AssessmentAnswer = {
        questionId,
        userAnswer,
        submittedAt: Date.now(),
        isCorrect,
        pointsEarned,
        explanation: this.getExplanation(question, userAnswer, isCorrect),
      };

      // Update assessment
      assessment.answers.push(answer);
      assessmentQuestion.status = 'ANSWERED';

      // Update status to IN_PROGRESS if first answer
      if (assessment.status === Status.CREATED) {
        assessment.status = Status.IN_PROGRESS;
        assessment.startedAt = Date.now();
      }

      // Save to IndexedDB
      await idbService.saveAssessment(assessment);

      logger.debug('Answer submitted', {
        assessmentId,
        isCorrect,
        pointsEarned,
      });

      return assessment;
    } catch (error) {
      logger.error('Failed to submit answer', error);
      throw error;
    }
  }

  /**
   * Complete the assessment
   * Calculates final scores and generates results
   * 
   * @param assessmentId - Assessment ID
   * @returns Assessment results with analysis
   * @throws Error if assessment not found
   */
  async completeAssessment(
    assessmentId: string
  ): Promise<AssessmentResults> {
    try {
      logger.info('Completing assessment', { assessmentId });

      // Get assessment
      const assessment = await idbService.getAssessment(assessmentId);
      if (!assessment) {
        throw new Error('Assessment not found');
      }

      // Calculate score
      const score = this.calculateScore(assessment);

      // Determine skill level
      const skillLevel = this.determineSkillLevel(score, assessment);

      // Generate recommendation
      const recommendation = this.generateRecommendation(
        assessment,
        score,
        skillLevel
      );

      // Calculate detailed analysis
      const detailedAnalysis = this.analyzePerformance(assessment, score);

      // Create results
      const results: AssessmentResults = {
        assessmentId,
        userId: assessment.userId,
        score,
        skillLevel,
        recommendation,
        detailedAnalysis,
        generatedAt: Date.now(),
      };

      // Update assessment
      assessment.status = Status.COMPLETED;
      assessment.completedAt = Date.now();
      assessment.duration =
        (assessment.completedAt - (assessment.startedAt || assessment.createdAt)) /
        1000; // seconds

      // Save assessment
      await idbService.saveAssessment(assessment);

      // Save results
      await idbService.saveAssessmentResults(results);

      // Update student progress based on results
      await this.saveProgressFromAssessment(assessment, results);

      logger.info('Assessment completed', {
        assessmentId,
        skillLevel,
        percentage: score.percentage,
      });

      return results;
    } catch (error) {
      logger.error('Failed to complete assessment', error);
      throw error;
    }
  }

  /**
   * Validate if user's answer is correct
   * Logic depends on question type
   * 
   * @param question - Question object
   * @param userAnswer - User's answer
   * @param difficulty - Question difficulty (used for context)
   * @returns true if answer is correct
   */
  private validateAnswer(
    question: any,
    userAnswer: any,
    difficulty: string
  ): boolean {
    try {
      // Handle different question types
      switch (question.type) {
        case 'MULTIPLE_CHOICE': {
          const correct = question.metadata?.correctAnswer;
          return userAnswer === correct;
        }

        case 'MULTI_SELECT': {
          const correct = question.metadata?.correctAnswers as string[];
          if (!Array.isArray(userAnswer)) return false;
          if (userAnswer.length !== correct.length) return false;
          return userAnswer.every((a) => correct.includes(a));
        }

        case 'TRUE_FALSE': {
          const correct = question.metadata?.correctAnswer;
          return String(userAnswer).toLowerCase() ===
            String(correct).toLowerCase();
        }

        case 'SHORT_ANSWER': {
          const correct = question.metadata?.correctAnswer as string;
          const userStr = String(userAnswer).trim().toLowerCase();
          const correctStr = correct.trim().toLowerCase();
          return userStr === correctStr;
        }

        case 'FILL_BLANKS': {
          const correctAnswers = question.metadata?.correctAnswers as string[];
          const userAnswers = Array.isArray(userAnswer)
            ? userAnswer.map((a: string) => a.trim().toLowerCase())
            : [String(userAnswer).trim().toLowerCase()];

          if (userAnswers.length !== correctAnswers.length) return false;
          return userAnswers.every((a, i) =>
            a === correctAnswers[i]?.toLowerCase()
          );
        }

        case 'MATCHING': {
          const pairs = question.metadata?.pairs as Record<string, string>;
          for (const [key, value] of Object.entries(pairs)) {
            if (userAnswer[key] !== value) return false;
          }
          return true;
        }

        case 'ORDERING': {
          const correct = question.metadata?.correctOrder as string[];
          if (!Array.isArray(userAnswer)) return false;
          return JSON.stringify(userAnswer) === JSON.stringify(correct);
        }

        default:
          logger.warn('Unknown question type for validation', {
            type: question.type,
          });
          return false;
      }
    } catch (error) {
      logger.error('Error validating answer', error);
      return false;
    }
  }

  /**
   * Calculate points for an answer
   * Points depend on difficulty and correctness
   * 
   * @param isCorrect - Whether answer is correct
   * @param difficulty - Question difficulty
   * @returns Points earned
   */
  private calculatePoints(
    isCorrect: boolean,
    difficulty: 'EASY' | 'MEDIUM' | 'HARD'
  ): number {
    if (!isCorrect) return 0;

    switch (difficulty) {
      case 'EASY':
        return 1;
      case 'MEDIUM':
        return 2;
      case 'HARD':
        return 3;
      default:
        return 0;
    }
  }

  /**
   * Get explanation for answer (correct or incorrect)
   * 
   * @param question - Question object
   * @param userAnswer - User's answer
   * @param isCorrect - Whether answer is correct
   * @returns Explanation string
   */
  private getExplanation(
    question: Question,
    userAnswer: any,
    isCorrect: boolean
  ): string {
    if (isCorrect) {
      return question.metadata?.explanation || 'Correct answer!';
    }
    return (
      question.metadata?.explanation ||
      `The correct answer is: ${question.metadata?.correctAnswer}`
    );
  }

  /**
   * Calculate overall score for assessment
   * 
   * @param assessment - Assessment with answers
   * @returns Score breakdown
   */
  private calculateScore(assessment: Assessment): AssessmentScore {
    const answeredQuestions = assessment.answers.length;
    const correctAnswers = assessment.answers.filter(
      (a) => a.isCorrect
    ).length;
    const totalPoints = assessment.answers.reduce(
      (sum, a) => sum + a.pointsEarned,
      0
    );
    const totalPossiblePoints = assessment.questions.length * 3; // Assuming max 3 points per question

    return {
      totalQuestions: assessment.questions.length,
      answeredQuestions,
      correctAnswers,
      incorrectAnswers: answeredQuestions - correctAnswers,
      skippedQuestions: assessment.questions.length - answeredQuestions,
      totalPoints: totalPossiblePoints,
      pointsEarned: totalPoints,
      percentage: Math.round(
        (correctAnswers / answeredQuestions) * 100
      ) || 0,
      accuracy: correctAnswers / answeredQuestions || 0,
    };
  }

  /**
   * Determine skill level based on performance
   * 
   * @param score - Assessment score
   * @param assessment - Assessment object
   * @returns Skill level
   */
  private determineSkillLevel(
    score: AssessmentScore,
    assessment: Assessment
  ): SkillLevel {
    // Analyze performance across difficulty levels
    const easy = assessment.questions.filter((q) => q.difficulty === 'EASY');
    const medium = assessment.questions.filter(
      (q) => q.difficulty === 'MEDIUM'
    );
    const hard = assessment.questions.filter((q) => q.difficulty === 'HARD');

    const easyCorrect = assessment.answers.filter(
      (a) =>
        a.isCorrect &&
        easy.some((q) => q.questionId === a.questionId)
    ).length;
    const mediumCorrect = assessment.answers.filter(
      (a) =>
        a.isCorrect &&
        medium.some((q) => q.questionId === a.questionId)
    ).length;
    const hardCorrect = assessment.answers.filter(
      (a) =>
        a.isCorrect &&
        hard.some((q) => q.questionId === a.questionId)
    ).length;

    // Skill level logic
    if (hardCorrect / hard.length > 0.6 && score.percentage > 75) {
      return SkillLevel.ADVANCED;
    } else if (
      mediumCorrect / medium.length > 0.5 &&
      score.percentage > 60
    ) {
      return SkillLevel.INTERMEDIATE;
    }
    return SkillLevel.BEGINNER;
  }

  /**
   * Generate recommendations based on performance
   * 
   * @param assessment - Assessment object
   * @param score - Score breakdown
   * @param skillLevel - Determined skill level
   * @returns Recommendation object
   */
  private generateRecommendation(
    assessment: Assessment,
    score: AssessmentScore,
    skillLevel: SkillLevel
  ): AssessmentRecommendation {
    // Identify weak areas
    const weakAreas: string[] = [];
    const strongAreas: string[] = [];

    // Simple analysis based on question topics
    assessment.questions.forEach((q) => {
      const answer = assessment.answers.find(
        (a) => a.questionId === q.questionId
      );
      const topic = q.question.metadata?.topic || 'General';
      if (answer && !answer.isCorrect && !weakAreas.includes(topic)) {
        weakAreas.push(topic);
      } else if (answer && answer.isCorrect && !strongAreas.includes(topic)) {
        strongAreas.push(topic);
      }
    });

    const summary =
      skillLevel === SkillLevel.ADVANCED
        ? 'Excellent work! You\'re ready for advanced topics.'
        : skillLevel === SkillLevel.INTERMEDIATE
          ? 'Good progress! Continue practicing to reach advanced level.'
          : 'Keep practicing! Focus on fundamentals to improve.'

    const nextSteps =
      skillLevel === SkillLevel.ADVANCED
        ? ['Explore advanced topics', 'Help others with fundamentals']
        : skillLevel === SkillLevel.INTERMEDIATE
          ? ['Complete daily missions', 'Review weak areas']
          : ['Start with daily missions', 'Review basic concepts']

    return {
      skillLevel,
      summary,
      strengths: strongAreas.slice(0, 3),
      weaknesses: weakAreas.slice(0, 3),
      nextSteps,
      topicsToFocus: weakAreas,
    };
  }

  /**
   * Analyze detailed performance
   * 
   * @param assessment - Assessment object
   * @param score - Score breakdown
   * @returns Detailed analysis
   */
  private analyzePerformance(
    assessment: Assessment,
    score: AssessmentScore
  ) {
    const easy = assessment.questions.filter((q) => q.difficulty === 'EASY');
    const medium = assessment.questions.filter(
      (q) => q.difficulty === 'MEDIUM'
    );
    const hard = assessment.questions.filter((q) => q.difficulty === 'HARD');

    const easyCorrect = assessment.answers.filter(
      (a) =>
        a.isCorrect &&
        easy.some((q) => q.questionId === a.questionId)
    ).length;
    const mediumCorrect = assessment.answers.filter(
      (a) =>
        a.isCorrect &&
        medium.some((q) => q.questionId === a.questionId)
    ).length;
    const hardCorrect = assessment.answers.filter(
      (a) =>
        a.isCorrect &&
        hard.some((q) => q.questionId === a.questionId)
    ).length;

    const timeTaken = (assessment.completedAt || Date.now()) -
      (assessment.startedAt || assessment.createdAt);
    const avgTime =
      score.answeredQuestions > 0
        ? timeTaken / score.answeredQuestions
        : 0;

    return {
      easyAccuracy: easy.length > 0 ? Math.round((easyCorrect / easy.length) * 100) : 0,
      mediumAccuracy: medium.length > 0
        ? Math.round((mediumCorrect / medium.length) * 100)
        : 0,
      hardAccuracy: hard.length > 0 ? Math.round((hardCorrect / hard.length) * 100) : 0,
      timeTaken,
      averageTimePerQuestion: avgTime,
    };
  }

  /**
   * Save student progress from assessment results
   * Updates student's overall profile with assessment insights
   * 
   * @param assessment - Assessment object
   * @param results - Assessment results
   */
  private async saveProgressFromAssessment(
    assessment: Assessment,
    results: AssessmentResults
  ): Promise<void> {
    try {
      // Update student progress in IndexedDB
      const studentProgress = await idbService.getStudentProgress(
        assessment.userId
      );

      if (studentProgress) {
        studentProgress.lastAssessmentId = assessment.id;
        studentProgress.skillLevel = results.skillLevel;
        studentProgress.lastUpdated = Date.now();
        await idbService.saveStudentProgress(studentProgress);
      }

      logger.info('Student progress updated', {
        userId: assessment.userId,
        skillLevel: results.skillLevel,
      });
    } catch (error) {
      logger.warn('Could not save student progress', error);
      // Don't throw - this is non-critical
    }
  }

  /**
   * Get assessment by ID
   * 
   * @param assessmentId - Assessment ID
   * @returns Assessment or null
   */
  async getAssessment(assessmentId: string): Promise<Assessment | null> {
    try {
      return await idbService.getAssessment(assessmentId);
    } catch (error) {
      logger.error('Failed to get assessment', error);
      return null;
    }
  }

  /**
   * Get assessment results by assessment ID
   * 
   * @param assessmentId - Assessment ID
   * @returns Assessment results or null
   */
  async getAssessmentResults(
    assessmentId: string
  ): Promise<AssessmentResults | null> {
    try {
      return await idbService.getAssessmentResults(assessmentId);
    } catch (error) {
      logger.error('Failed to get assessment results', error);
      return null;
    }
  }
}

// Export singleton instance
export const diagnosticAssessmentService = new DiagnosticAssessmentService();
export default diagnosticAssessmentService;
