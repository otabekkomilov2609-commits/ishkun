import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import RoleGuard from '@/components/RoleGuard';
import { LanguageProvider } from '@/lib/i18n';
import { ThemeProvider } from 'next-themes';
// Auth pages
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import OAuthConsent from '@/pages/OAuthConsent';
// App pages
import Home from '@/pages/Home';
import Onboarding from '@/pages/Onboarding';
import Profile from '@/pages/Profile';
import AdminPanel from '@/pages/AdminPanel';
import EmployerDashboard from '@/pages/employer/EmployerDashboard';
import CompanyProfile from '@/pages/employer/CompanyProfile';
import LegalCompanyProfile from '@/pages/employer/LegalCompanyProfile';
import IndividualCompanyProfile from '@/pages/employer/IndividualCompanyProfile';
import CreateShift from '@/pages/employer/CreateShift';
import MyShifts from '@/pages/employer/MyShifts';
import EmployerShiftDetail from '@/pages/employer/EmployerShiftDetail';
import EditShift from '@/pages/employer/EditShift';
import WorkerDashboard from '@/pages/worker/WorkerDashboard';
import WorkerShiftDetail from '@/pages/worker/WorkerShiftDetail';
import MyApplications from '@/pages/worker/MyApplications';
import Verification from '@/pages/Verification';
import PageTransition from '@/components/PageTransition';
import ErrorBoundary from '@/components/ErrorBoundary';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      {/* Auth */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/oauth/consent" element={<OAuthConsent />} />

      {/* Authenticated */}
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route path="/" element={<PageTransition><Home /></PageTransition>} />
        <Route path="/onboarding" element={<PageTransition><Onboarding /></PageTransition>} />
        <Route element={<Layout />}>
          {/* Worker */}
          <Route path="/worker" element={<RoleGuard roles={['worker']}><WorkerDashboard /></RoleGuard>} />
          <Route path="/worker/applications" element={<RoleGuard roles={['worker']}><MyApplications /></RoleGuard>} />
          <Route path="/worker/shifts/:id" element={<RoleGuard roles={['worker']}><WorkerShiftDetail /></RoleGuard>} />
          {/* Employer */}
          <Route path="/employer" element={<RoleGuard roles={['employer']}><EmployerDashboard /></RoleGuard>} />
          <Route path="/employer/shifts" element={<RoleGuard roles={['employer']}><MyShifts /></RoleGuard>} />
          <Route path="/employer/shifts/new" element={<RoleGuard roles={['employer']}><CreateShift /></RoleGuard>} />
          <Route path="/employer/shifts/:id" element={<RoleGuard roles={['employer']}><EmployerShiftDetail /></RoleGuard>} />
          <Route path="/employer/shifts/:id/edit" element={<RoleGuard roles={['employer']}><EditShift /></RoleGuard>} />
          <Route path="/employer/company" element={<RoleGuard roles={['employer']}><CompanyProfile /></RoleGuard>} />
          <Route path="/employer/company/legal" element={<RoleGuard roles={['employer']}><LegalCompanyProfile /></RoleGuard>} />
          <Route path="/employer/company/individual" element={<RoleGuard roles={['employer']}><IndividualCompanyProfile /></RoleGuard>} />
          {/* Admin */}
          <Route path="/admin" element={<RoleGuard allowAdmin><AdminPanel /></RoleGuard>} />
          {/* Shared */}
          <Route path="/profile" element={<Profile />} />
          <Route path="/verification" element={<Verification />} />
        </Route>
      </Route>

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <Router>
            <LanguageProvider>
              <ScrollToTop />
              <ErrorBoundary>
                <AuthenticatedApp />
              </ErrorBoundary>
            </LanguageProvider>
          </Router>
          <Toaster />
        </ThemeProvider>
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App