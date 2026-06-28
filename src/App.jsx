import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx';
import { AnimatePresence, motion } from 'framer-motion';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import AdminPanel from './pages/AdminPanel.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import NotificationManager from './components/NotificationManager.jsx';
import BrowserDeprecation from './components/BrowserDeprecation.jsx';
import { isBrowser } from './platform.js';
import UpdateModal from './components/UpdateModal.jsx';

function AnimatedRoutes() {
  const location = useLocation();
  const { currentUser } = useAuth();

  return (
    <AnimatePresence mode="wait">
      {!currentUser ? (
        <motion.div
          key="login"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ 
            opacity: 0, 
            scale: 0.96,
            y: -24,
            filter: 'blur(10px)',
            transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } 
          }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          style={{ width: '100%', display: 'flex', flex: 1, flexDirection: 'column' }}
        >
          <Routes location={location} key={location.pathname}>
            <Route path="*" element={<Login />} />
          </Routes>
        </motion.div>
      ) : (
        <motion.div
          key="app"
          initial={{ opacity: 0, y: 24, scale: 1.01, filter: 'blur(5px)' }}
          animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: -24, scale: 0.99, filter: 'blur(5px)' }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          style={{ width: '100%', height: '100%' }}
        >
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/admin" element={<AdminPanel />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function App() {
  if (isBrowser()) {
    return <BrowserDeprecation />;
  }

  return (
    <AuthProvider>
      <Router>
        <AnimatedRoutes />
        <NotificationManager />
        <UpdateModal />
      </Router>
    </AuthProvider>
  );
}

export default App;
