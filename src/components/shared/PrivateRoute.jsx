import { Navigate, useLocation } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import { auth } from '../../lib/firebase';

const PrivateRoute = ({ children, allowedRoles }) => {
  const { user, userProfile, loading } = useAuthStore();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!userProfile && !loading) {
    // If we have a user but no profile yet, wait or logout if it's definitely gone
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (userProfile?.account_status === 'pending' && location.pathname !== '/pending-approval') {
    return <Navigate to="/pending-approval" replace />;
  }

  if (userProfile?.account_status === 'suspended') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
        <h1 className="text-2xl font-bold text-red-600 mb-2">Account Suspended</h1>
        <p className="text-gray-600">Your account has been suspended. Please contact the administrator.</p>
        <button 
          onClick={() => auth.signOut()}
          className="mt-4 px-4 py-2 bg-primary text-white rounded-md"
        >
          Logout
        </button>
      </div>
    );
  }

  const dashboardMap = {
    student: '/student/dashboard',
    department_staff: '/staff/dashboard',
    admin: '/admin/dashboard',
  };

  if (allowedRoles && !allowedRoles.includes(userProfile?.role)) {
    const targetPath = dashboardMap[userProfile?.role] || '/';
    if (location.pathname === targetPath) return children;
    return <Navigate to={targetPath} replace />;
  }

  return children;
};

export default PrivateRoute;
