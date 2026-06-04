import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { canAccessAdminPanel } from '../../utils/roles';

const ProtectedRoute = ({ allowedRoles = [] }) => {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  const location = useLocation();
  
  if (!token || !userStr) {
    return <Navigate to="/login" replace />;
  }

  const user = JSON.parse(userStr);

  if (user.mustChangePassword && location.pathname !== '/user/profile') {
    return <Navigate to="/user/profile" replace state={{ forcePasswordChange: true }} />;
  }

  const isAdminRoute = allowedRoles.includes('admin') || allowedRoles.includes('manager');

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    // Check if user has Tier-based admin access for admin routes
    if (isAdminRoute && canAccessAdminPanel(user)) {
      return <Outlet />;
    }

    // Redirect to appropriate home page based on overall access
    return canAccessAdminPanel(user)
      ? <Navigate to="/admin/dashboard" replace />
      : <Navigate to="/user/home" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
