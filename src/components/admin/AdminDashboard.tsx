/**
 * Admin Dashboard Component
 * Provides comprehensive admin panel for managing students, questions, and analytics
 */

import React, { useEffect, useState } from 'react';
import { adminService } from '../../services/admin';
import { logger } from '../../services/logging';
import type {
  AdminAnalytics,
  StudentInfo,
  QuestionStats,
  AdminFilterOptions,
  StudentProgressReport
} from '../../types/admin';
import '../../styles/admin/AdminDashboard.css';

type TabType = 'OVERVIEW' | 'STUDENTS' | 'QUESTIONS' | 'REPORTS';

interface AdminDashboardState {
  loading: boolean;
  error: string | null;
  analytics: AdminAnalytics | null;
  students: StudentInfo[];
  questions: QuestionStats[];
  selectedStudentReport: StudentProgressReport | null;
}

/**
 * Admin Dashboard Component
 * Displays comprehensive admin analytics and management tools
 */
export const AdminDashboard: React.FC = () => {
  const [state, setState] = useState<AdminDashboardState>({
    loading: true,
    error: null,
    analytics: null,
    students: [],
    questions: [],
    selectedStudentReport: null
  });

  const [activeTab, setActiveTab] = useState<TabType>('OVERVIEW');
  const [filters, setFilters] = useState<AdminFilterOptions>({ limit: 20, offset: 0 });
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Load dashboard data
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        logger.info('[AdminDashboard] Loading dashboard data');
        setState(prev => ({ ...prev, loading: true, error: null }));

        // Load analytics
        const analytics = await adminService.getAnalyticsOverview();
        const students = await adminService.getStudentList(filters);
        const questions = await adminService.getQuestionStats();

        setState(prev => ({
          ...prev,
          analytics,
          students,
          questions,
          loading: false
        }));

        logger.info('[AdminDashboard] Dashboard data loaded successfully');
      } catch (error) {
        logger.error('[AdminDashboard] Error loading dashboard', { error });
        setState(prev => ({
          ...prev,
          error: (error as Error).message,
          loading: false
        }));
      }
    };

    loadDashboardData();
  }, [filters]);

  // Handle student report generation
  const handleGenerateStudentReport = async (studentId: string) => {
    try {
      logger.info('[AdminDashboard] Generating student report', { studentId });
      const report = await adminService.getStudentProgressReport(studentId, 30);
      setState(prev => ({ ...prev, selectedStudentReport: report }));
      setSelectedStudent(studentId);
    } catch (error) {
      logger.error('[AdminDashboard] Error generating student report', { error });
      setState(prev => ({
        ...prev,
        error: 'Failed to generate student report'
      }));
    }
  };

  // Handle student reset
  const handleResetStudent = async (studentId: string) => {
    try {
      if (!window.confirm('Are you sure? This will reset all student progress.')) {
        return;
      }
      logger.info('[AdminDashboard] Resetting student progress', { studentId });
      await adminService.resetStudentProgress(studentId);
      setState(prev => ({
        ...prev,
        students: prev.students.map(s =>
          s.id === studentId
            ? { ...s, progressSummary: { ...s.progressSummary, totalPoints: 0, streak: 0 } }
            : s
        )
      }));
    } catch (error) {
      logger.error('[AdminDashboard] Error resetting student', { error });
      setState(prev => ({
        ...prev,
        error: 'Failed to reset student progress'
      }));
    }
  };

  // Handle student status change
  const handleSetStudentStatus = async (
    studentId: string,
    status: 'ACTIVE' | 'INACTIVE' | 'BLOCKED'
  ) => {
    try {
      logger.info('[AdminDashboard] Setting student status', { studentId, status });
      await adminService.setStudentStatus(studentId, status);
      setState(prev => ({
        ...prev,
        students: prev.students.map(s =>
          s.id === studentId ? { ...s, status } : s
        )
      }));
    } catch (error) {
      logger.error('[AdminDashboard] Error setting student status', { error });
      setState(prev => ({
        ...prev,
        error: 'Failed to update student status'
      }));
    }
  };

  // Handle question deletion
  const handleDeleteQuestion = async (questionId: string) => {
    try {
      if (!window.confirm('Are you sure? This action cannot be undone.')) {
        return;
      }
      logger.info('[AdminDashboard] Deleting question', { questionId });
      await adminService.deleteQuestion(questionId);
      setState(prev => ({
        ...prev,
        questions: prev.questions.filter(q => q.id !== questionId)
      }));
    } catch (error) {
      logger.error('[AdminDashboard] Error deleting question', { error });
      setState(prev => ({
        ...prev,
        error: 'Failed to delete question'
      }));
    }
  };

  // Filter students based on search
  const filteredStudents = state.students.filter(s =>
    s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (state.loading) {
    return (
      <div className="admin-dashboard admin-loading">
        <div className="admin-loader">Loading admin dashboard...</div>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="admin-dashboard admin-error">
        <div className="admin-error-message">
          <h2>Error Loading Dashboard</h2>
          <p>{state.error}</p>
          <button onClick={() => window.location.reload()}>
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      {/* Header */}
      <header className="admin-header">
        <div className="admin-header-content">
          <h1>Blue Ninja Admin Dashboard</h1>
          <div className="admin-header-meta">
            <span className="admin-badge">Admin View</span>
            <span className="admin-time">{new Date().toLocaleDateString()}</span>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="admin-nav">
        <button
          className={`admin-nav-button ${activeTab === 'OVERVIEW' ? 'active' : ''}`}
          onClick={() => setActiveTab('OVERVIEW')}
        >
          📊 Overview
        </button>
        <button
          className={`admin-nav-button ${activeTab === 'STUDENTS' ? 'active' : ''}`}
          onClick={() => setActiveTab('STUDENTS')}
        >
          👥 Students ({state.students.length})
        </button>
        <button
          className={`admin-nav-button ${activeTab === 'QUESTIONS' ? 'active' : ''}`}
          onClick={() => setActiveTab('QUESTIONS')}
        >
          ❓ Questions ({state.questions.length})
        </button>
        <button
          className={`admin-nav-button ${activeTab === 'REPORTS' ? 'active' : ''}`}
          onClick={() => setActiveTab('REPORTS')}
        >
          📈 Reports
        </button>
      </nav>

      {/* Content */}
      <main className="admin-content">
        {/* Overview Tab */}
        {activeTab === 'OVERVIEW' && state.analytics && (
          <div className="admin-overview">
            <h2>System Overview</h2>

            {/* Key Metrics */}
            <div className="admin-metrics-grid">
              <div className="admin-metric-card">
                <h3>Total Students</h3>
                <p className="admin-metric-value">{state.analytics.totalStudents}</p>
                <p className="admin-metric-label">All registered students</p>
              </div>

              <div className="admin-metric-card">
                <h3>Active Students</h3>
                <p className="admin-metric-value">{state.analytics.activeStudents}</p>
                <p className="admin-metric-label">Last 7 days</p>
              </div>

              <div className="admin-metric-card">
                <h3>Total Questions</h3>
                <p className="admin-metric-value">{state.analytics.totalQuestions}</p>
                <p className="admin-metric-label">In question bank</p>
              </div>

              <div className="admin-metric-card">
                <h3>Average Accuracy</h3>
                <p className="admin-metric-value">{state.analytics.averageAccuracy.toFixed(1)}%</p>
                <p className="admin-metric-label">System-wide</p>
              </div>

              <div className="admin-metric-card">
                <h3>Missions Completed</h3>
                <p className="admin-metric-value">{state.analytics.totalMissionsCompleted}</p>
                <p className="admin-metric-label">All time</p>
              </div>
            </div>

            {/* Popular Topics */}
            <div className="admin-section">
              <h3>Popular Topics</h3>
              <div className="admin-topics-list">
                {state.analytics.mostPopularTopics.map((topic, idx) => (
                  <div key={idx} className="admin-topic-item">
                    <div className="admin-topic-name">{topic.topic}</div>
                    <div className="admin-topic-stats">
                      <span>{topic.count} uses</span>
                      <span>{topic.accuracy.toFixed(1)}% accuracy</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Success Rate by Difficulty */}
            <div className="admin-section">
              <h3>Success Rate by Difficulty</h3>
              <div className="admin-difficulty-grid">
                {state.analytics.successRateByDifficulty.map((difficulty) => (
                  <div key={difficulty.difficulty} className="admin-difficulty-card">
                    <h4>{difficulty.difficulty}</h4>
                    <div className="admin-difficulty-bar">
                      <div
                        className="admin-difficulty-fill"
                        style={{ width: `${difficulty.successRate}%` }}
                      />
                    </div>
                    <p>{difficulty.successRate.toFixed(1)}% ({difficulty.correctAttempts}/{difficulty.totalAttempts})</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Students Tab */}
        {activeTab === 'STUDENTS' && (
          <div className="admin-students">
            <h2>Student Management</h2>

            {/* Search Bar */}
            <div className="admin-search-box">
              <input
                type="text"
                placeholder="Search students by name or email..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="admin-search-input"
              />
            </div>

            {/* Students Table */}
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Grade</th>
                    <th>Status</th>
                    <th>Last Login</th>
                    <th>Avg Score</th>
                    <th>Missions</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map(student => (
                    <tr key={student.id} className={`admin-row ${student.status.toLowerCase()}`}>
                      <td className="admin-cell-name">{student.name}</td>
                      <td>{student.email}</td>
                      <td>{student.grade}</td>
                      <td>
                        <select
                          value={student.status}
                          onChange={e =>
                            handleSetStudentStatus(
                              student.id,
                              e.target.value as 'ACTIVE' | 'INACTIVE' | 'BLOCKED'
                            )
                          }
                          className={`admin-status-select ${student.status.toLowerCase()}`}
                        >
                          <option value="ACTIVE">Active</option>
                          <option value="INACTIVE">Inactive</option>
                          <option value="BLOCKED">Blocked</option>
                        </select>
                      </td>
                      <td>{new Date(student.lastLogin).toLocaleDateString()}</td>
                      <td>{student.averageScore.toFixed(1)}%</td>
                      <td>{student.totalAssessments}</td>
                      <td className="admin-actions">
                        <button
                          onClick={() => handleGenerateStudentReport(student.id)}
                          className="admin-btn-small admin-btn-primary"
                          title="View detailed report"
                        >
                          Report
                        </button>
                        <button
                          onClick={() => handleResetStudent(student.id)}
                          className="admin-btn-small admin-btn-warning"
                          title="Reset all progress"
                        >
                          Reset
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Student Report Modal */}
            {state.selectedStudentReport && (
              <div className="admin-modal-overlay" onClick={() => setState(prev => ({ ...prev, selectedStudentReport: null }))}>
                <div className="admin-modal" onClick={e => e.stopPropagation()}>
                  <div className="admin-modal-header">
                    <h3>{state.selectedStudentReport.studentName} - Progress Report</h3>
                    <button
                      className="admin-modal-close"
                      onClick={() => setState(prev => ({ ...prev, selectedStudentReport: null }))}
                    >
                      ✕
                    </button>
                  </div>

                  <div className="admin-modal-body">
                    <div className="admin-report-section">
                      <h4>Assessment Statistics</h4>
                      <p>Completed: {state.selectedStudentReport.assessmentStats.totalCompleted}</p>
                      <p>Average Score: {state.selectedStudentReport.assessmentStats.averageScore.toFixed(1)}%</p>
                    </div>

                    <div className="admin-report-section">
                      <h4>Mission Statistics</h4>
                      <p>Completed: {state.selectedStudentReport.missionStats.totalCompleted}</p>
                      <p>Completion Rate: {state.selectedStudentReport.missionStats.completionRate.toFixed(1)}%</p>
                      <p>Current Streak: {state.selectedStudentReport.missionStats.currentStreak} days</p>
                      <p>Total Points: {state.selectedStudentReport.missionStats.totalPoints}</p>
                    </div>

                    <div className="admin-report-section">
                      <h4>Topic Performance</h4>
                      {state.selectedStudentReport.topicPerformance.map((topic, idx) => (
                        <div key={idx} className="admin-topic-performance">
                          <h5>{topic.topic}</h5>
                          <p>Accuracy: {topic.accuracy.toFixed(1)}% ({topic.totalQuestions} questions)</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Questions Tab */}
        {activeTab === 'QUESTIONS' && (
          <div className="admin-questions">
            <h2>Question Management</h2>

            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Topic</th>
                    <th>Type</th>
                    <th>Difficulty</th>
                    <th>Times Used</th>
                    <th>Accuracy</th>
                    <th>Avg Time</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {state.questions.slice(0, 20).map(question => (
                    <tr key={question.id}>
                      <td>{question.topic}</td>
                      <td>{question.type}</td>
                      <td>
                        <span className={`admin-difficulty-badge ${question.difficulty?.toLowerCase()}`}>
                          {question.difficulty}
                        </span>
                      </td>
                      <td>{question.timesUsed}</td>
                      <td>{question.accuracy.toFixed(1)}%</td>
                      <td>{question.averageTime.toFixed(1)}s</td>
                      <td>{new Date(question.createdAt).toLocaleDateString()}</td>
                      <td className="admin-actions">
                        <button
                          onClick={() => handleDeleteQuestion(question.id)}
                          className="admin-btn-small admin-btn-danger"
                          title="Delete question"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Reports Tab */}
        {activeTab === 'REPORTS' && (
          <div className="admin-reports">
            <h2>Reports</h2>
            <div className="admin-report-options">
              <div className="admin-report-card">
                <h3>Student Progress Report</h3>
                <p>Detailed analytics for individual students</p>
                <button className="admin-btn-primary">Generate</button>
              </div>
              <div className="admin-report-card">
                <h3>Topic Performance Report</h3>
                <p>Analytics for specific topics across all students</p>
                <button className="admin-btn-primary">Generate</button>
              </div>
              <div className="admin-report-card">
                <h3>Mission Completion Report</h3>
                <p>Daily mission completion analytics</p>
                <button className="admin-btn-primary">Generate</button>
              </div>
              <div className="admin-report-card">
                <h3>Assessment Statistics Report</h3>
                <p>System-wide assessment metrics</p>
                <button className="admin-btn-primary">Generate</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;
