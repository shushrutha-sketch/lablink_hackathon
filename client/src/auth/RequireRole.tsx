import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext.js';
import { Role } from '../lib/types.js';

interface RequireRoleProps {
  children: React.ReactNode;
  allowedRoles?: Role[];
}

export const RequireRole: React.FC<RequireRoleProps> = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-500 font-medium">Loading LabLink session...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // If student tries to access faculty, redirect to discover; if faculty tries admin, redirect to review
    const fallback = user.role === 'student' ? '/discover' : user.role === 'faculty' ? '/review' : '/admin';
    return <Navigate to={fallback} replace />;
  }

  return <>{children}</>;
};
