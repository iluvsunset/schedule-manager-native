import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1, 
    transition: { ease: 'easeOut', duration: 0.25 } 
  },
  exit: { 
    opacity: 0, 
    transition: { ease: 'easeIn', duration: 0.15 } 
  }
};
import { collection, query, where, or, onSnapshot, getDocs, getDoc, doc, updateDoc, deleteDoc, Timestamp, setDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import Topbar from '../components/layout/Topbar';
import Sidebar from '../components/layout/Sidebar';
import StatsRow from '../components/dashboard/StatsRow';
import ScheduleList from '../components/dashboard/ScheduleList';
import CalendarView from '../components/dashboard/CalendarView';
import GoogleCalendarView from '../components/dashboard/GoogleCalendarView';
import ClassMembersView from '../components/dashboard/ClassMembersView';
import {
  EventDetailModal,
  CreateEventModal,
  EditEventModal,
  ShareModal,
  ConfirmModal,
  GoogleSyncPromptModal
} from '../components/dashboard/Modals';
import { showMessage, sendDynamicEmail, formatTime, formatDate, syncGcalBackground } from '../utils/helpers';
import { Wrench, Megaphone } from 'lucide-react';
import WebGLBackground from '../components/WebGLBackground';
import { getWebDomain } from '../platform';

export default function Dashboard() {
  const { currentUser, userRole } = useAuth();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(() => location.state?.activeTab || 'dashboard');

  useEffect(() => {
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab);
    }
  }, [location.state?.activeTab]);

  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState(() => localStorage.getItem('schedule_context') || '');
  const [showClassOverlay, setShowClassOverlay] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Maintenance & Broadcast states
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMsg, setMaintenanceMsg] = useState('We will be back shortly.');
  const [broadcast, setBroadcast] = useState(null);
  const [isBroadcastActive, setIsBroadcastActive] = useState(false);

  // Student widgets state
  const [nextEvent, setNextEvent] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [feedback, setFeedback] = useState(null);

  // Modals state
  const [detailEvent, setDetailEvent] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editEvent, setEditEvent] = useState(null);
  const [shareEvent, setShareEvent] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [syncPromptEvent, setSyncPromptEvent] = useState(null);
  const [syncPromptOpen, setSyncPromptOpen] = useState(false);


  // 1. Fetch Classes (for Context Selector or Student Enrollment list)
  useEffect(() => {
    if (!currentUser || !userRole) return;

    const q = ['student', 'teacher'].includes(userRole)
      ? query(collection(db, 'classes'), where('participants', 'array-contains', currentUser.email.toLowerCase()))
      : query(collection(db, 'classes'));

    const unsubscribe = onSnapshot(q, (snap) => {
      const clsList = [];
      snap.forEach(d => clsList.push({ id: d.id, ...d.data() }));
      setClasses(clsList);

      if (userRole !== 'student') {
        const savedContext = localStorage.getItem('schedule_context');
        const stillHasAccess = clsList.some(c => c.id === savedContext);

        if ((!savedContext || !stillHasAccess) && clsList.length > 0) {
          if (clsList.length > 1 && !savedContext) {
            setShowClassOverlay(true);
            handleSelectClass(clsList[0].id, false);
          } else {
            handleSelectClass(clsList[0].id);
          }
        } else if (savedContext && stillHasAccess) {
          setSelectedClassId(savedContext);
        }
      }
    });

    return unsubscribe;
  }, [currentUser, userRole]);

  // 2. Fetch Schedules
  useEffect(() => {
    if (!currentUser || !userRole) return;

    let q;
    if (['it', 'academic_coordinator', 'senior_teacher'].includes(userRole)) {
      q = query(collection(db, 'schedules'));
    } else if (userRole === 'teacher') {
      // Teacher logic: retrieve schedules where teacher is participant OR creator
      q = query(collection(db, 'schedules'), 
        or(
          where('participants', 'array-contains', currentUser.email.toLowerCase()),
          where('userEmail', '==', currentUser.email.toLowerCase())
        )
      );
    } else {
      // Student logic: retrieve schedules where student is a participant
      q = query(collection(db, 'schedules'), where('participants', 'array-contains', currentUser.email.toLowerCase()));
    }

    const unsubscribe = onSnapshot(q, 
      (snap) => {
        const newSchedules = [];
        snap.forEach(d => newSchedules.push({ id: d.id, ...d.data() }));
        newSchedules.sort((a, b) => b.date?.toMillis() - a.date?.toMillis());
        setSchedules(newSchedules);
        setLoading(false);
      },
      (error) => {
        console.error("Error in schedules snapshot listener:", error);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [currentUser, userRole]);
 
  // 2b. Auto-Start & Auto-Complete Hook
  useEffect(() => {
    if (schedules.length === 0 || !currentUser) return;

    const now = new Date();
    schedules.forEach(async (s) => {
      const date = s.date ? (s.date.toDate ? s.date.toDate() : new Date(s.date)) : null;
      if (!date) return;

      // 1. Auto-Start: 'upcoming' -> 'ongoing' if event time is met/passed
      if (s.status === 'upcoming' && date <= now) {
        try {
          console.log(`[Client Auto-Scheduler] Auto-starting event: "${s.place}"`);
          await updateDoc(doc(db, 'schedules', s.id), { status: 'ongoing' });
        } catch (e) {
          console.error("Failed to auto-start schedule:", e);
        }
      }

      // 2. Auto-Complete: 'ongoing' -> 'completed' if next calendar day start is met/passed
      if (s.status === 'ongoing') {
        const nextDayStart = new Date(date);
        nextDayStart.setDate(nextDayStart.getDate() + 1);
        nextDayStart.setHours(0, 0, 0, 0); // 00:00 of the next calendar day

        if (now >= nextDayStart) {
          try {
            console.log(`[Client Auto-Scheduler] Auto-completing event: "${s.place}"`);
            await updateDoc(doc(db, 'schedules', s.id), { status: 'completed' });
          } catch (e) {
            console.error("Failed to auto-complete schedule:", e);
          }
        }
      }
    });
  }, [schedules, currentUser]);

  // 2c. Check for upcoming Google synced events to prompt the teacher
  useEffect(() => {
    if (loading || !currentUser || !userRole || schedules.length === 0) return;
    
    // Check if the user is a teacher
    const isTeacherRole = ['teacher', 'senior_teacher'].includes(userRole);
    if (!isTeacherRole) return;

    // Find upcoming/ongoing Google Calendar synced events
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const googleEvents = schedules.filter(s => 
      s.source === 'google_calendar' && 
      s.status !== 'completed' && 
      s.status !== 'cancelled'
    );

    if (googleEvents.length === 0) return;

    // Sort by date ascending (nearest first)
    googleEvents.sort((a, b) => {
      const da = a.date?.toDate ? a.date.toDate() : new Date(a.date);
      const db = b.date?.toDate ? b.date.toDate() : new Date(b.date);
      return da - db;
    });

    // Find the nearest upcoming/ongoing event starting from today
    const nearest = googleEvents.find(s => {
      const d = s.date?.toDate ? s.date.toDate() : new Date(s.date);
      return d >= startOfToday;
    });

    if (nearest) {
      // Check if this event was already dismissed/skipped
      const dismissed = localStorage.getItem(`gcal_prompt_dismissed_${nearest.id}`);
      if (!dismissed) {
        setSyncPromptEvent(nearest);
        setSyncPromptOpen(true);
      }
    }
  }, [loading, currentUser, userRole, schedules]);


  // 3. Monitor System Maintenance & Broadcast
  useEffect(() => {
    if (!currentUser) return;

    // Maintenance Toggle Listener
    const settingsRef = doc(db, 'system_settings', 'config');
    const unsubConfig = onSnapshot(settingsRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setMaintenanceMode(!!data.maintenanceMode);
        setMaintenanceMsg(data.lockdownMessage || 'We will be back shortly.');
      }
    });

    // Broadcast Listener
    const broadcastRef = doc(db, 'system_settings', 'announcements');
    const unsubAnnounce = onSnapshot(broadcastRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.timestamp && typeof data.timestamp.toMillis === 'function') {
          const msgTime = data.timestamp.toMillis();
          if (!isNaN(msgTime)) {
            const lastDismissed = localStorage.getItem('broadcast_dismissed');
            if (!lastDismissed || lastDismissed !== msgTime.toString()) {
              setBroadcast({ message: data.message, timestamp: msgTime });
              setIsBroadcastActive(true);
              try {
                // announcement chime
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(880, audioContext.currentTime + 0.1);
                gainNode.gain.setValueAtTime(0.08, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
                oscillator.start();
                oscillator.stop(audioContext.currentTime + 0.5);
              } catch (e) { }
            }
          }
        }
      }
    });

    // Online/Offline alerts
    const handleOnline = () => showMessage('Connection restored', 'success');
    const handleOffline = () => showMessage('You are offline. Checking connection...', 'error');
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      unsubConfig();
      unsubAnnounce();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [currentUser]);

  // 4. Widgets Logic (Ticking updates)
  useEffect(() => {
    if (!currentUser || schedules.length === 0) return;

    const updateWidgets = () => {
      const now = new Date();

      // Calculate Next Event
      const upcoming = schedules.filter(s => {
        const d = s.date?.toDate ? s.date.toDate() : new Date(s.date);
        return s.status === 'ongoing' || (d > now && s.status !== 'completed');
      }).sort((a, b) => (a.date?.toMillis() || 0) - (b.date?.toMillis() || 0));

      setNextEvent(upcoming.length > 0 ? upcoming[0] : null);

      if (userRole !== 'student') return; // ONLY STUDENTS GET TASKS/FEEDBACK

      // Calculate Pending Tasks
      const pendingTasksList = [];
      schedules.forEach(s => {
        let found = false;
        if (s.assignmentTask && s.assignmentTask.trim().length > 0) {
          pendingTasksList.push({
            course: s.place,
            desc: s.assignmentTask,
            date: s.assignmentDue ? new Date(s.assignmentDue) : (s.date?.toDate ? s.date.toDate() : new Date(s.date)),
            link: s.assignmentLink
          });
          found = true;
        }
        if (!found && s.notes) {
          const lower = s.notes.toLowerCase();
          if (lower.includes('due') || lower.includes('hw:') || lower.includes('homework') || lower.includes('assignment') || lower.includes('read:')) {
            pendingTasksList.push({
              course: s.place,
              desc: s.notes,
              date: s.date?.toDate ? s.date.toDate() : new Date(s.date)
            });
          }
        }
      });
      pendingTasksList.sort((a, b) => a.date - b.date);
      setTasks(pendingTasksList);

      // Calculate Feedback
      const reviews = schedules.filter(s => s.status === 'completed' && (s.reviewLearned || s.reviewNotes));
      reviews.sort((a, b) => (b.date?.toMillis() || 0) - (a.date?.toMillis() || 0));
      if (reviews.length > 0) {
        const latest = reviews[0];
        const dateStr = latest.date?.toDate ? latest.date.toDate().toLocaleDateString() : 'Recently';
        setFeedback({
          place: latest.place,
          date: dateStr,
          reviewLearned: latest.reviewLearned,
          reviewNotes: latest.reviewNotes
        });
      } else {
        setFeedback(null);
      }
    };

    updateWidgets();
    const interval = setInterval(updateWidgets, 1000);
    return () => clearInterval(interval);
  }, [currentUser, userRole, schedules]);

  // 5. Broadcast Changelog Announcement for Super Admin
  useEffect(() => {
    if (!currentUser) return;
    const email = currentUser.email?.toLowerCase();
    if (email !== 'bao.h0146824@gmail.com' && email !== 'sunsetmyfav@gmail.com') return;
    
    const hasBroadcasted = localStorage.getItem('changelog_broadcast_v0111');
    if (hasBroadcasted) return;

    const broadcastChangelog = async () => {
      try {
        const message = `🚀 v0.1.11 — Performance & System Update\n• ⚡ Performance: General stability and speed improvements across the dashboard.\n• 🔔 Notification Stabilization: Resolved background permission handshake issues to ensure notification delivery.`;

        await setDoc(doc(db, 'system_settings', 'announcements'), {
          message: message,
          timestamp: Timestamp.now()
        });
        localStorage.setItem('changelog_broadcast_v0111', 'true');
        console.log("Changelog v0.1.11 announcement broadcasted successfully!");
      } catch (err) {
        console.error("Failed to broadcast changelog from client:", err);
      }
    };

    broadcastChangelog();
  }, [currentUser]);

  const handleSelectClass = (id, closeOverlay = true) => {
    setSelectedClassId(id);
    localStorage.setItem('schedule_context', id);
    if (closeOverlay) setShowClassOverlay(false);
  };

  const handleDismissBroadcast = () => {
    setIsBroadcastActive(false);
    if (broadcast && broadcast.timestamp) {
      try {
        localStorage.setItem('broadcast_dismissed', broadcast.timestamp.toString());
      } catch (err) {
        console.error('Failed to save announcement dismissal:', err);
      }
    }
  };

  // CRUD Actions
  const handleStartSchedule = async (id) => {
    try {
      await updateDoc(doc(db, 'schedules', id), {
        status: 'ongoing',
        startedAt: Timestamp.now()
      });
      const sched = schedules.find(s => s.id === id);
      if (sched) syncGcalBackground(sched, id, 'sync');
      showMessage('Event started!', 'success');
    } catch (e) {
      showMessage(e.message, 'error');
    }
  };

  const handleCompleteSchedule = async (id) => {
    try {
      await updateDoc(doc(db, 'schedules', id), {
        status: 'completed',
        completedAt: Timestamp.now()
      });
      const sched = schedules.find(s => s.id === id);
      if (sched) syncGcalBackground(sched, id, 'sync');
      showMessage('Event completed!', 'success');
    } catch (e) {
      showMessage(e.message, 'error');
    }
  };

  const handleDeleteSchedule = async (id) => {
    setConfirmAction({
      message: 'Delete this event?',
      onConfirm: async () => {
        try {
          const sched = schedules.find(s => s.id === id);
          if (sched) syncGcalBackground(sched, id, 'delete');
          await deleteDoc(doc(db, 'schedules', id));
          showMessage('Event deleted', 'success');
        } catch (e) {
          showMessage(e.message, 'error');
        }
      }
    });
  };

  const handleCancelSchedule = async (id) => {
    setConfirmAction({
      message: 'Cancel this event? It will remain in the schedule but marked as cancelled.',
      onConfirm: async () => {
        try {
          await updateDoc(doc(db, 'schedules', id), { status: 'cancelled' });
          const sched = schedules.find(s => s.id === id);
          if (sched) syncGcalBackground(sched, id, 'delete'); // Remove cancelled from GCal
          showMessage('Event cancelled', 'success');
        } catch (e) {
          showMessage(e.message, 'error');
        }
      }
    });
  };

  const handleSendReminder = async (id) => {
    const s = schedules.find(item => item.id === id);
    if (!s) return;
    setConfirmAction({
      message: `Send email reminder for "${s.place}"?`,
      onConfirm: async () => {
        showMessage('Sending reminders...', 'success');
        try {
          const d = s.date?.toDate ? s.date.toDate() : new Date(s.date);
          const formattedDate = formatDate(d);
          const formattedTime = formatTime(d);
          const recipientEmails = s.participants || [];
          const successEmails = [];
          for (const email of recipientEmails) {
            const uSnap = await getDoc(doc(db, 'allowed_users', email.toLowerCase()));
            const role = uSnap.exists() ? uSnap.data().role : 'student';
            
            const emailData = { place: s.place, time: formattedTime, date: formattedDate, link: getWebDomain() };
            const sent = await sendDynamicEmail(currentUser, email, email.split('@')[0], `Reminder: ${s.place}`, emailData, 'schedule_reminder');
            if (sent) {
              successEmails.push(email);
            }
          }
          if (successEmails.length > 0) {
            showMessage(`Sent ${successEmails.length} reminders! To: ${successEmails.join(', ')}`, 'success');
          } else {
            showMessage('No reminders sent (all recipients have muted notifications).', 'info');
          }
        } catch (err) {
          showMessage(err.message, 'error');
        }
      }
    });
  };

  // Perform Local Schedules Filtering
  const filteredSchedules = schedules.filter(schedule => {
    // 1. Role checks
    if (userRole === 'student') {
      const isCreator = (schedule.userId === currentUser.uid || schedule.userEmail?.toLowerCase() === currentUser.email.toLowerCase());
      const isParticipant = (schedule.participants && schedule.participants.includes(currentUser.email.toLowerCase()));
      if (!isCreator && !isParticipant) return false;
    }

    // 2. Class Selector context checks (for Teachers/Admins)
    if (selectedClassId && userRole !== 'student') {
      if (schedule.classId !== selectedClassId) {
        return false;
      }
    }

    // 3. Search Bar filter
    if (searchTerm) {
      return (schedule.place || '').toLowerCase().includes(searchTerm.toLowerCase());
    }

    return true;
  });

  // Block dashboard if server lockdown is enabled
  if (maintenanceMode && userRole !== 'it') {
    return (
      <div id="maintenanceScreen" className="screen active" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-root)' }}>
        <div style={{ textAlign: 'center', padding: '40px var(--space-4)' }}>
          <div style={{ marginBottom: '24px', opacity: 0.5 }}>
            <Wrench size={64} />
          </div>
          <h1 style={{ fontSize: '24px', marginBottom: '8px' }}>Under Maintenance</h1>
          <p style={{ color: 'var(--text-secondary)' }}>{maintenanceMsg}</p>
        </div>
      </div>
    );
  }

  /* ── Desktop Layout ── */
  return (
    <motion.div 
      id="mainScreen" 
      className="screen active" 
      style={{ display: 'flex' }}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <WebGLBackground />

      <div className="dashboard-container">
        <div>
          <Topbar
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            classes={classes}
            selectedClassId={selectedClassId}
            onSelectClass={handleSelectClass}
          />
        </div>

        <div className="dashboard-body">
          <div style={{ height: '100%', display: 'flex' }}>
            <Sidebar
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              nextEvent={nextEvent}
              tasks={tasks}
              feedback={feedback}
              classes={classes}
            />
          </div>

          <main className="main-content">
            {loading ? (
              
              <div className="skeleton-container" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="skeleton-shimmer" style={{ height: '120px', width: '100%', borderRadius: '16px' }}></div>
                <div className="skeleton-shimmer" style={{ height: '80px', width: '100%', borderRadius: '16px' }}></div>
                <div className="skeleton-shimmer" style={{ height: '80px', width: '100%', borderRadius: '16px' }}></div>
                <div className="skeleton-shimmer" style={{ height: '80px', width: '100%', borderRadius: '16px' }}></div>
              </div>

            ) : (
              <>
                <StatsRow schedules={filteredSchedules} />

                {activeTab === 'dashboard' && (
                  <ScheduleList
                    schedules={filteredSchedules}
                    onViewDetails={setDetailEvent}
                    onEdit={setEditEvent}
                    onShare={setShareEvent}
                    onDelete={handleDeleteSchedule}
                    onCancel={handleCancelSchedule}
                    onStart={handleStartSchedule}
                    onComplete={handleCompleteSchedule}
                    onSendReminder={handleSendReminder}
                    onOpenCreate={() => setCreateOpen(true)}
                  />
                )}

                {activeTab === 'calendar' && (
                  <CalendarView
                    schedules={filteredSchedules}
                    onSelectEvent={setDetailEvent}
                    onStart={handleStartSchedule}
                    onComplete={handleCompleteSchedule}
                    onDelete={handleDeleteSchedule}
                    onCancel={handleCancelSchedule}
                    onEdit={setEditEvent}
                    onShare={setShareEvent}
                    onSendReminder={handleSendReminder}
                  />
                )}

                {activeTab === 'gcal' && (
                  <GoogleCalendarView selectedClassContext={selectedClassId} />
                )}

                {activeTab === 'members' && (
                  <ClassMembersView classes={classes} selectedClassId={selectedClassId} />
                )}
              </>
            )}
          </main>
        </div>
      </div>

      {/* Class Selection Overlay on Load */}
      {showClassOverlay && (
        <div id="classSelectionOverlay" className="modal active">
          <div className="modal-content" style={{ maxWidth: '600px', background: 'rgba(10, 10, 15, 0.95)' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '18px' }}>Select Class Context</h3>
            </div>
            <div className="modal-body" style={{ padding: '24px' }}>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                Please choose a classroom to manage schedules. You can change this context later in the topbar.
              </p>
              <div className="class-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px' }}>
                {classes.map((c, index) => {
                  const initials = c.className ? c.className.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'CL';
                  const gradients = [
                    'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                    'linear-gradient(135deg, #10b981, #3b82f6)',
                    'linear-gradient(135deg, #8b5cf6, #ef4444)',
                    'linear-gradient(135deg, #06b6d4, #3b82f6)',
                  ];
                  return (
                    <div
                      key={c.id}
                      onClick={() => handleSelectClass(c.id)}
                      style={{
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid var(--border-default)',
                        borderRadius: 'var(--radius-md)',
                        padding: '20px 16px',
                        textAlign: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.25s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.3)';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'var(--border-default)';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      <div style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '50%',
                        background: gradients[index % gradients.length],
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifycontent: 'center',
                        margin: '0 auto 12px',
                        fontSize: '15px',
                        fontWeight: 700
                      }}>
                        {initials}
                      </div>
                      <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>{c.className}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        {c.participants ? c.participants.length : 0} members
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Slide-down Announcement overlay */}
      {isBroadcastActive && broadcast && (() => {
        const lines = (broadcast.message || '').split('\n');
        const header = lines[0] || '';
        const bodyLines = lines.slice(1).map(l => l.replace(/^•\s*/, ''));

        return (
          <motion.div
            id="broadcastPopup"
            className="broadcast-popup"
            initial={{ y: -150, opacity: 0, x: '-50%' }}
            animate={{ y: 0, opacity: 1, x: '-50%' }}
            exit={{ y: -150, opacity: 0, x: '-50%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 150 }}
          >
            <div className="broadcast-glow"></div>
            <div className="broadcast-icon-wrapper">
              <Megaphone className="broadcast-megaphone" size={24} />
            </div>
            <div className="broadcast-header-badge">{header}</div>
            <div className="broadcast-title">System Announcement</div>
            
            <div className="broadcast-list">
              {bodyLines.map((line, idx) => {
                const parts = line.split(':');
                const title = parts[0] || '';
                const desc = parts.slice(1).join(':') || '';
                return (
                  <div key={idx} className="broadcast-item">
                    <span className="broadcast-bullet">✦</span>
                    <div className="broadcast-item-content">
                      {title && <span className="broadcast-item-title">{title}</span>}
                      {desc && <span className="broadcast-item-desc">{desc.trim()}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
            
            <button className="broadcast-close" onClick={handleDismissBroadcast}>Dismiss</button>
          </motion.div>
        );
      })()}

      {/* EVENT MODALS WIRE */}
      <EventDetailModal
        isOpen={!!detailEvent}
        onClose={() => setDetailEvent(null)}
        schedule={detailEvent}
        onStart={handleStartSchedule}
        onComplete={handleCompleteSchedule}
        onCancel={handleCancelSchedule}
        onDelete={handleDeleteSchedule}
        onEdit={(s) => {
          setDetailEvent(null);
          setEditEvent(s);
        }}
        onShare={(s) => {
          setDetailEvent(null);
          setShareEvent(s);
        }}
        onSendReminder={handleSendReminder}
      />

      <CreateEventModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        selectedClassContext={selectedClassId}
        schedules={schedules}
        currentUser={currentUser}
      />

      <EditEventModal
        isOpen={!!editEvent}
        onClose={() => setEditEvent(null)}
        schedule={editEvent}
      />

      <ShareModal
        isOpen={!!shareEvent}
        onClose={() => setShareEvent(null)}
        schedule={shareEvent}
        currentUser={currentUser}
      />

      <ConfirmModal
        isOpen={!!confirmAction}
        message={confirmAction?.message}
        onConfirm={() => {
          if (confirmAction?.onConfirm) confirmAction.onConfirm();
          setConfirmAction(null);
        }}
        onCancel={() => setConfirmAction(null)}
      />

      <GoogleSyncPromptModal
        isOpen={syncPromptOpen}
        onClose={() => setSyncPromptOpen(false)}
        event={syncPromptEvent}
        schedules={schedules}
      />
    </motion.div>

  );
}
