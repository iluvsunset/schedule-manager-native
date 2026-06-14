import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import { doc, onSnapshot, deleteDoc } from 'firebase/firestore';
import { signInWithCustomToken } from 'firebase/auth';
import { db, auth } from '../firebase';
import { getApiBase, isNative } from '../platform';
import { openUrl } from '@tauri-apps/plugin-opener';

const containerVariants = {
  hidden: { opacity: 1 },
  visible: { 
    opacity: 1, 
    transition: { staggerChildren: 0.1 } 
  },
  exit: { 
    opacity: 0, 
    scale: 0.96, 
    transition: { ease: [0.16, 1, 0.3, 1], duration: 0.2 } 
  }
};

const itemVariants = {
  hidden: { y: 0, opacity: 1 },
  visible: { 
    y: 0, 
    opacity: 1, 
    transition: { ease: [0.16, 1, 0.3, 1], duration: 0.4 } 
  }
};

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const [showResetFlow, setShowResetFlow] = useState(false);
  const { login, signup, loginWithGoogle, resetPassword } = useAuth();

  const [googleRedirecting, setGoogleRedirecting] = useState(false);
  
  const generateSessionId = () => {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
      return window.crypto.randomUUID();
    }
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  };
  
  const [sessionId, setSessionId] = useState(generateSessionId);
  const unsubscribeRef = useRef(null);

  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setResetMessage('');
    setShowResetFlow(false);
    try {
      if (isSignUp) {
        await signup(email, password);
      } else {
        await login(email, password);
      }
    } catch (err) {
      if (isSignUp && err.code === 'auth/email-already-in-use') {
        setError("This email is already registered. To add a password, please click below to receive a password setup link.");
        setShowResetFlow(true);
      } else {
        setError(err.message);
      }
    }
  };

  const handleResetPassword = async () => {
    try {
      await resetPassword(email);
      setResetMessage("Password reset link sent! Check your email.");
      setShowResetFlow(false);
      setError('');
    } catch (err) {
      setError("Failed to send reset email: " + err.message);
    }
  };

  const handleGoogleClick = async (e) => {
    e.preventDefault();
    if (googleRedirecting) {
      return;
    }
    setError('');
    setGoogleRedirecting(true);

    try {
      const url = isNative()
        ? `${getApiBase()}/api/native-google-auth?state=${import.meta.env.DEV ? 'dev' : 'prod'}`
        : `${getApiBase()}/api/native-google-auth?sessionId=${sessionId}`;
      
      if (isNative()) {
        try {
          await openUrl(url);
        } catch (e) {
          console.error("Tauri plugin-opener failed:", e);
          window.open(url, '_blank');
        }
      } else {
        window.open(url, '_blank');
      }
    } catch (err) {
      console.warn("Tauri shell open failed, falling back to window.open", err);
      const fallbackUrl = isNative()
        ? `${getApiBase()}/api/native-google-auth?state=${import.meta.env.DEV ? 'dev' : 'prod'}`
        : `${getApiBase()}/api/native-google-auth?sessionId=${sessionId}`;
      window.open(fallbackUrl, '_blank');
    }

    if (!isNative()) {
      const unsub = onSnapshot(doc(db, 'auth_sessions', sessionId), async (docSnap) => {
        try {
          if (docSnap.exists() && docSnap.data().token) {
            unsub();
            unsubscribeRef.current = null;
            await signInWithCustomToken(auth, docSnap.data().token);
            deleteDoc(doc(db, 'auth_sessions', sessionId)).catch(err => console.warn('Cleanup skipped:', err));
          }
        } catch (err) {
          unsub();
          unsubscribeRef.current = null;
          setError(err.message);
          setGoogleRedirecting(false);
          setSessionId(generateSessionId());
        }
      }, (err) => {
        unsub();
        unsubscribeRef.current = null;
        setError(err.message);
        setSessionId(generateSessionId());
      });
      unsubscribeRef.current = unsub;
    }
  };

  return (
    <div id="loginScreen" className="screen active" style={{display: 'flex'}}>
      <div className="login-mesh"></div>
      <div className="grid-pattern"></div>
      
      <div className="login-container">
        <motion.div 
          className="login-card"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          <motion.div className="login-brand" variants={itemVariants}>
            <div className="brand-logo" style={{background: 'transparent'}}>
              <img src="/favicon.svg" alt="Chronos Logo" style={{width: 24, height: 24, borderRadius: 6, objectFit: 'cover'}} />
            </div>
            <h1>Chronos</h1>
            <p>Sign in to your dashboard</p>
          </motion.div>

          {error && <motion.div variants={itemVariants} className="login-error" style={{ animation: 'horizontal-shake 0.3s ease-in-out' }}>{error}</motion.div>}
          {resetMessage && <motion.div variants={itemVariants} className="login-success">{resetMessage}</motion.div>}

          <motion.form onSubmit={handleSubmit} variants={itemVariants}>
            <div className="form-group">
              <label>Email</label>
              <input 
                type="email" 
                placeholder="name@example.com" 
                required 
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input 
                type="password" 
                placeholder="••••••••" 
                required 
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-primary btn-full">
              {isSignUp ? 'Create Account' : 'Sign In'}
            </button>
            {showResetFlow && (
              <button 
                type="button" 
                onClick={handleResetPassword} 
                className="btn btn-secondary btn-full" 
                style={{marginTop: '12px'}}
              >
                Send Password Setup Link
              </button>
            )}
          </motion.form>

          <motion.div className="login-divider" variants={itemVariants}>or continue with</motion.div>

          <motion.button
            type="button"
            onClick={handleGoogleClick}
            disabled={googleRedirecting}
            className="btn-google"
            variants={itemVariants}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textDecoration: 'none',
              pointerEvents: googleRedirecting ? 'none' : 'auto',
              opacity: googleRedirecting ? 0.5 : 1,
              cursor: googleRedirecting ? 'default' : 'pointer'
            }}
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" style={{width: 20, height: 20, marginRight: 12}} />
            {googleRedirecting ? 'Opening Browser...' : 'Sign in with Google'}
          </motion.button>

          <motion.div className="login-footer" variants={itemVariants}>
            <button onClick={() => setIsSignUp(!isSignUp)} style={{background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'inherit', fontSize: '14px'}}>
              {isSignUp ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
            </button>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
