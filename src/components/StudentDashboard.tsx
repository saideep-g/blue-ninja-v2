/**
 * StudentDashboard Component
 * 
 * Main dashboard view for student users showing:
 * - Greeting and current status
 * - Streak tracking with milestones
 * - Daily mission progress
 * - Skill level badge
 * - Quick statistics
 * - Recent activity
 * - 30-day progress chart
 * 
 * @component
 */

import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store/auth';
import { useProfileStore } from '../store/profile';
import { missionsService } from '../services/missions';
import { diagnosticAssessmentService } from '../services/assessments/diagnostic';
import { logger } from '../services/logging';
import '../styles/StudentDashboard.css';

interface DashboardData {
  todayMissions: any[];
  streak: any;
  stats: any;
  skillLevel: any;
  recentActivity: any[];
  badges: any[];
  loading: boolean;
  error: string | null;
}

/**
 * StudentDashboard Component
 * Displays comprehensive learning dashboard for student
 */
export const StudentDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const { userProfile } = useProfileStore();
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    todayMissions: [],
    streak: null,
    stats: null,
    skillLevel: null,
    recentActivity: [],
    badges: [],
    loading: true,
    error: null,
  });

  /**
   * Load dashboard data on mount and when user changes
   */
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        if (!user?.uid) {
          logger.warn('[StudentDashboard] No user found', { userId: user?.uid });
          return;
        }

        logger.info('[StudentDashboard] Loading data for user', { userId: user.uid });

        // Load today's missions
        const todayMissions = await missionsService.getTodayMissions(user.uid);
        logger.debug('[StudentDashboard] Loaded today missions', { count: todayMissions.length });

        // Load streak information
        const streak = await missionsService.getStreak(user.uid);
        logger.debug('[StudentDashboard] Loaded streak info', { current: streak?.current, longest: streak?.longest });

        // Load statistics
        const stats = await missionsService.getMissionStats(user.uid, 30);
        logger.debug('[StudentDashboard] Loaded stats', { completionRate: stats?.completionRate });

        // Load skill level from latest assessment
        const skillLevel = await diagnosticAssessmentService.getLatestSkillLevel(user.uid);
        logger.debug('[StudentDashboard] Loaded skill level', { level: skillLevel?.level });

        setDashboardData((prev) => ({
          ...prev,
          todayMissions,
          streak,
          stats,
          skillLevel,
          loading: false,
          error: null,
        }));
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to load dashboard';
        logger.error('[StudentDashboard] Error loading data', { error: errorMessage });
        setDashboardData((prev) => ({
          ...prev,
          loading: false,
          error: errorMessage,
        }));
      }
    };

    loadDashboardData();
  }, [user]);

  if (dashboardData.loading) {
    return (
      <div className="dashboard-container">
        <div className="loading-spinner">Loading your dashboard...</div>
      </div>
    );
  }

  if (dashboardData.error) {
    return (
      <div className="dashboard-container">
        <div className="error-message">Error: {dashboardData.error}</div>
      </div>
    );
  }

  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="dashboard-container">
      {/* Header Section */}
      <section className="dashboard-header">
        <div className="greeting-section">
          <h1 className="greeting-title">Welcome back, {userProfile?.name || 'Student'}! 👋</h1>
          <p className="current-date">{currentDate}</p>
        </div>
        <div className="header-actions">
          <button className="btn-theme-toggle">🌙 Toggle Theme</button>
        </div>
      </section>

      {/* Main Content Grid */}
      <div className="dashboard-grid">
        {/* Left Column: Streak & Missions */}
        <div className="dashboard-left-column">
          {/* Streak Card */}
          <section className="card streak-card">
            <div className="streak-header">
              <h2>🔥 Your Streak</h2>
              <span className="streak-flame">
                {dashboardData.streak?.current || 0}
              </span>
            </div>
            <div className="streak-content">
              <div className="streak-stat">
                <span className="stat-label">Current Streak</span>
                <span className="stat-value">{dashboardData.streak?.current || 0} days</span>
              </div>
              <div className="streak-stat">
                <span className="stat-label">Longest Streak</span>
                <span className="stat-value">{dashboardData.streak?.longest || 0} days</span>
              </div>
            </div>
            <div className="streak-progress">
              <p>Keep going! Complete 7 days for Week Warrior badge 🏅</p>
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${Math.min((dashboardData.streak?.current || 0) / 7 * 100, 100)}%` }}
                />
              </div>
            </div>
          </section>

          {/* Daily Missions Section */}
          <section className="card missions-section">
            <h2 className="section-title">📋 Today's Missions</h2>
            <div className="missions-grid">
              {dashboardData.todayMissions.map((mission) => (
                <div key={mission.id} className={`mission-card mission-${mission.status}`}>
                  <div className="mission-header">
                    <h3 className="mission-title">{mission.title}</h3>
                    <span className={`mission-badge mission-${mission.difficulty}`}>
                      {mission.difficulty}
                    </span>
                  </div>
                  <div className="mission-content">
                    <p className="mission-description">{mission.description}</p>
                    <div className="mission-meta">
                      <span className="mission-questions">{mission.questions} questions</span>
                      <span className="mission-points">{mission.points} pts</span>
                    </div>
                  </div>
                  <div className="mission-footer">
                    <button className="btn-primary btn-sm">Start Mission</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="missions-summary">
              <p>
                <strong>{dashboardData.todayMissions.filter((m) => m.status === 'COMPLETED').length}/5</strong> missions completed
              </p>
            </div>
          </section>
        </div>

        {/* Right Column: Stats & Skill Level */}
        <div className="dashboard-right-column">
          {/* Skill Level Badge */}
          <section className="card skill-level-card">
            <div className="skill-header">
              <h2>⭐ Your Skill Level</h2>
            </div>
            <div className="skill-badge-large">
              <div className={`skill-badge skill-${dashboardData.skillLevel?.level?.toLowerCase() || 'beginner'}`}>
                {dashboardData.skillLevel?.level || 'NOT ASSESSED'}
              </div>
            </div>
            <div className="skill-progress">
              <p className="skill-description">
                {dashboardData.skillLevel?.level === 'BEGINNER' && 'You\'re just starting. Keep practicing!'}
                {dashboardData.skillLevel?.level === 'INTERMEDIATE' && 'Great progress! You\'re on your way!'}
                {dashboardData.skillLevel?.level === 'ADVANCED' && 'Excellent! You\'re mastering the content!'}
              </p>
              <p className="last-assessment">
                Last assessment: {dashboardData.skillLevel?.lastAssessmentDate || 'Not yet taken'}
              </p>
              <button className="btn-secondary btn-block">Take New Assessment</button>
            </div>
          </section>

          {/* Quick Stats */}
          <section className="card quick-stats-card">
            <h2 className="section-title">📊 Quick Stats</h2>
            <div className="stats-grid">
              <div className="stat-box">
                <div className="stat-icon">📚</div>
                <div className="stat-info">
                  <span className="stat-label">Total Missions</span>
                  <span className="stat-value">{dashboardData.stats?.totalCompleted || 0}</span>
                </div>
              </div>
              <div className="stat-box">
                <div className="stat-icon">⚡</div>
                <div className="stat-info">
                  <span className="stat-label">Total Points</span>
                  <span className="stat-value">{dashboardData.stats?.totalPoints || 0}</span>
                </div>
              </div>
              <div className="stat-box">
                <div className="stat-icon">✅</div>
                <div className="stat-info">
                  <span className="stat-label">Completion Rate</span>
                  <span className="stat-value">{Math.round(dashboardData.stats?.completionRate || 0)}%</span>
                </div>
              </div>
              <div className="stat-box">
                <div className="stat-icon">🏆</div>
                <div className="stat-info">
                  <span className="stat-label">Badges Earned</span>
                  <span className="stat-value">{dashboardData.streak?.badges?.length || 0}</span>
                </div>
              </div>
            </div>
          </section>

          {/* Recent Badges */}
          {dashboardData.streak?.badges && dashboardData.streak.badges.length > 0 && (
            <section className="card badges-card">
              <h2 className="section-title">🏅 Recent Badges</h2>
              <div className="badges-container">
                {dashboardData.streak.badges.slice(0, 3).map((badge) => (
                  <div key={badge.id} className="badge-item" title={badge.name}>
                    <span className="badge-emoji">{badge.emoji}</span>
                    <span className="badge-date">{new Date(badge.earnedAt).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
