import { create } from 'zustand';

const useAuthStore = create((set) => ({
  user: null,
  userProfile: null,
  loading: true,
  setUser: (user) => set({ user }),
  setUserProfile: (profile) => set({ userProfile: profile }),
  setLoading: (loading) => set({ loading }),
  logout: () => set({ user: null, userProfile: null, loading: false }),
}));

export default useAuthStore;
