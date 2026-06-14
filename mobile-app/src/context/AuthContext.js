import React, { createContext, useState, useEffect, useContext } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../services/firebase';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthInitialized, setIsAuthInitialized] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      setIsAuthInitialized(true);
      if (authUser) {
        setUser(authUser);
        try {
          const userRef = doc(db, 'allowed_users', authUser.email.toLowerCase());
          
          // Use onSnapshot for real-time role updates (matches app.js)
          const unsubSnapshot = onSnapshot(userRef, (snap) => {
            let userRole = null;
            let isKicked = false;

            if (snap.exists()) {
              const data = snap.data();
              userRole = data.role ? data.role.toLowerCase().trim() : null;
              if (data.forceLogoutAt) {
                const logoutTime = data.forceLogoutAt.toDate().getTime();
                if (Date.now() - logoutTime < 60000) isKicked = true;
              }
            }

            // IT Override
            if (authUser.email.toLowerCase() === 'bao.h0146824@gmail.com') {
              userRole = 'it';
            }

            if (!userRole || isKicked) {
              signOut(auth);
              setUser(null);
              setRole(null);
            } else {
              setRole(userRole);
            }
            setLoading(false);
          });

          return () => unsubSnapshot();
        } catch (error) {
          console.error("Role fetch error:", error);
          setLoading(false);
        }
      } else {
        setUser(null);
        setRole(null);
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const logout = () => signOut(auth);

  return (
    <AuthContext.Provider value={{ user, role, loading: loading || !isAuthInitialized, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
