import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';

export default function RoleGuard({ roles, children, fallback = '/' }) {
  const { user } = useAuth();
  if (!user) return <Navigate to={fallback} replace />;
  if (!roles.includes(user.role || 'worker')) return <Navigate to={fallback} replace />;
  return children;
}