import { useState, useEffect } from 'react';
import MainLayout from '../../components/shared/MainLayout';
import useAuthStore from '../../store/authStore';
import { db, auth } from '../../lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  GraduationCap, 
  Loader2,
  Save,
  Key
} from 'lucide-react';
import { toast } from 'sonner';
import { updatePassword } from 'firebase/auth';

const Profile = () => {
  const { user, userProfile, setUserProfile } = useAuthStore();
  const [studentDetails, setStudentDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [phone, setPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    const fetchDetails = async () => {
      if (!user) return;
      try {
        const detailDoc = await getDoc(doc(db, 'student_details', user.uid));
        if (detailDoc.exists()) {
          setStudentDetails(detailDoc.data());
          setPhone(userProfile?.phone_number || '');
        }
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDetails();
  }, [user, userProfile]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        phone_number: phone
      });
      setUserProfile({ ...userProfile, phone_number: phone });
      toast.success('Profile updated successfully');
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    try {
      await updatePassword(auth.currentUser, newPassword);
      toast.success('Password changed successfully');
      setNewPassword('');
    } catch (error) {
      toast.error(error.message);
    }
  };

  if (isLoading) {
    return (
      <MainLayout title="Profile">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Profile">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header/Cover Section */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="h-32 bg-gradient-to-r from-primary to-blue-400" />
          <div className="px-8 pb-8">
            <div className="relative -mt-12 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
              <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6">
                <div className="relative">
                  <div className="w-32 h-32 rounded-3xl overflow-hidden border-4 border-white shadow-lg bg-slate-50 flex items-center justify-center">
                    <img 
                      src={userProfile?.profile_photo_url || `https://ui-avatars.com/api/?name=${userProfile?.full_name}&background=2563EB&color=fff`} 
                      alt="Profile" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
                <div className="text-center sm:text-left mb-2">
                  <h2 className="text-2xl font-bold text-slate-900">{userProfile?.full_name}</h2>
                  <p className="text-slate-500 font-medium">{studentDetails?.matric_number}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Basic Info */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center">
                <User className="w-5 h-5 mr-2 text-primary" /> Personal Information
              </h3>
              <form onSubmit={handleUpdateProfile} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Email Address</label>
                    <div className="flex items-center mt-1 text-slate-900 font-medium">
                      <Mail className="w-4 h-4 mr-2 text-slate-300" /> {userProfile?.email}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Phone Number</label>
                    <div className="relative mt-1">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        value={phone} 
                        onChange={(e) => setPhone(e.target.value)} 
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border-transparent border rounded-xl focus:bg-white focus:border-primary/20 outline-none transition-all"
                      />
                    </div>
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Home Address</label>
                    <div className="flex items-start mt-1 text-slate-900 font-medium">
                      <MapPin className="w-4 h-4 mr-2 mt-1 text-slate-300 flex-shrink-0" /> 
                      {studentDetails?.home_address}
                    </div>
                  </div>
                </div>
                <div className="flex justify-end pt-4">
                  <button 
                    disabled={isSaving}
                    className="flex items-center px-6 py-2 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/10 hover:bg-primary/90 transition-all disabled:opacity-50"
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                    Save Changes
                  </button>
                </div>
              </form>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center">
                <GraduationCap className="w-5 h-5 mr-2 text-primary" /> Academic Profile
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8">
                {[
                  { label: 'Faculty', value: studentDetails?.faculty },
                  { label: 'Department', value: studentDetails?.department },
                  { label: 'Level', value: studentDetails?.level },
                  { label: 'Session', value: studentDetails?.session },
                  { label: 'Mode of Entry', value: studentDetails?.mode_of_entry },
                  { label: 'Admission Year', value: studentDetails?.year_of_admission },
                ].map((item, i) => (
                  <div key={i}>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{item.label}</p>
                    <p className="text-slate-900 font-semibold">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Security */}
          <div className="space-y-8">
            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center">
                <Key className="w-5 h-5 mr-2 text-primary" /> Security
              </h3>
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">New Password</label>
                  <input 
                    type="password" 
                    value={newPassword} 
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-2 mt-1 bg-slate-50 border-transparent border rounded-xl focus:bg-white focus:border-primary/20 outline-none transition-all"
                  />
                </div>
                <button className="w-full py-2 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all">
                  Update Password
                </button>
              </form>
            </div>

            <div className="bg-primary/5 p-6 rounded-3xl border border-primary/10">
              <h4 className="text-sm font-bold text-primary mb-2">Need help?</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                If you need to change restricted fields like your Matric Number or Department, please contact the Registry department.
              </p>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Profile;
