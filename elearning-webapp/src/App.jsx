import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { canAccessAdminPanel } from './utils/roles';

// Layouts
const UserLayout = lazy(() => import('./components/layout/UserLayout'));
const AdminLayout = lazy(() => import('./components/layout/AdminLayout'));

// Auth Pages
const Login = lazy(() => import('./pages/auth/Login'));

// User Pages
const Home = lazy(() => import('./pages/user/Home'));
const CourseList = lazy(() => import('./pages/user/CourseList'));
const CompletedCourses = lazy(() => import('./pages/user/CompletedCourses'));
const CourseDetail = lazy(() => import('./pages/user/CourseDetail'));
const LessonPlayer = lazy(() => import('./pages/user/LessonPlayer'));
const AnnouncementPlayer = lazy(() => import('./pages/user/AnnouncementPlayer'));
const Rewards = lazy(() => import('./pages/user/Rewards'));
const PointsHistory = lazy(() => import('./pages/user/PointsHistory'));
const Profile = lazy(() => import('./pages/user/Profile'));
const OngoingCourses = lazy(() => import('./pages/user/OngoingCourses'));
const GoalDetail = lazy(() => import('./pages/user/GoalDetail'));
const PrintReportPage = lazy(() => import('./pages/common/PrintReportPage'));

// Admin Pages
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const AdminCourses = lazy(() => import('./pages/admin/CourseManagement'));
const AdminAnnouncements = lazy(() => import('./pages/admin/AnnouncementManagement'));
const AdminUsers = lazy(() => import('./pages/admin/UserManagement'));
const AdminRewards = lazy(() => import('./pages/admin/RewardsManagement'));
const AdminRedeems = lazy(() => import('./pages/admin/RedeemRequests'));
const AdminReports = lazy(() => import('./pages/admin/Reports'));
const AdminGoals = lazy(() => import('./pages/admin/GoalManagement'));

// Components
import ProtectedRoute from './components/auth/ProtectedRoute';

import Skeleton from './components/common/Skeleton';

// Loading Component
const LoadingFallback = () => (
  <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
    <Skeleton.Page />
  </div>
);


import { ToastProvider } from './context/ToastContext';
import { LanguageProvider } from './context/LanguageContext';

const readStoredUser = () => {
  if (typeof window === 'undefined') return null;

  try {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  } catch {
    return null;
  }
};

function App() {
  const currentUser = readStoredUser();
  const hasToken = typeof window !== 'undefined' && !!localStorage.getItem('token');

  return (
    <LanguageProvider>
      <ToastProvider>
        <Suspense fallback={<LoadingFallback />}>
      <Routes>
        {/* Root Redirect - Check for existing session */}
        <Route path="/" element={
          hasToken ? (
            canAccessAdminPanel(currentUser)
              ? <Navigate to="/admin/dashboard" replace /> 
              : <Navigate to="/user/home" replace />
          ) : <Navigate to="/login" replace />
        } />
        
        {/* Auth */}
        <Route path="/login" element={<Login />} />
        <Route path="/print/report/:reportId" element={<PrintReportPage />} />

        {/* User Area */}
        <Route element={<ProtectedRoute allowedRoles={['user', 'admin', 'manager']} />}>
          <Route path="/user" element={<UserLayout />}>
            <Route index element={<Navigate to="home" replace />} />
            <Route path="home" element={<Home />} />
            <Route path="courses" element={<CourseList />} />
            <Route path="announcements/:id" element={<AnnouncementPlayer />} />
            <Route path="ongoing" element={<OngoingCourses />} />
            <Route path="completed" element={<CompletedCourses />} />
            <Route path="courses/:id" element={<CourseDetail />} />
            <Route path="courses/:id/lesson/:lessonId" element={<LessonPlayer />} />
            <Route path="goals/:id" element={<GoalDetail />} />
            <Route path="rewards" element={<Rewards />} />
            <Route path="points-history" element={<PointsHistory />} />
            <Route path="profile" element={<Profile />} />
          </Route>
        </Route>

        {/* Admin Area */}
        <Route element={<ProtectedRoute allowedRoles={['admin', 'manager']} />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="courses" element={<AdminCourses />} />
            <Route path="announcements" element={<AdminAnnouncements />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="rewards" element={<AdminRewards />} />
            <Route path="redeems" element={<AdminRedeems />} />
            <Route path="reports" element={<AdminReports />} />
            <Route path="goals" element={<AdminGoals />} />
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<div className="p-12 text-center font-black text-slate-400">404 - ไม่พบหน้าที่คุณต้องการ</div>} />
      </Routes>
    </Suspense>
      </ToastProvider>
    </LanguageProvider>
  );
}

export default App;
