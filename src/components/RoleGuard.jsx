import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';

export default function RoleGuard({ roles, allowAdmin = false, children, fallback = '/' }) {
  const { user } = useAuth();
  if (!user) return <Navigate to={fallback} replace />;
  if (allowAdmin && user.role === 'admin') return children;
  if (roles && roles.includes(user.account_type)) return children;
  return <Navigate to={fallback} replace />;
}