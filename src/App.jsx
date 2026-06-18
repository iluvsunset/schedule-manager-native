import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx';
import { AnimatePresence } from 'framer-motion';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import AdminPanel from './pages/AdminPanel.jsx';
import SyncStatusIndicator from './components/SyncStatusIndicator.jsx';
import NotificationManager from './components/NotificationManager.jsx';
import UpdateModal from './components/UpdateModal.jsx';

function AnimatedRoutes() {
  const location = useLocation();
  const { currentUser } = useAuth();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {!currentUser ? (
          <Route path="*" element={<Login />} />
        ) : (
          <>
            <Route path="/" element={<Dashboard />} />
            <Route path="/admin" element={<AdminPanel />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        )}
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AnimatedRoutes />
        <SyncStatusIndicator />
        <NotificationManager />
        <UpdateModal />
      </Router>
    </AuthProvider>
  );
}

export default App;
