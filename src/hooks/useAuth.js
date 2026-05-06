import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import useAuthStore from '../store/authStore';

export const useAuth = () => {
  const { setUser, setUserProfile, setLoading } = useAuthStore();

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setUser(user);
      
      if (user) {
        // Listen to user profile changes in real-time
        const unsubscribeProfile = onSnapshot(doc(db, 'users', user.uid), (doc) => {
          if (doc.exists()) {
            setUserProfile(doc.data());
          } else {
            setUserProfile(null);
          }
          setLoading(false);
        }, (error) => {
          console.error("Error fetching user profile:", error);
          setLoading(false);
        });

        return () => unsubscribeProfile();
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, [setUser, setUserProfile, setLoading]);
};
