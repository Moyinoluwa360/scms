import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import { auth } from '../../lib/firebase';
import { LogOut, Clock, ShieldAlert } from 'lucide-react';

const PendingApproval = () => {
  const { userProfile } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    // If account becomes active, redirect to home which will then route to correct dashboard
    if (userProfile?.account_status === 'active') {
      navigate('/', { replace: true });
    }
  }, [userProfile, navigate]);

  const handleLogout = () => {
    auth.signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full text-center bg-white p-10 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 animate-in fade-in zoom-in duration-500">
        <div className="w-20 h-20 bg-amber-50 rounded-3xl flex items-center justify-center mx-auto mb-8 relative">
          <Clock className="w-10 h-10 text-amber-500 animate-pulse" />
          <div className="absolute -top-2 -right-2">
             <div className="w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center border-4 border-white shadow-sm">
                <ShieldAlert className="w-3 h-3 text-white" />
             </div>
          </div>
        </div>
        
        <h1 className="text-2xl font-bold text-slate-900 mb-3 tracking-tight">Account Pending Approval</h1>
        <p className="text-slate-500 text-sm leading-relaxed mb-10">
          Hello <span className="font-bold text-slate-900">{userProfile?.full_name}</span>, your staff account is currently being reviewed by the administrator. 
          You will gain access to the clearance portal once approved.
        </p>

        <div className="space-y-4">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-500 font-medium">
            Status: <span className="text-amber-600 uppercase font-bold ml-1">Pending Review</span>
          </div>
          
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-3 text-slate-500 font-semibold hover:text-red-500 transition-colors"
          >
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>

        <div className="mt-8 flex flex-col items-center opacity-40 grayscale">
          <img 
            src="https://run.edu.ng/wp-content/uploads/2024/09/cropped-colored-logo-300x83.png" 
            alt="Redeemer's University" 
            className="h-6 w-auto object-contain"
          />
          <p className="mt-2 text-[8px] text-slate-400 uppercase tracking-widest font-bold">Clearance System</p>
        </div>
      </div>
    </div>
  );
};

export default PendingApproval;
