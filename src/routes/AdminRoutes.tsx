import React from 'react';
import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import AdminLayout from '../components/admin/layout/AdminLayout';
import AdminHome from '../components/admin/dashboard/AdminHome';
import AdminQuestionsPanel from '../components/admin/AdminQuestionsPanel';
import AnalyticsLogViewer from '../components/admin/AnalyticsLogViewer';
import TeacherAnalyticsDashboard from '../components/admin/TeacherAnalyticsDashboard';
import UserManagementDashboard from '../components/admin/UserManagementDashboard';
import { AdminBundleManager } from '../components/admin/AdminBundleManager';
import TestLab from '../components/admin/TestLab';
import { MigrationDashboard } from '../features/questions/admin/MigrationDashboard';
import { TemplateManager } from '../features/questions/admin/TemplateManager';
import QuestionBundleCreator from '../components/admin/QuestionBundleCreator';

export default function AdminRoutes() {
    return (
        <Routes>
            <Route element={
                <ProtectedRoute requiredRole="admin">
                    <AdminLayout />
                </ProtectedRoute>
            }>
                <Route index element={<AdminHome />} />
                <Route path="questions" element={<AdminQuestionsPanel />} />
                <Route path="bundles" element={<AdminBundleManager />} />
                <Route path="logs" element={<AnalyticsLogViewer />} />
                <Route path="analytics" element={<TeacherAnalyticsDashboard />} />
                <Route path="users" element={<UserManagementDashboard />} />
                <Route path="test-lab" element={<TestLab />} />
                <Route path="migration" element={<MigrationDashboard />} />
                <Route path="templates" element={<TemplateManager />} />
                <Route path="question-bundles" element={<QuestionBundleCreator />} />
            </Route>
        </Routes>
    );
}
