import { useState } from 'react';
import { Link } from 'react-router-dom';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { Loader2, Mail, ArrowLeft } from 'lucide-react';

const schema = z.object({
  email: z.string().email('Invalid email address'),
});

const ForgotPassword = () => {
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, data.email);
      toast.success('Password reset link sent to your email!');
    } catch (error) {
      console.error(error);
      toast.error('Failed to send reset link. Please check your email.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
        <Link to="/login" className="inline-flex items-center text-sm text-slate-500 hover:text-primary transition-colors mb-6">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Login
        </Link>
        
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Reset Password</h1>
          <p className="text-slate-500 mt-1">Enter your email and we'll send you a link to reset your password.</p>
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

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2 bg-primary hover:bg-primary/90 text-white font-semibold rounded-lg shadow-md transition-colors disabled:opacity-50 flex items-center justify-center"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send Reset Link'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ForgotPassword;
