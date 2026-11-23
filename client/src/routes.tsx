import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout.js';
import { RequireRole } from './auth/RequireRole.js';
import { LoginPage } from './pages/LoginPage.js';
import { Discover } from './pages/student/Discover.js';
import { ProjectAssistant } from './pages/student/ProjectAssistant.js';
import { EquipmentDetail } from './pages/student/EquipmentDetail.js';
import { NewRequest } from './pages/student/NewRequest.js';
import { MyRequests } from './pages/student/MyRequests.js';
import { ReviewQueue } from './pages/faculty/ReviewQueue.js';
import { ReviewDetail } from './pages/faculty/ReviewDetail.js';
import { Utilisation } from './pages/admin/Utilisation.js';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      {/* Authenticated Layout */}
      <Route
        path="/"
        element={
          <RequireRole>
            <Layout />
          </RequireRole>
        }
      >
        <Route index element={<Navigate to="/discover" replace />} />

        {/* Student Routes */}
        <Route path="discover" element={<Discover />} />
        <Route path="assistant" element={<ProjectAssistant />} />
        <Route path="equipment/:id" element={<EquipmentDetail />} />
        <Route path="requests/new" element={<NewRequest />} />
        <Route path="requests" element={<MyRequests />} />

        {/* Faculty Routes */}
        <Route
          path="review"
          element={
            <RequireRole allowedRoles={['faculty', 'admin']}>
              <ReviewQueue />
            </RequireRole>
          }
        />
        <Route
          path="review/:id"
          element={
            <RequireRole allowedRoles={['faculty', 'admin']}>
              <ReviewDetail />
            </RequireRole>
          }
        />

        {/* Admin Routes */}
        <Route
          path="admin"
          element={
            <RequireRole allowedRoles={['admin']}>
              <Utilisation />
            </RequireRole>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/discover" replace />} />
    </Routes>
  );
};
