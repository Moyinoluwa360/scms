import { useState } from 'react';
import MainLayout from '../../components/shared/MainLayout';
import useAuthStore from '../../store/authStore';
import { 
  User, 
  Bell, 
  Shield, 
  Smartphone,
  Globe,
  Moon,
  Check
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';

const Settings = () => {
  const { userProfile } = useAuthStore();
  const [activeTab, setActiveTab] = useState('account');

  const tabs = [
    { id: 'account', label: 'Account', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
  ];

  return (
    <MainLayout title="Settings">
      <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-8">
        {/* Sidebar Tabs */}
        <div className="w-full md:w-64 shrink-0 space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "w-full flex items-center space-x-3 px-4 py-3 rounded-2xl transition-all duration-200 font-bold text-sm",
                  activeTab === tab.id 
                    ? "bg-primary text-white shadow-lg shadow-primary/20" 
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                <Icon className="w-5 h-5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-white rounded-3xl border border-slate-100 shadow-sm p-8">
          {activeTab === 'account' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-1">Account Information</h3>
                <p className="text-sm text-slate-500">Update your basic office information and profile visibility.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 block">Full Name / Office Title</label>
                  <input 
                    defaultValue={userProfile?.full_name}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 block">Email Address</label>
                  <input 
                    disabled
                    defaultValue={userProfile?.email}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-slate-400 cursor-not-allowed"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 block">Department / Unit</label>
                  <input 
                    disabled
                    defaultValue={userProfile?.department?.replace('_', ' ').toUpperCase()}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-slate-400 cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="flex justify-end border-t border-slate-50 pt-6">
                <button 
                  onClick={() => toast.success('Changes saved!')}
                  className="px-8 py-2.5 bg-primary text-white font-bold rounded-xl shadow-lg hover:bg-primary/90 transition-all"
                >
                  Save Changes
                </button>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-1">Notification Preferences</h3>
                <p className="text-sm text-slate-500">Decide which alerts you want to receive on your dashboard.</p>
              </div>

              <div className="space-y-4">
                {[
                  { id: 'new_student', label: 'New Student in Queue', desc: 'Get alerted when a student requests clearance.' },
                  { id: 'rejections', label: 'Rejection Alerts', desc: 'Notify me when another department rejects a student I cleared.' },
                  { id: 'system', label: 'System Updates', desc: 'Important news about the ClearanceIQ platform.' },
                ].map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                    <div>
                      <p className="font-bold text-slate-900">{item.label}</p>
                      <p className="text-xs text-slate-500">{item.desc}</p>
                    </div>
                    <div className="w-12 h-6 bg-primary rounded-full relative cursor-pointer shadow-inner">
                      <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-8 animate-in fade-in duration-300">
               <div>
                <h3 className="text-xl font-bold text-slate-900 mb-1">Security Settings</h3>
                <p className="text-sm text-slate-500">Protect your office account from unauthorized access.</p>
              </div>

              <div className="space-y-6">
                <div className="p-6 border border-slate-100 rounded-3xl flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                      <Shield className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">Two-Factor Authentication</p>
                      <p className="text-xs text-slate-500">Add an extra layer of security to your login.</p>
                    </div>
                  </div>
                  <button className="text-sm font-bold text-primary px-4 py-2 bg-primary/5 rounded-xl hover:bg-primary/10 transition-colors">
                    Enable
                  </button>
                </div>

                <div className="p-6 border border-slate-100 rounded-3xl flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-600">
                      <Smartphone className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">Trusted Devices</p>
                      <p className="text-xs text-slate-500">Manage devices that can bypass 2FA.</p>
                    </div>
                  </div>
                  <button className="text-sm font-bold text-slate-500">Manage</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default Settings;
