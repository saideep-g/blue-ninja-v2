/**
 * Admin Service
 * Handles all admin operations including student management, question management,
 * analytics, and reporting
 */

import { logger } from '../logging';
import { idb } from '../idb';
import type {
  AdminAnalytics,
  StudentInfo,
  QuestionStats,
  StudentProgressReport,
  TopicPerformanceReport,
  MissionCompletionReport,
  AssessmentStatsReport,
  AdminActionLog,
  AdminFilterOptions,
  StudentInfo as AdminStudentInfo
} from '../../types/admin';

/**
 * Admin Service - Comprehensive admin operations
 */
export const adminService = {
  /**
   * Get admin analytics overview
   * @returns System-wide analytics and metrics
   */
  async getAnalyticsOverview(): Promise<AdminAnalytics> {
    try {
      logger.debug('[AdminService] Getting analytics overview');

      // Get all students
      const students = await idb.getAllRecords('students');
      const totalStudents = students.length;

      // Get active students (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const activeStudents = students.filter(
        s => new Date(s.lastLogin || 0) > sevenDaysAgo
      ).length;

      // Get all questions
      const questions = await idb.getAllRecords('questions');
      const totalQuestions = questions.length;

      // Calculate average accuracy
      const assessments = await idb.getAllRecords('assessments');
      const completedAssessments = assessments.filter(
        a => a.status === 'COMPLETED'
      );
      const averageAccuracy = completedAssessments.length > 0
        ? (completedAssessments.reduce((sum, a) => sum + (a.results?.score?.percentage || 0), 0) / completedAssessments.length)
        : 0;

      // Get mission stats
      const missions = await idb.getAllRecords('missions');
      const completedMissions = missions.filter(
        m => m.status === 'COMPLETED'
      ).length;

      // Get topic popularity
      const topicMap = new Map<string, { count: number; totalAccuracy: number; lastUsed: Date }>();
      completedAssessments.forEach(assessment => {
        if (assessment.results?.topic) {
          const existing = topicMap.get(assessment.results.topic) || {
            count: 0,
            totalAccuracy: 0,
            lastUsed: new Date(0)
          };
          existing.count++;
          existing.totalAccuracy += assessment.results.score?.percentage || 0;
          existing.lastUsed = new Date(assessment.completedAt);
          topicMap.set(assessment.results.topic, existing);
        }
      });

      const mostPopularTopics = Array.from(topicMap.entries())
        .map(([topic, data]) => ({
          topic,
          count: data.count,
          accuracy: data.totalAccuracy / data.count,
          lastUsed: data.lastUsed
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Success rate by difficulty
      const difficultyMap = new Map<string, { total: number; correct: number }>();
      completedAssessments.forEach(assessment => {
        assessment.answers?.forEach((answer: any) => {
          if (answer.question?.difficulty) {
            const existing = difficultyMap.get(answer.question.difficulty) || { total: 0, correct: 0 };
            existing.total++;
            if (answer.correct) existing.correct++;
            difficultyMap.set(answer.question.difficulty, existing);
          }
        });
      });

      const successRateByDifficulty = Array.from(difficultyMap.entries()).map(([difficulty, data]) => ({
        difficulty: difficulty as 'EASY' | 'MEDIUM' | 'HARD',
        totalAttempts: data.total,
        correctAttempts: data.correct,
        successRate: data.total > 0 ? (data.correct / data.total) * 100 : 0,
        averageTime: 0
      }));

      const analytics: AdminAnalytics = {
        totalStudents,
        activeStudents,
        totalQuestions,
        averageAccuracy,
        totalMissionsCompleted: completedMissions,
        mostPopularTopics,
        successRateByDifficulty,
        lastUpdated: new Date()
      };

      logger.debug('[AdminService] Analytics overview retrieved', { analytics });
      return analytics;
    } catch (error) {
      logger.error('[AdminService] Error getting analytics overview', { error });
      throw new Error('Failed to retrieve analytics overview');
    }
  },

  /**
   * Get list of all students with optional filtering
   * @param filters - Optional filter options
   * @returns List of students
   */
  async getStudentList(filters?: AdminFilterOptions): Promise<StudentInfo[]> {
    try {
      logger.debug('[AdminService] Getting student list', { filters });

      const students = await idb.getAllRecords('students');
      let filtered = [...students];

      // Apply search term
      if (filters?.searchTerm) {
        const term = filters.searchTerm.toLowerCase();
        filtered = filtered.filter(
          s => s.name?.toLowerCase().includes(term) ||
            s.email?.toLowerCase().includes(term)
        );
      }

      // Apply grade filter
      if (filters?.grade) {
        filtered = filtered.filter(s => s.grade === filters.grade);
      }

      // Apply status filter
      if (filters?.status) {
        filtered = filtered.filter(s => s.status === filters.status);
      }

      // Apply sorting
      if (filters?.sortBy) {
        filtered.sort((a, b) => {
          let aVal: any = a[filters.sortBy as keyof StudentInfo];
          let bVal: any = b[filters.sortBy as keyof StudentInfo];
          const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
          return filters.sortOrder === 'DESC' ? -cmp : cmp;
        });
      }

      // Apply pagination
      const offset = filters?.offset || 0;
      const limit = filters?.limit || 20;
      const paginated = filtered.slice(offset, offset + limit);

      logger.debug('[AdminService] Student list retrieved', { count: paginated.length });
      return paginated;
    } catch (error) {
      logger.error('[AdminService] Error getting student list', { error });
      throw new Error('Failed to retrieve student list');
    }
  },

  /**
   * Get detailed student progress report
   * @param studentId - Student ID
   * @param periodDays - Number of days to analyze (default 30)
   * @returns Student progress report
   */
  async getStudentProgressReport(
    studentId: string,
    periodDays: number = 30
  ): Promise<StudentProgressReport> {
    try {
      logger.debug('[AdminService] Getting student progress report', { studentId, periodDays });

      const student = await idb.getRecord('students', studentId);
      if (!student) throw new Error('Student not found');

      const now = new Date();
      const periodStart = new Date();
      periodStart.setDate(periodStart.getDate() - periodDays);

      // Get assessments in period
      const allAssessments = await idb.getAllRecords('assessments');
      const assessments = allAssessments.filter(
        a => a.userId === studentId &&
          new Date(a.completedAt) >= periodStart
      );

      // Get missions in period
      const allMissions = await idb.getAllRecords('missions');
      const missions = allMissions.filter(
        m => m.userId === studentId &&
          new Date(m.completedAt) >= periodStart
      );

      const completedMissions = missions.filter(m => m.status === 'COMPLETED');
      const completionRate = missions.length > 0
        ? (completedMissions.length / missions.length) * 100
        : 0;

      // Analyze topic performance
      const topicMap = new Map<string, { correct: number; total: number; questions: string[] }>();
      assessments.forEach(assessment => {
        assessment.answers?.forEach((answer: any) => {
          const topic = answer.question?.topic || 'Unknown';
          const existing = topicMap.get(topic) || { correct: 0, total: 0, questions: [] };
          existing.total++;
          if (answer.correct) existing.correct++;
          if (!existing.questions.includes(answer.question?.id)) {
            existing.questions.push(answer.question?.id);
          }
          topicMap.set(topic, existing);
        });
      });

      const topicPerformance = Array.from(topicMap.entries()).map(([topic, data]) => ({
        topic,
        accuracy: data.total > 0 ? (data.correct / data.total) * 100 : 0,
        totalQuestions: data.total,
        strengths: [],
        weaknesses: []
      }));

      const report: StudentProgressReport = {
        studentId,
        studentName: student.name || 'Unknown',
        reportDate: now,
        periodStart,
        periodEnd: now,
        assessmentStats: {
          totalCompleted: assessments.length,
          averageScore: assessments.length > 0
            ? assessments.reduce((sum, a) => sum + (a.results?.score?.percentage || 0), 0) / assessments.length
            : 0,
          skillLevelProgression: []
        },
        missionStats: {
          totalCompleted: completedMissions.length,
          completionRate,
          currentStreak: student.currentStreak || 0,
          totalPoints: student.totalPoints || 0,
          badgesEarned: student.badges?.length || 0
        },
        topicPerformance,
        recommendations: []
      };

      logger.debug('[AdminService] Student progress report generated', { studentId });
      return report;
    } catch (error) {
      logger.error('[AdminService] Error getting student progress report', { error, studentId });
      throw new Error('Failed to generate student progress report');
    }
  },

  /**
   * Reset student progress
   * @param studentId - Student ID to reset
   * @returns Success status
   */
  async resetStudentProgress(studentId: string): Promise<boolean> {
    try {
      logger.info('[AdminService] Resetting student progress', { studentId });

      const student = await idb.getRecord('students', studentId);
      if (!student) throw new Error('Student not found');

      // Reset student data
      const updated = {
        ...student,
        currentStreak: 0,
        totalPoints: 0,
        badges: [],
        assessmentCount: 0,
        averageScore: 0,
        updatedAt: new Date()
      };

      await idb.updateRecord('students', studentId, updated);

      // Log admin action
      await this.logAdminAction({
        action: 'RESET_STUDENT',
        targetId: studentId,
        status: 'SUCCESS',
        details: { studentName: student.name }
      });

      logger.info('[AdminService] Student progress reset successfully', { studentId });
      return true;
    } catch (error) {
      logger.error('[AdminService] Error resetting student progress', { error, studentId });
      throw new Error('Failed to reset student progress');
    }
  },

  /**
   * Block or unblock a student
   * @param studentId - Student ID
   * @param blocked - Block or unblock
   * @returns Success status
   */
  async setStudentStatus(studentId: string, status: 'ACTIVE' | 'INACTIVE' | 'BLOCKED'): Promise<boolean> {
    try {
      logger.info('[AdminService] Updating student status', { studentId, status });

      const student = await idb.getRecord('students', studentId);
      if (!student) throw new Error('Student not found');

      const updated = { ...student, status, updatedAt: new Date() };
      await idb.updateRecord('students', studentId, updated);

      await this.logAdminAction({
        action: 'BLOCK_STUDENT',
        targetId: studentId,
        status: 'SUCCESS',
        details: { newStatus: status }
      });

      logger.info('[AdminService] Student status updated', { studentId, status });
      return true;
    } catch (error) {
      logger.error('[AdminService] Error updating student status', { error, studentId });
      throw new Error('Failed to update student status');
    }
  },

  /**
   * Delete a question
   * @param questionId - Question ID to delete
   * @returns Success status
   */
  async deleteQuestion(questionId: string): Promise<boolean> {
    try {
      logger.info('[AdminService] Deleting question', { questionId });

      const question = await idb.getRecord('questions', questionId);
      if (!question) throw new Error('Question not found');

      await idb.deleteRecord('questions', questionId);

      await this.logAdminAction({
        action: 'DELETE_QUESTION',
        targetId: questionId,
        status: 'SUCCESS',
        details: { questionType: question.type, topic: question.topic }
      });

      logger.info('[AdminService] Question deleted successfully', { questionId });
      return true;
    } catch (error) {
      logger.error('[AdminService] Error deleting question', { error, questionId });
      throw new Error('Failed to delete question');
    }
  },

  /**
   * Get question statistics
   * @returns List of questions with usage stats
   */
  async getQuestionStats(): Promise<QuestionStats[]> {
    try {
      logger.debug('[AdminService] Getting question statistics');

      const questions = await idb.getAllRecords('questions');
      const assessments = await idb.getAllRecords('assessments');

      const stats: QuestionStats[] = questions.map(q => {
        let timesUsed = 0;
        let correctAttempts = 0;
        let totalAttempts = 0;
        let totalTime = 0;
        let lastUsed = new Date(0);

        assessments.forEach(assessment => {
          assessment.answers?.forEach((answer: any) => {
            if (answer.question?.id === q.id) {
              timesUsed++;
              totalAttempts++;
              if (answer.correct) correctAttempts++;
              totalTime += answer.timeSpent || 0;
              lastUsed = new Date(assessment.completedAt);
            }
          });
        });

        return {
          id: q.id,
          statement: q.statement,
          type: q.type,
          difficulty: q.difficulty,
          subject: q.subject,
          topic: q.topic,
          timesUsed,
          correctAttempts,
          totalAttempts,
          accuracy: totalAttempts > 0 ? (correctAttempts / totalAttempts) * 100 : 0,
          averageTime: timesUsed > 0 ? totalTime / timesUsed : 0,
          createdAt: new Date(q.createdAt),
          lastUsed
        };
      });

      logger.debug('[AdminService] Question statistics retrieved', { count: stats.length });
      return stats;
    } catch (error) {
      logger.error('[AdminService] Error getting question statistics', { error });
      throw new Error('Failed to retrieve question statistics');
    }
  },

  /**
   * Get mission completion report
   * @returns Mission completion analytics
   */
  async getMissionCompletionReport(): Promise<MissionCompletionReport> {
    try {
      logger.debug('[AdminService] Getting mission completion report');

      const today = new Date();
      const missions = await idb.getAllRecords('missions');
      const todayMissions = missions.filter(
        m => new Date(m.createdAt).toDateString() === today.toDateString()
      );

      const students = await idb.getAllRecords('students');
      const completedToday = students.filter(s => {
        const lastLogin = new Date(s.lastLogin || 0);
        return lastLogin.toDateString() === today.toDateString();
      }).length;

      const completedMissions = todayMissions.filter(m => m.status === 'COMPLETED');
      const completionRate = todayMissions.length > 0
        ? (completedMissions.length / todayMissions.length) * 100
        : 0;

      const report: MissionCompletionReport = {
        reportDate: today,
        totalStudents: students.length,
        completedToday,
        completionRate,
        averagePointsEarned: completedMissions.length > 0
          ? completedMissions.reduce((sum, m) => sum + (m.points || 0), 0) / completedMissions.length
          : 0,
        streakDistribution: [],
        popularMissionTypes: []
      };

      logger.debug('[AdminService] Mission completion report generated');
      return report;
    } catch (error) {
      logger.error('[AdminService] Error getting mission completion report', { error });
      throw new Error('Failed to generate mission completion report');
    }
  },

  /**
   * Log admin action
   * @param log - Action log details
   */
  async logAdminAction(log: Partial<AdminActionLog>): Promise<void> {
    try {
      const actionLog: AdminActionLog = {
        id: `log_${Date.now()}`,
        adminId: 'system',
        action: log.action || 'GENERATE_REPORT',
        targetId: log.targetId,
        timestamp: new Date(),
        details: log.details || {},
        status: log.status || 'SUCCESS',
        errorMessage: log.errorMessage
      };

      await idb.addRecord('adminLogs', actionLog);
      logger.debug('[AdminService] Admin action logged', { action: actionLog.action });
    } catch (error) {
      logger.error('[AdminService] Error logging admin action', { error });
    }
  }
};
