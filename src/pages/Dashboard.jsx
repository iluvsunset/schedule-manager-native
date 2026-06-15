import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const containerVariants = {
  hidden: { opacity: 0 },
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
  hidden: { y: 24, opacity: 0 },
  visible: { 
    y: 0, 
    opacity: 1, 
    transition: { ease: [0.16, 1, 0.3, 1], duration: 0.4 } 
  }
};
import { collection, query, where, or, onSnapshot, getDocs, getDoc, doc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import useMobile from '../utils/useMobile';
import MobileDashboard from './MobileDashboard';
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
import { showMessage, sendDynamicEmail, formatTime, formatDate } from '../utils/helpers';
import { Wrench, Megaphone } from 'lucide-react';
import WebGLBackground from '../components/WebGLBackground';

export default function Dashboard() {
  const { currentUser, userRole } = useAuth();
  const isMobile = useMobile();
  const [activeTab, setActiveTab] = useState('dashboard');
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

  // 2b. Check for upcoming Google synced events to prompt the teacher
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
          let sentCount = 0;
          for (const email of recipientEmails) {
            const uSnap = await getDoc(doc(db, 'allowed_users', email.toLowerCase()));
            if (uSnap.exists() && uSnap.data().role === 'student') {
              const emailData = { place: s.place, time: formattedTime, date: formattedDate, link: window.location.origin };
              const sent = await sendDynamicEmail(currentUser, email, email.split('@')[0], `Reminder: ${s.place}`, emailData, 'schedule_reminder');
              if (sent) sentCount++;
            }
          }
          showMessage(`Sent ${sentCount} reminders!`, 'success');
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

  /* ── Mobile Layout ── */
  if (isMobile) {
    return (
      <MobileDashboard
        schedules={filteredSchedules}
        allSchedules={schedules}
        loading={loading}
        classes={classes}
        selectedClassId={selectedClassId}
        nextEvent={nextEvent}
        tasks={tasks}
        feedback={feedback}
        onStart={handleStartSchedule}
        onComplete={handleCompleteSchedule}
        onDelete={handleDeleteSchedule}
        onCancel={handleCancelSchedule}
      />
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
        <motion.div variants={itemVariants}>
          <Topbar
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            classes={classes}
            selectedClassId={selectedClassId}
            onSelectClass={handleSelectClass}
          />
        </motion.div>

        <div className="dashboard-body">
          <motion.div variants={itemVariants} style={{ height: '100%', display: 'flex' }}>
            <Sidebar
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              nextEvent={nextEvent}
              tasks={tasks}
              feedback={feedback}
              classes={classes}
            />
          </motion.div>

          <motion.main className="main-content" variants={itemVariants}>
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
          </motion.main>
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
      {isBroadcastActive && broadcast && (
        <div id="broadcastPopup" className="broadcast-popup active">
          <div className="broadcast-icon"><Megaphone size={24} /></div>
          <div className="broadcast-title">System Announcement</div>
          <div id="broadcastMessage" className="broadcast-message">{broadcast.message}</div>
          <button className="broadcast-close" onClick={handleDismissBroadcast}>Dismiss</button>
        </div>
      )}

      {/* EVENT MODALS WIRE */}
      <EventDetailModal
        isOpen={!!detailEvent}
        onClose={() => setDetailEvent(null)}
        schedule={detailEvent}
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
