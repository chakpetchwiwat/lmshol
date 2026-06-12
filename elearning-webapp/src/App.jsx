import React from 'react';
import { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Layouts
const UserLayout = React.lazy(() => import('./components/layout/UserLayout'));
const AdminLayout = React.lazy(() => import('./components/layout/AdminLayout'));

// Auth Pages
const Login = React.lazy(() => import('./pages/auth/Login'));
const Logout = React.lazy(() => import('./pages/auth/Logout'));

// User Pages
const Home = React.lazy(() => import('./pages/user/Home'));
const CourseList = React.lazy(() => import('./pages/user/CourseList'));
const BookmarkedCourses = React.lazy(() => import('./pages/user/BookmarkedCourses'));
const CompletedCourses = React.lazy(() => import('./pages/user/CompletedCourses'));
const CourseDetail = React.lazy(() => import('./pages/user/CourseDetail'));
const LessonPlayer = React.lazy(() => import('./pages/user/LessonPlayer'));
const AnnouncementPlayer = React.lazy(() => import('./pages/user/AnnouncementPlayer'));
const Rewards = React.lazy(() => import('./pages/user/Rewards'));
const PointsHistory = React.lazy(() => import('./pages/user/PointsHistory'));
const Profile = React.lazy(() => import('./pages/user/Profile'));
const OngoingCourses = React.lazy(() => import('./pages/user/OngoingCourses'));
const GoalDetail = React.lazy(() => import('./pages/user/GoalDetail'));
const PrintReportPage = React.lazy(() => import('./pages/common/PrintReportPage'));
const CertificateVerification = React.lazy(() => import('./pages/common/CertificateVerification'));
const DownloadFilePage = React.lazy(() => import('./pages/common/DownloadFilePage'));
const UserPermissionGuide = React.lazy(() => import('./pages/common/UserPermissionGuide'));

// Admin Pages
const AdminDashboard = React.lazy(() => import('./pages/admin/Dashboard'));
const AdminCourses = React.lazy(() => import('./pages/admin/CourseManagement'));
const AdminCompetencies = React.lazy(() => import('./pages/admin/CompetencyManagement'));
const AdminAnnouncements = React.lazy(() => import('./pages/admin/AnnouncementManagement'));
const AdminUsers = React.lazy(() => import('./pages/admin/UserManagement'));
const AdminRewards = React.lazy(() => import('./pages/admin/RewardsManagement'));
const AdminRedeems = React.lazy(() => import('./pages/admin/RedeemRequests'));
const AdminReports = React.lazy(() => import('./pages/admin/Reports'));
const AdminGoals = React.lazy(() => import('./pages/admin/GoalManagement'));
const AdminHealth = React.lazy(() => import('./pages/admin/SystemHealth'));
const CertificationMonitor = React.lazy(() => import('./pages/admin/CertificationMonitor'));
const AssessmentGrading = React.lazy(() => import('./pages/admin/AssessmentGrading'));
const CohortTracking = React.lazy(() => import('./pages/admin/CohortTracking'));

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

function App() {
  const hasToken = typeof window !== 'undefined' && !!localStorage.getItem('token');

  return (
    <LanguageProvider>
      <ToastProvider>
        <Suspense fallback={<LoadingFallback />}>
      <Routes>
        {/* Root Redirect - Check for existing session */}
        <Route path="/" element={
          hasToken ? (
            <Navigate to="/user/home" replace />
          ) : <Navigate to="/login" replace />
        } />
        
        {/* Auth */}
        <Route path="/login" element={<Login />} />
        <Route path="/logout" element={<Logout />} />
        <Route path="/print/report/:reportId" element={<PrintReportPage />} />
        <Route path="/certificates/verify/:token" element={<CertificateVerification />} />
        <Route path="/user-permission-guide" element={<UserPermissionGuide />} />

        {/* User Area */}
        <Route element={<ProtectedRoute allowedRoles={['user', 'admin', 'manager']} />}>
          <Route path="/download-file" element={<DownloadFilePage />} />
          <Route path="/user" element={<UserLayout />}>
            <Route index element={<Navigate to="home" replace />} />
            <Route path="home" element={<Home />} />
            <Route path="courses" element={<CourseList />} />
            <Route path="bookmarks" element={<BookmarkedCourses />} />
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
            <Route path="cohort-tracking" element={<CohortTracking />} />
            <Route path="courses" element={<AdminCourses />} />
            <Route path="competencies" element={<AdminCompetencies />} />
            <Route path="announcements" element={<AdminAnnouncements />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="rewards" element={<AdminRewards />} />
            <Route path="redeems" element={<AdminRedeems />} />
            <Route path="reports" element={<AdminReports />} />
            <Route path="goals" element={<AdminGoals />} />
            <Route path="certificates" element={<CertificationMonitor />} />
            <Route path="assessments" element={<AssessmentGrading />} />
            <Route path="health" element={<AdminHealth />} />
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
