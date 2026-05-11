import { useState, useEffect } from 'react';
import MainLayout from '../../components/shared/MainLayout';
import { db } from '../../lib/firebase';
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  serverTimestamp
} from 'firebase/firestore';
import {
  Plus,
  Trash2,
  Building2,
  Layers,
  Settings2,
  Search,
  ChevronRight,
  AlertCircle,
  Loader2,
  Check,
  Smartphone
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { format } from 'date-fns';
import { toast } from 'sonner';

const SystemManagement = () => {
  const [faculties, setFaculties] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('faculties');
  const [searchTerm, setSearchTerm] = useState('');
  const [syncStatus, setSyncStatus] = useState({ required: false, lastSync: null });
  const [currentSession, setCurrentSession] = useState('2025/2026');
  const [isSavingSession, setIsSavingSession] = useState(false);

  // Form states
  const [newFacultyName, setNewFacultyName] = useState('');
  const [newDeptName, setNewDeptName] = useState('');
  const [selectedFaculty, setSelectedFaculty] = useState(null);
  const [newUnitId, setNewUnitId] = useState('');
  const [newUnitName, setNewUnitName] = useState('');

  useEffect(() => {
    const unsubFaculties = onSnapshot(collection(db, 'faculties'), (snap) => {
      setFaculties(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubUnits = onSnapshot(collection(db, 'units'), (snap) => {
      setUnits(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    // Listen for sync status - Separated to avoid aggregator conflicts
    const unsubConfig = onSnapshot(doc(db, 'system_config', 'status'), {
      next: (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          const lastUpdate = data.last_update?.toDate?.() || new Date(0);
          const lastSync = data.last_sync?.toDate?.() || new Date(0);
          setSyncStatus({
            required: lastUpdate > lastSync,
            lastSync: lastSync.getTime() === 0 ? null : lastSync
          });
        }
      }
    });

    const unsubSettings = onSnapshot(doc(db, 'system_config', 'settings'), (snap) => {
      if (snap.exists()) {
        setCurrentSession(snap.data().current_session || '2025/2026');
      }
    });

    return () => {
      unsubFaculties();
      unsubUnits();
      unsubConfig();
      unsubSettings();
    };
  }, []);

  const triggerUpdate = async () => {
    await setDoc(doc(db, 'system_config', 'status'), {
      last_update: serverTimestamp()
    }, { merge: true });
  };

  const handleAddFaculty = async (e) => {
    e.preventDefault();
    if (!newFacultyName) return;
    try {
      await setDoc(doc(db, 'faculties', newFacultyName), {
        name: newFacultyName,
        departments: [],
        created_at: serverTimestamp()
      });
      await triggerUpdate();
      setNewFacultyName('');
      toast.success('Faculty added successfully');
    } catch (error) {
      toast.error('Error adding faculty');
    }
  };

  const handleAddDepartment = async (facultyId) => {
    if (!newDeptName) return;
    try {
      await updateDoc(doc(db, 'faculties', facultyId), {
        departments: arrayUnion(newDeptName)
      });
      await triggerUpdate();
      setNewDeptName('');
      toast.success('Department added');
    } catch (error) {
      toast.error('Error adding department');
    }
  };

  const handleDeleteDepartment = async (facultyId, deptName) => {
    if (!confirm(`Remove department "${deptName}"?`)) return;
    try {
      await updateDoc(doc(db, 'faculties', facultyId), {
        departments: arrayRemove(deptName)
      });
      await triggerUpdate();
      toast.success('Department removed');
    } catch (error) {
      toast.error('Error removing department');
    }
  };

  const handleDeleteFaculty = async (facultyId) => {
    if (!confirm(`Delete faculty "${facultyId}" and all its departments?`)) return;
    try {
      await deleteDoc(doc(db, 'faculties', facultyId));
      await triggerUpdate();
      toast.success('Faculty deleted');
    } catch (error) {
      toast.error('Error deleting faculty');
    }
  };
  const handleAddUnit = async (e) => {
    e.preventDefault();
    if (!newUnitId || !newUnitName) return;
    try {
      await setDoc(doc(db, 'units', newUnitId.toLowerCase().replace(/ /g, '_')), {
        id: newUnitId.toLowerCase().replace(/ /g, '_'),
        name: newUnitName.toUpperCase(),
        created_at: serverTimestamp()
      });
      await triggerUpdate();
      setNewUnitId('');
      setNewUnitName('');
      toast.success('Unit added successfully');
    } catch (error) {
      toast.error('Error adding unit');
    }
  };

  const handleDeleteUnit = async (unitId) => {
    if (!confirm(`Remove unit "${unitId}"?`)) return;
    try {
      await deleteDoc(doc(db, 'units', unitId));
      await triggerUpdate();
      toast.success('Unit removed');
    } catch (error) {
      toast.error('Error removing unit');
    }
  };

  const handleUpdateSession = async (e) => {
    e.preventDefault();
    setIsSavingSession(true);
    try {
      await setDoc(doc(db, 'system_config', 'settings'), {
        current_session: currentSession,
        updated_at: serverTimestamp()
      }, { merge: true });
      toast.success('University session updated');
    } catch (error) {
      toast.error('Error updating session');
    } finally {
      setIsSavingSession(false);
    }
  };

  if (loading) {
    return (
      <MainLayout title="System Management">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="System Management">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Sync Status Banner */}
        <div className={cn(
          "p-6 rounded-3xl border transition-all duration-500 flex flex-col sm:flex-row items-center justify-between gap-6",
          syncStatus.required
            ? "bg-amber-50 border-amber-200 shadow-lg shadow-amber-200/20"
            : "bg-white border-slate-100 shadow-sm"
        )}>
          <div className="flex items-center gap-4">
            <div className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center transition-colors",
              syncStatus.required ? "bg-amber-200 text-amber-700" : "bg-green-50 text-green-600"
            )}>
              {syncStatus.required ? <AlertCircle className="w-6 h-6 animate-pulse" /> : <Check className="w-6 h-6" />}
            </div>
            <div>
              <h3 className={cn("font-bold text-lg", syncStatus.required ? "text-amber-900" : "text-slate-900")}>
                {syncStatus.required ? "Authentication Sync Required" : "System in Sync"}
              </h3>
              <p className="text-sm text-slate-500">
                {syncStatus.required
                  ? "Database structure has changed. Please run the sync script to update staff accounts."
                  : `Last synchronized: ${syncStatus.lastSync ? format(syncStatus.lastSync, 'PPP p') : 'Never'}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {syncStatus.required && (
              <div className="hidden lg:block bg-slate-900 text-slate-400 px-4 py-2 rounded-xl text-xs font-mono">
                node seed-auth.cjs
              </div>
            )}
            <button
              disabled={!syncStatus.required}
              onClick={() => {
                toast.info("Open your terminal and run: node seed-auth.cjs");
              }}
              className={cn(
                "px-8 py-3 rounded-2xl font-bold transition-all flex items-center gap-2",
                syncStatus.required
                  ? "bg-amber-600 text-white hover:bg-amber-700 shadow-lg shadow-amber-600/20"
                  : "bg-slate-100 text-slate-400 cursor-not-allowed"
              )}
            >
              <Smartphone className="w-4 h-4" />
              Authenticate Sync
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-slate-100 p-1.5 rounded-2xl w-fit">
          <button
            onClick={() => setActiveTab('faculties')}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'faculties' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
          >
            Faculties & Departments
          </button>
          <button
            onClick={() => setActiveTab('units')}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'units' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
          >
            University Units
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'settings' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
          >
            Global Settings
          </button>
        </div>

        {activeTab === 'faculties' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left: Add Faculty */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                <h3 className="font-bold text-slate-900 mb-4 flex items-center">
                  <Plus className="w-4 h-4 mr-2 text-primary" /> Add New Faculty
                </h3>
                <form onSubmit={handleAddFaculty} className="space-y-4">
                  <input
                    type="text"
                    value={newFacultyName}
                    onChange={(e) => setNewFacultyName(e.target.value)}
                    placeholder="Faculty Name (e.g. Law)"
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <button className="w-full bg-primary text-white py-2 rounded-lg font-bold hover:bg-primary/90 transition-colors">
                    Create Faculty
                  </button>
                </form>
              </div>

              <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100">
                <h4 className="font-bold text-blue-900 flex items-center mb-2">
                  <AlertCircle className="w-4 h-4 mr-2" /> Note
                </h4>
                <p className="text-xs text-blue-700 leading-relaxed">
                  Adding a faculty or department here makes it available for students during signup.
                  Remember to run the auth script if you need a corresponding staff account.
                </p>
              </div>
            </div>

            {/* Right: List & Departments */}
            <div className="lg:col-span-2 space-y-4">
              {faculties.map((fac) => (
                <div key={fac.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="p-6 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-slate-100 shadow-sm">
                        <Building2 className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900">{fac.name}</h4>
                        <p className="text-xs text-slate-500">{fac.departments?.length || 0} Departments</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteFaculty(fac.id)}
                      className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="p-6">
                    <div className="flex flex-wrap gap-2 mb-6">
                      {fac.departments?.map((dept) => (
                        <span
                          key={dept}
                          className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-semibold flex items-center group"
                        >
                          {dept}
                          <button
                            onClick={() => handleDeleteDepartment(fac.id, dept)}
                            className="ml-2 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-all"
                          >
                            <Plus className="w-3 h-3 rotate-45" />
                          </button>
                        </span>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="New Department Name..."
                        className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleAddDepartment(fac.id);
                          }
                        }}
                        onChange={(e) => setNewDeptName(e.target.value)}
                      />
                      <button
                        onClick={() => handleAddDepartment(fac.id)}
                        className="p-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'units' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Add Unit */}
            <div className="lg:col-span-1">
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                <h3 className="font-bold text-slate-900 mb-4 flex items-center">
                  <Layers className="w-4 h-4 mr-2 text-primary" /> Add New Unit
                </h3>
                <form onSubmit={handleAddUnit} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Unit ID (Slug)</label>
                    <input
                      type="text"
                      value={newUnitId}
                      onChange={(e) => setNewUnitId(e.target.value)}
                      placeholder="e.g. clinic"
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Display Name</label>
                    <input
                      type="text"
                      value={newUnitName}
                      onChange={(e) => setNewUnitName(e.target.value)}
                      placeholder="e.g. UNIVERSITY CLINIC"
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <button className="w-full bg-primary text-white py-2 rounded-lg font-bold hover:bg-primary/90 transition-colors">
                    Create Unit
                  </button>
                </form>
              </div>
            </div>

            {/* List Units */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Unit ID</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Display Name</th>
                      <th className="px-6 py-4 text-right"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {units.map((unit) => (
                      <tr key={unit.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <code className="text-xs bg-slate-100 px-2 py-1 rounded font-mono">{unit.id}</code>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-bold text-slate-700">{unit.name}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleDeleteUnit(unit.id)}
                            className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="max-w-md mx-auto">
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm ring-1 ring-slate-200/50">
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-6">University Lifecycle</h3>
              <form onSubmit={handleUpdateSession} className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Active Academic Session</label>
                  <input
                    type="text"
                    value={currentSession}
                    onChange={(e) => setCurrentSession(e.target.value)}
                    placeholder="e.g. 2025/2026"
                    className="w-full px-6 py-4 bg-slate-50 border border-transparent rounded-2xl focus:bg-white focus:border-primary/20 outline-none transition-all font-bold text-slate-900"
                  />
                  <p className="mt-2 text-[10px] text-slate-400 font-medium leading-relaxed">
                    This session will be automatically assigned to all new student registrations.
                  </p>
                </div>
                <button
                  disabled={isSavingSession}
                  className="w-full py-4 bg-primary text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center"
                >
                  {isSavingSession ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply Session Update'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default SystemManagement;
