import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { Loader2, Mail, Lock } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const Login = () => {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, data.email, data.password);
      toast.success('Login successful!');
      // Redirection logic is handled by App.jsx based on user role
    } catch (error) {
      console.error(error);
      toast.error('Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-2xl mb-4">
            <img src="/logo.svg" alt="ClearanceIQ" className="w-10 h-10" onError={(e) => e.target.src = 'https://ui-avatars.com/api/?name=CQ&background=2563EB&color=fff'} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 font-sans">ClearanceIQ</h1>
          <p className="text-slate-500 mt-1">Student Clearance Management System</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                {...register('email')}
                type="email"
                placeholder="university@email.edu"
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              />
            </div>
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                {...register('password')}
                type="password"
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              />
            </div>
            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
          </div>

          <div className="flex items-center justify-end">
            <Link to="/forgot-password" replace className="text-sm font-medium text-primary hover:underline">
              Forgot Password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2 bg-primary hover:bg-primary/90 text-white font-semibold rounded-lg shadow-md transition-colors disabled:opacity-50 flex items-center justify-center"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign In'}
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-slate-500">
          <p className="text-slate-500">
            New student? <Link to="/signup/student" className="text-primary font-bold hover:underline">Create account</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
