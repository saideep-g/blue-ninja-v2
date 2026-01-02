import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { NinjaProvider, useNinja } from './context/NinjaContext';
import { BlueNinjaTheme } from './theme/themeConfig';

// Components
import Login from './components/auth/Login';
import StudentApp from './components/student/StudentApp';
import CurriculumViewer from './components/curriculum/CurriculumViewer';
import TemplateWorkbench from './components/templates/TemplateWorkbench';
import UserProfile from './components/profile/UserProfile';
import MobileQuestDashboard from './components/student/dashboard/MobileQuestDashboard';
import StudyEraDashboard from './components/student/dashboard/StudyEraDashboard';
import StudyEraProfile from './components/profile/StudyEraProfile';

// Routes
import AdminRoutes from './routes/AdminRoutes';
import TablesFeature from './features/multiplication-tables/TablesFeature';

// Data
import coreCurriculum from './data/cbse7_core_curriculum_v3.json';
import templateLibrary from './data/template_library_v3.json';
import assessmentGuide from './data/cbse7_assessment_guide_v3.json';

/**
 * Validates role and Redirects to appropriate dashboard.
 */
function RootRedirector() {
  const { user, userRole, loading, ninjaStats } = useNinja();

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-blue-50">
      <div className="animate-pulse text-4xl">🌊</div>
    </div>
  );

  if (!user) return <Login />;

  // --- SIMULATION OVERRIDE ---
  // If Test Lab Config exists, bypass Role Check and force Student View
  const simConfig = localStorage.getItem('BLUE_NINJA_SIM_CONFIG');
  if (simConfig) {
    console.log('🧪 Simulation Mode Detect - Forcing Student View');
    return <StudentApp />;
  }
  // ---------------------------

  if (userRole === 'ADMIN') return <Navigate to="/admin" replace />;
  // Redirect Teacher/Parent to their specific views within the Admin/Analytics module
  if (userRole === 'TEACHER') return <Navigate to="/admin/analytics" replace />;
  if (userRole === 'PARENT') return <Navigate to="/admin/users" replace />;

  if (userRole === 'STUDENT') {
    // Check for assigned layout
    if (ninjaStats?.layout === 'mobile-quest-v1') {
      return <MobileQuestDashboard />;
    }
    if (ninjaStats?.layout === 'study-era') {
      return <StudyEraDashboard />;
    }
    return <StudentApp />;
  }

  console.warn('Unknown role:', userRole);
  return <div className="p-8 text-center text-red-600">Unknown User Role: {userRole}</div>;
}

function ProfileRedirector() {
  const { ninjaStats } = useNinja();
  if (ninjaStats?.layout === 'study-era') return <StudyEraProfile />;
  return <UserProfile />;
}

export default function App() {
  // Global Theme Init
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--color-primary', BlueNinjaTheme.colors.primary);
    root.style.setProperty('--color-accent', BlueNinjaTheme.colors.accent);
    root.style.setProperty('--color-surface', BlueNinjaTheme.colors.surface);
    root.style.setProperty('--color-text', BlueNinjaTheme.colors.text);
    root.style.setProperty('--color-card', BlueNinjaTheme.colors.card);
  }, []);

  return (
    <Router>
      <NinjaProvider>

        <Routes>
          {/* Main Entry Point - Handles Role Check */}
          <Route path="/" element={<RootRedirector />} />

          {/* Admin Module - Delegated Routing */}
          <Route path="/admin/*" element={<AdminRoutes />} />

          <Route path="/tables/*" element={<TablesFeature />} />

          <Route
            path="/curriculum"
            element={
              <CurriculumViewer
                coreCurriculum={coreCurriculum as any}
                templateLibrary={templateLibrary as any}
                assessmentGuide={assessmentGuide as any}
              />
            }
          />
          <Route path="/template/:templateId" element={<TemplateWorkbench />} />
          <Route path="/profile" element={<ProfileRedirector />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </NinjaProvider>
    </Router>
  );
}