import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';

export default function Home() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'admin') return <Navigate to="/admin" replace />;
  if (!user.onboarded && !user.account_type) return <Navigate to="/onboarding" replace />;
  return <Navigate to={user.account_type === 'employer' ? '/employer' : '/worker'} replace />;
}