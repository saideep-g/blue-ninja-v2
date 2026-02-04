import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { NinjaProvider, useNinja } from './context/NinjaContext';
import { ThemeProvider } from './theme/provider';

// Lazy Loaded Components for Code Splitting
const Login = lazy(() => import('./components/auth/Login'));
const StudentApp = lazy(() => import('./components/student/StudentApp'));
const CurriculumViewer = lazy(() => import('./components/curriculum/CurriculumViewer'));
const TemplateWorkbench = lazy(() => import('./components/templates/TemplateWorkbench'));
const UserProfile = lazy(() => import('./components/profile/UserProfile'));
const MobileQuestDashboard = lazy(() => import('./components/student/dashboard/MobileQuestDashboard'));
const StudyEraDashboard = lazy(() => import('./components/student/dashboard/StudyEraDashboard'));
const StudyEraProfile = lazy(() => import('./components/profile/StudyEraProfile'));
const StudentProfileLayout = lazy(() => import('./components/student/profile/StudentProfileLayout'));

// Routes
const AdminRoutes = lazy(() => import('./routes/AdminRoutes'));
const TablesFeature = lazy(() => import('./features/multiplication-tables/TablesFeature'));

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
  // Use new Phase 1 profile for Study Era students
  if (ninjaStats?.layout === 'study-era') return <StudentProfileLayout />;
  return <UserProfile />;
}

export default function App() {
  return (
    <Router>
      <ThemeProvider>
        <NinjaProvider>

          <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-blue-50">
              <div className="animate-pulse text-4xl">🌊</div>
            </div>
          }>
            <Routes>
              {/* Main Entry Point - Handles Role Check and Nested Student Routes */}
              <Route path="/*" element={<RootRedirector />} />

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
          </Suspense>
        </NinjaProvider>
      </ThemeProvider>
    </Router>
  );
}