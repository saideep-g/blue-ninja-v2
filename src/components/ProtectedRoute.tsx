import React from 'react';
import { Navigate } from 'react-router-dom';
import { useNinja } from '../context/NinjaContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'student' | 'teacher' | 'admin';
}

export function ProtectedRoute({
  children,
  requiredRole,
}: ProtectedRouteProps): React.ReactNode {
  // Use NinjaContext instead of legacy auth store
  const { user, loading, userRole } = useNinja();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Validate Role if specified
  if (requiredRole && requiredRole.toUpperCase() !== userRole) {
    return <Navigate to="/" replace />;
  }

  return (
    <>
      {children}
    </>
  );
}

export default ProtectedRoute;
