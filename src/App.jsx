import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useAuth } from './hooks/useAuth';
import useAuthStore from './store/authStore';

// Auth Pages
import Login from './pages/auth/Login';
import ForgotPassword from './pages/auth/ForgotPassword';
import StudentSignup from './pages/auth/StudentSignup';
import PendingApproval from './pages/auth/PendingApproval';

// Private Route
import PrivateRoute from './components/shared/PrivateRoute';
import StudentDashboard from './pages/student/Dashboard';
import StudentProgress from './pages/student/Progress';
import StudentProfile from './pages/student/Profile';
import StudentNotifications from './pages/student/Notifications';
import StudentCertificate from './pages/student/Certificate';
import StaffDashboard from './pages/staff/Dashboard';
import StaffQueue from './pages/staff/ClearanceQueue';
import StaffStudentDetail from './pages/staff/StudentDetail';
import StaffCleared from './pages/staff/ClearedStudents';
import StaffNotifications from './pages/staff/Notifications';
import AdminDashboard from './pages/admin/Dashboard';
import AdminStaff from './pages/admin/StaffManagement';
import AdminStudents from './pages/admin/StudentsManagement';
import SystemManagement from './pages/admin/SystemManagement';
import ClearanceOverview from './pages/admin/ClearanceOverview';
import AuditLogs from './pages/admin/AuditLogs';
import Settings from './pages/admin/Settings';

const App = () => {
  useAuth(); // Initialize auth listener
  const { user, userProfile, loading } = useAuthStore();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Toaster position="top-right" richColors />
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/" replace />} />
        <Route path="/signup/student" element={!user ? <StudentSignup /> : <Navigate to="/" replace />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/pending-approval" element={<PendingApproval />} />

        {/* Redirect Logic based on role */}
        <Route path="/" element={
          user ? (
            userProfile?.role === 'admin' ? <Navigate to="/admin/dashboard" replace /> :
            userProfile?.role === 'department_staff' ? <Navigate to="/staff/dashboard" replace /> :
            <Navigate to="/student/dashboard" replace />
          ) : <Navigate to="/login" replace />
        } />

        {/* Student Routes */}
        <Route path="/student/dashboard" element={
          <PrivateRoute allowedRoles={['student']}>
            <StudentDashboard />
          </PrivateRoute>
        } />
        <Route path="/student/progress" element={
          <PrivateRoute allowedRoles={['student']}>
            <StudentProgress />
          </PrivateRoute>
        } />
        <Route path="/student/profile" element={
          <PrivateRoute allowedRoles={['student']}>
            <StudentProfile />
          </PrivateRoute>
        } />
        <Route path="/student/notifications" element={
          <PrivateRoute allowedRoles={['student']}>
            <StudentNotifications />
          </PrivateRoute>
        } />
        <Route path="/student/certificate" element={
          <PrivateRoute allowedRoles={['student']}>
            <StudentCertificate />
          </PrivateRoute>
        } />

        {/* Staff Routes */}
        <Route path="/staff/dashboard" element={
          <PrivateRoute allowedRoles={['department_staff']}>
            <StaffDashboard />
          </PrivateRoute>
        } />
        <Route path="/staff/queue" element={
          <PrivateRoute allowedRoles={['department_staff']}>
            <StaffQueue />
          </PrivateRoute>
        } />
        <Route path="/staff/student/:requestId" element={
          <PrivateRoute allowedRoles={['department_staff']}>
            <StaffStudentDetail />
          </PrivateRoute>
        } />
        <Route path="/staff/cleared" element={
          <PrivateRoute allowedRoles={['department_staff']}>
            <StaffCleared />
          </PrivateRoute>
        } />
        <Route path="/staff/notifications" element={
          <PrivateRoute allowedRoles={['department_staff']}>
            <StaffNotifications />
          </PrivateRoute>
        } />
        <Route path="/staff/profile" element={
          <PrivateRoute allowedRoles={['department_staff']}>
            <StudentProfile />
          </PrivateRoute>
        } />

        <Route path="/admin/dashboard" element={
          <PrivateRoute allowedRoles={['admin']}>
            <AdminDashboard />
          </PrivateRoute>
        } />
        <Route path="/admin/staff" element={
          <PrivateRoute allowedRoles={['admin']}>
            <AdminStaff />
          </PrivateRoute>
        } />
        <Route path="/admin/students" element={
          <PrivateRoute allowedRoles={['admin']}>
            <AdminStudents />
          </PrivateRoute>
        } />
        <Route path="/admin/clearance" element={
          <PrivateRoute allowedRoles={['admin']}>
            <ClearanceOverview />
          </PrivateRoute>
        } />
        <Route path="/admin/logs" element={
          <PrivateRoute allowedRoles={['admin']}>
            <AuditLogs />
          </PrivateRoute>
        } />
        <Route path="/admin/system" element={
          <PrivateRoute allowedRoles={['admin']}>
            <SystemManagement />
          </PrivateRoute>
        } />
        <Route path="/admin/settings" element={
          <PrivateRoute allowedRoles={['admin', 'department_staff']}>
            <Settings />
          </PrivateRoute>
        } />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
