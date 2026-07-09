import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getApiBase, getWebDomain } from '../../platform';
import { collection, onSnapshot, query, where, addDoc, getDoc, getDocs, doc, updateDoc, arrayUnion, Timestamp, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { showMessage, sendDynamicEmail, formatTime } from '../../utils/helpers';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarDays, Share2, ChevronRight, Check, ArrowLeft, Loader2, Search, Sparkles } from 'lucide-react';

export default function GoogleCalendarView({ selectedClassContext = '' }) {
  const { 
    currentUser, 
    userRole,
    userTimezone,
    isGcalConnected, 
    connectGoogleCalendar, 
    disconnectGoogleCalendar 
  } = useAuth();

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState([]);
  const [sharedIds, setSharedIds] = useState(new Set());
  
  // Wizard state
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1); // 1=pick name, 2=preview, 3=confirm
  const [selectedEventName, setSelectedEventName] = useState('');
  const [matchingEvents, setMatchingEvents] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [autoShare, setAutoShare] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);
  const [nameSearch, setNameSearch] = useState('');
  const [unsharingEventId, setUnsharingEventId] = useState(null);

  // Sync selectedClassId with topbar context
  useEffect(() => {
    if (selectedClassContext) {
      setSelectedClassId(selectedClassContext);
    }
  }, [selectedClassContext]);

  // 1. Listen to Classes and Shared Schedules
  useEffect(() => {
    if (!currentUser || !userRole) return;
    
    const qClasses = ['student', 'teacher'].includes(userRole)
      ? query(collection(db, 'classes'), where('participants', 'array-contains', currentUser.email.toLowerCase()))
      : query(collection(db, 'classes'));
    const unsubClasses = onSnapshot(qClasses, (snap) => {
      const clsList = [];
      snap.forEach(d => clsList.push({ id: d.id, ...d.data() }));
      setClasses(clsList);
      if (!selectedClassContext && clsList.length > 0) setSelectedClassId(clsList[0].id);
    }, (error) => {
      console.warn("Classes listener failed in GCalView:", error.message);
    });

    const qSchedules = query(collection(db, 'schedules'), where('userEmail', '==', currentUser.email.toLowerCase()));
    const unsubSchedules = onSnapshot(qSchedules, (snap) => {
      const ids = new Set();
      snap.forEach(d => {
        const data = d.data();
        if (data.gcalEventId) ids.add(data.gcalEventId);
      });
      setSharedIds(ids);
    }, (error) => {
      console.warn("Schedules listener failed in GCalView:", error.message);
    });

    return () => {
      unsubClasses();
      unsubSchedules();
    };
  }, [currentUser, userRole]);

  // 2. Fetch Google Calendar events
  const fetchGCalEvents = async () => {
    if (!isGcalConnected || !currentUser) return;
    setLoading(true);
    try {
      const apiBase = getApiBase();
      const response = await fetch(`${apiBase}/api/gcal-events?uid=${currentUser.uid}`);

      if (!response.ok) {
        if (response.status === 401) {
          disconnectGoogleCalendar();
          showMessage('Session expired or revoked. Please reconnect Google account.', 'error');
          return;
        }
        throw new Error('Failed to fetch calendar events.');
      }

      const data = await response.json();
      setEvents(data.items || []);
    } catch (err) {
      console.error(err);
      showMessage(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isGcalConnected) {
      fetchGCalEvents();
    }
  }, [isGcalConnected]);

  const handleConnect = async () => {
    try {
      await connectGoogleCalendar();
      showMessage('Opening browser for authorization...', 'success');
    } catch (err) {
      showMessage('Failed to connect Google account: ' + err.message, 'error');
    }
  };

  const handleDisconnect = () => {
    disconnectGoogleCalendar();
    setEvents([]);
    showMessage('Google Calendar disconnected.', 'success');
  };

  const handleUnshareEvent = async (eventId) => {
    if (!currentUser) return;
    setUnsharingEventId(eventId);
    try {
      const q = query(
        collection(db, 'schedules'),
        where('gcalEventId', '==', eventId)
      );
      const snap = await getDocs(q);
      const deletePromises = [];
      snap.forEach(d => {
        deletePromises.push(deleteDoc(doc(db, 'schedules', d.id)));
      });
      await Promise.all(deletePromises);
      
      // Update local sharedIds state
      setSharedIds(prev => {
        const next = new Set(prev);
        next.delete(eventId);
        return next;
      });
      
      showMessage('Removed event from shared schedules.', 'success');
    } catch (err) {
      console.error(err);
      showMessage('Failed to unshare event: ' + err.message, 'error');
    } finally {
      setUnsharingEventId(null);
    }
  };

  const handleCancelAllSharing = async () => {
    if (!currentUser || matchingEvents.length === 0) return;
    setSharing(true);
    try {
      const deletePromises = [];
      for (const event of matchingEvents) {
        const q = query(
          collection(db, 'schedules'),
          where('gcalEventId', '==', event.id)
        );
        const snap = await getDocs(q);
        snap.forEach(d => {
          deletePromises.push(deleteDoc(doc(db, 'schedules', d.id)));
        });
      }
      await Promise.all(deletePromises);
      
      // Update local sharedIds state
      setSharedIds(prev => {
        const next = new Set(prev);
        matchingEvents.forEach(event => next.delete(event.id));
        return next;
      });
      
      showMessage('Removed matching events from shared schedules.', 'success');
      setWizardOpen(false); // Close wizard
    } catch (err) {
      console.error(err);
      showMessage('Failed to cancel sharing: ' + err.message, 'error');
    } finally {
      setSharing(false);
    }
  };

  const allAlreadyShared = matchingEvents.length > 0 && matchingEvents.every(e => sharedIds.has(e.id));

  // ── WIZARD HELPERS ──────────────────────────────────────────
  const uniqueEventNames = React.useMemo(() => {
    const nameMap = {};
    events.forEach(e => {
      const name = (e.summary || '').trim();
      if (!name) return;
      if (!nameMap[name]) {
        nameMap[name] = { name, count: 0, hasShared: false };
      }
      nameMap[name].count++;
      if (sharedIds.has(e.id)) nameMap[name].hasShared = true;
    });
    return Object.values(nameMap).sort((a, b) => b.count - a.count);
  }, [events, sharedIds]);

  const filteredNames = React.useMemo(() => {
    if (!nameSearch.trim()) return uniqueEventNames;
    const q = nameSearch.toLowerCase();
    return uniqueEventNames.filter(n => n.name.toLowerCase().includes(q));
  }, [uniqueEventNames, nameSearch]);

  const openWizard = () => {
    setWizardOpen(true);
    setWizardStep(1);
    setSelectedEventName('');
    setMatchingEvents([]);
    setAdditionalNotes('');
    setAutoShare(true);
    setSharing(false);
    setShareSuccess(false);
    setNameSearch('');
  };

  const closeWizard = () => {
    setWizardOpen(false);
    setWizardStep(1);
    setShareSuccess(false);
  };

  const selectEventName = (name) => {
    setSelectedEventName(name);
    // Find ALL matching events (past + future)
    const matching = events.filter(e => 
      (e.summary || '').trim().toLowerCase() === name.toLowerCase()
    ).sort((a, b) => {
      const da = a.start.dateTime ? new Date(a.start.dateTime) : new Date(a.start.date);
      const db_ = b.start.dateTime ? new Date(b.start.dateTime) : new Date(b.start.date);
      return da - db_;
    });
    setMatchingEvents(matching);
    setWizardStep(2);
  };

  const handleWizardShare = async () => {
    if (!selectedClassId || matchingEvents.length === 0) return;
    setSharing(true);

    try {
      const classSnap = classes.find(c => c.id === selectedClassId);
      const participants = classSnap ? (classSnap.participants || []) : [];
      const classLabel = classSnap ? classSnap.className : '';

      let sharedCount = 0;
      for (const event of matchingEvents) {
        // Skip already-shared
        if (sharedIds.has(event.id)) continue;

        // Check Firestore for duplicates
        const dupSnap = await getDocs(
          query(collection(db, 'schedules'), where('gcalEventId', '==', event.id))
        );
        if (!dupSnap.empty) continue;

        const start = event.start.dateTime ? new Date(event.start.dateTime) : new Date(event.start.date);

        const scheduleData = {
          userId: currentUser.uid,
          userEmail: currentUser.email.toLowerCase(),
          classId: selectedClassId,
          className: classLabel,
          date: Timestamp.fromDate(start),
          place: event.summary || 'Google Calendar Event',
          location: event.location || event.hangoutLink || event.htmlLink || '',
          originalSummary: event.summary || 'Google Calendar Event',
          gcalLocation: event.location || event.hangoutLink || event.htmlLink || '',
          notes: additionalNotes,
          participants: participants,
          createdAt: Timestamp.now(),
          status: 'upcoming',
          source: 'google_calendar',
          gcalEventId: event.id
        };

        await addDoc(collection(db, 'schedules'), scheduleData);
        setSharedIds(prev => new Set([...prev, event.id]));
        sharedCount++;
      }

      // Save auto-share rule
      if (autoShare && classSnap) {
        const classRef = doc(db, 'classes', selectedClassId);
        await updateDoc(classRef, {
          gcalAutoShares: arrayUnion(selectedEventName)
        });
      }

      // Send email notifications
      const studentEmails = [];
      for (const email of participants) {
        const uSnap = await getDoc(doc(db, 'allowed_users', email.toLowerCase()));
        if (uSnap.exists() && uSnap.data().role === 'student') {
          studentEmails.push(email);
        }
      }

      if (studentEmails.length > 0 && sharedCount > 0) {
        const firstEvent = matchingEvents[0];
        const start = firstEvent.start.dateTime ? new Date(firstEvent.start.dateTime) : new Date(firstEvent.start.date);
        const formattedDate = start.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: userTimezone });
        const timeStr = firstEvent.start.dateTime ? formatTime(start, userTimezone) : 'All Day';
        for (const email of studentEmails) {
          const emailData = { place: selectedEventName, date: formattedDate, time: timeStr, notes: additionalNotes, link: getWebDomain() };
          await sendDynamicEmail(currentUser, email, email.split('@')[0], `New Event (GCal): ${selectedEventName}`, emailData, 'schedule_created');
        }
      }

      setShareSuccess(true);
      showMessage(`Shared ${sharedCount} events "${selectedEventName}" to ${classLabel}!`, 'success');
    } catch (err) {
      showMessage('Error sharing events: ' + err.message, 'error');
      setSharing(false);
    }
  };

  // ── ANIMATION VARIANTS ──────────────────────────────────────
  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.3 } },
    exit: { opacity: 0, transition: { duration: 0.2 } }
  };

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.92, y: 30 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 400, damping: 30, mass: 0.8 } },
    exit: { opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.2 } }
  };

  const listItemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: (i) => ({
      opacity: 1, x: 0,
      transition: { delay: i * 0.04, type: 'spring', stiffness: 300, damping: 24 }
    }),
    exit: { opacity: 0, x: 20, transition: { duration: 0.15 } }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.95 },
    visible: (i) => ({
      opacity: 1, y: 0, scale: 1,
      transition: { delay: i * 0.06, type: 'spring', stiffness: 300, damping: 25 }
    })
  };

  const checkVariants = {
    hidden: { pathLength: 0, opacity: 0 },
    visible: { pathLength: 1, opacity: 1, transition: { duration: 0.5, ease: 'easeOut' } }
  };

  const colors = ['#0070F3', '#7928CA', '#00C48C', '#F5A623', '#EE4444', '#50E3C2'];

  return (
    <div className="content-panel">
      <div className="panel-header">
        <h2>Google Calendar</h2>
        {isGcalConnected && (
          <div className="panel-actions" style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-gradient" onClick={openWizard} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
              <Share2 size={15} />
              Share Schedule
            </button>
            <button className="btn btn-ghost" onClick={fetchGCalEvents} disabled={loading}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{marginRight: '6px', verticalAlign: 'middle'}}>
                <polyline points="23 4 23 10 17 10"></polyline>
                <polyline points="1 20 1 14 7 14"></polyline>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
              </svg>
              Refresh
            </button>
            <button className="btn btn-ghost" onClick={handleDisconnect} style={{ color: 'var(--color-error)' }}>
              Disconnect
            </button>
          </div>
        )}
      </div>

      {!isGcalConnected ? (
        <div className="gcal-connect-wrapper">
          <div className="gcal-premium-card">
            <div className="gcal-icon-glow">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
                <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"></path>
              </svg>
            </div>
            <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '12px', letterSpacing: '-0.02em' }}>Connect Google Calendar</h2>
            <p style={{ color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: '24px', maxWidth: '320px', textAlign: 'center' }}>
              Sync your upcoming events, meetings, and classes directly to the Chronos dashboard.
            </p>
            <button className="btn btn-primary btn-full" onClick={handleConnect} style={{ display: 'flex', gap: '8px', padding: '12px' }}>
              <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#fff" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/><path fill="#fff" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/><path fill="#FBBC05" d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/></svg>
              Continue with Google
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          {loading ? (
            <div className="skeleton-loader">
              <div className="skeleton-item" />
              <div className="skeleton-item" />
              <div className="skeleton-item" />
            </div>
          ) : events.length === 0 ? (
            <div className="empty-state" style={{ textAlign: 'center', padding: '60px var(--space-4)' }}>
              <div className="empty-icon" style={{ fontSize: '32px', marginBottom: '8px' }}>📅</div>
              <h3>No upcoming events</h3>
              <p style={{ color: 'var(--text-secondary)' }}>Your Google Calendar has no events in the past or next 2 months.</p>
            </div>
          ) : (
            <div className="gcal-events-list">
              {events.map((event, idx) => {
                const start = event.start.dateTime ? new Date(event.start.dateTime) : new Date(event.start.date);
                const end = event.end.dateTime ? new Date(event.end.dateTime) : null;
                const isAllDay = !event.start.dateTime;
                const timeStr = isAllDay ? 'All day' : `${formatTime(start, userTimezone)}${end ? ' – ' + formatTime(end, userTimezone) : ''}`;
                const dateStr = start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: userTimezone });
                const isShared = sharedIds.has(event.id);
                const color = colors[idx % colors.length];

                return (
                  <div key={event.id} className="gcal-event-item">
                    <div className="gcal-color-bar" style={{ background: color }} />
                    <div className="gcal-event-info">
                      <div className="gcal-event-title">{event.summary || 'No Title'}</div>
                      <div className="gcal-event-time">{dateStr} · {timeStr}</div>
                    </div>
                    {isShared && (
                      <span className="gcal-badge-shared">Shared</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          PREMIUM SHARE WIZARD — Apple-level motion design
         ══════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {wizardOpen && (
          <motion.div
            className="gcal-wizard-overlay"
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.target.classList.contains('gcal-wizard-overlay') && closeWizard()}
          >
            <motion.div
              className="gcal-wizard-modal"
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              layout
            >
              {/* Step Indicator */}
              <div className="gcal-wizard-steps">
                {[1, 2, 3].map(step => (
                  <div key={step} className="gcal-wizard-step-wrapper">
                    <motion.div
                      className={`gcal-wizard-dot ${wizardStep >= step ? 'active' : ''}`}
                      animate={{ scale: wizardStep === step ? 1.15 : 1 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    >
                      {wizardStep > step ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <motion.path 
                            d="M20 6L9 17l-5-5"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 0.4, ease: "easeOut" }}
                          />
                        </svg>
                      ) : (
                        <span style={{ fontSize: '11px', fontWeight: 700 }}>{step}</span>
                      )}
                    </motion.div>
                    {step < 3 && (
                      <div className="gcal-wizard-line-track">
                        <motion.div 
                          className="gcal-wizard-line-fill"
                          initial={{ width: '0%' }}
                          animate={{ width: wizardStep > step ? '100%' : '0%' }}
                          transition={{ duration: 0.4, ease: 'easeInOut' }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* ── STEP 1: Pick Event Name ── */}
              <AnimatePresence mode="wait">
                {wizardStep === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -30 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    className="gcal-wizard-body"
                  >
                    <h3 className="gcal-wizard-title">Choose a Schedule</h3>
                    <p className="gcal-wizard-subtitle">Select the event you want to share with your class</p>

                    {/* Search */}
                    <div className="gcal-wizard-search">
                      <Search size={16} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                      <input
                        type="text"
                        placeholder="Search events..."
                        value={nameSearch}
                        onChange={(e) => setNameSearch(e.target.value)}
                      />
                    </div>

                    <div className="gcal-wizard-list">
                      <AnimatePresence>
                        {filteredNames.map((item, i) => (
                          <motion.button
                            key={item.name}
                            custom={i}
                            variants={listItemVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            className={`gcal-pick-item ${item.hasShared ? 'has-shared' : ''}`}
                            onClick={() => selectEventName(item.name)}
                            whileHover={{ scale: 1.015, x: 4 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <div className="gcal-pick-color" style={{ background: colors[i % colors.length] }} />
                            <div className="gcal-pick-info">
                              <span className="gcal-pick-name">{item.name}</span>
                              <span className="gcal-pick-count">
                                {item.count} event{item.count > 1 ? 's' : ''}
                                {item.hasShared && ' · partially shared'}
                              </span>
                            </div>
                            <ChevronRight size={18} className="gcal-pick-chevron" />
                          </motion.button>
                        ))}
                      </AnimatePresence>
                      {filteredNames.length === 0 && (
                        <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
                          No matching events found
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* ── STEP 2: Preview Matching Events ── */}
                {wizardStep === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 30 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    className="gcal-wizard-body"
                  >
                    <button className="gcal-wizard-back" onClick={() => setWizardStep(1)}>
                      <ArrowLeft size={16} /> Back
                    </button>

                    <h3 className="gcal-wizard-title">
                      <Sparkles size={18} style={{ color: '#fbbf24', marginRight: '6px' }} />
                      Found {matchingEvents.length} event{matchingEvents.length > 1 ? 's' : ''}
                    </h3>
                    <p className="gcal-wizard-subtitle">
                      All events matching "<strong>{selectedEventName}</strong>" will be shared
                    </p>

                    <div className="gcal-preview-list">
                      {matchingEvents.map((event, i) => {
                        const start = event.start.dateTime ? new Date(event.start.dateTime) : new Date(event.start.date);
                        const isAllDay = !event.start.dateTime;
                        const timeStr = isAllDay ? 'All Day' : formatTime(start, userTimezone);
                        const dateStr = start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: userTimezone });
                        const isPast = start < new Date();
                        const alreadyShared = sharedIds.has(event.id);

                        return (
                          <motion.div
                            key={event.id}
                            custom={i}
                            variants={cardVariants}
                            initial="hidden"
                            animate="visible"
                            className={`gcal-preview-card ${isPast ? 'past' : ''} ${alreadyShared ? 'shared' : ''}`}
                          >
                            <div className="gcal-preview-timeline">
                              <motion.div 
                                className="gcal-preview-dot"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: i * 0.06 + 0.2, type: 'spring', stiffness: 500 }}
                              />
                              {i < matchingEvents.length - 1 && <div className="gcal-preview-line" />}
                            </div>
                            <div className="gcal-preview-content">
                              <div className="gcal-preview-date">{dateStr}</div>
                              <div className="gcal-preview-time">{timeStr}</div>
                              {event.location && (
                                <div className="gcal-preview-location">📍 {event.location}</div>
                              )}
                              {alreadyShared && (
                                <span className="gcal-preview-shared-badge">Already shared</span>
                              )}
                              {isPast && !alreadyShared && (
                                <span className="gcal-preview-past-badge">Past</span>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>

                    <motion.button
                      className={allAlreadyShared ? "gcal-wizard-next-btn danger" : "gcal-wizard-next-btn"}
                      onClick={allAlreadyShared ? handleCancelAllSharing : () => setWizardStep(3)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      style={allAlreadyShared ? { background: '#ef4444', borderColor: '#ef4444', color: 'white' } : {}}
                      disabled={sharing}
                    >
                      {sharing ? 'Processing...' : allAlreadyShared ? 'Cancel Sharing' : 'Continue to Share'}
                      {!sharing && <ChevronRight size={18} />}
                    </motion.button>
                  </motion.div>
                )}

                {/* ── STEP 3: Confirm & Share ── */}
                {wizardStep === 3 && !shareSuccess && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 30 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    className="gcal-wizard-body"
                  >
                    <button className="gcal-wizard-back" onClick={() => setWizardStep(2)}>
                      <ArrowLeft size={16} /> Back
                    </button>

                    <h3 className="gcal-wizard-title">Share to Class</h3>
                    <p className="gcal-wizard-subtitle">
                      Sharing {matchingEvents.filter(e => !sharedIds.has(e.id)).length} new event{matchingEvents.filter(e => !sharedIds.has(e.id)).length > 1 ? 's' : ''} of "{selectedEventName}"
                    </p>

                    <div className="gcal-wizard-form">
                      <div className="gcal-wizard-field">
                        <label>Select Class</label>
                        <select value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)}>
                          {classes.map(c => (
                            <option key={c.id} value={c.id}>{c.className}</option>
                          ))}
                        </select>
                      </div>

                      <div className="gcal-wizard-field">
                        <label>Additional Notes (optional)</label>
                        <textarea
                          rows="3"
                          placeholder="Add instructions or notes for students..."
                          value={additionalNotes}
                          onChange={e => setAdditionalNotes(e.target.value)}
                        />
                      </div>

                      <label className="gcal-wizard-checkbox">
                        <input
                          type="checkbox"
                          checked={autoShare}
                          onChange={e => setAutoShare(e.target.checked)}
                        />
                        <span>Auto-share future events with the same name</span>
                      </label>
                    </div>

                    <motion.button
                      className="gcal-wizard-share-btn"
                      onClick={handleWizardShare}
                      disabled={sharing}
                      whileHover={!sharing ? { scale: 1.02 } : {}}
                      whileTap={!sharing ? { scale: 0.98 } : {}}
                    >
                      {sharing ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                          style={{ display: 'flex' }}
                        >
                          <Loader2 size={20} />
                        </motion.div>
                      ) : (
                        <>
                          <Share2 size={18} />
                          Share All Events to Class
                        </>
                      )}
                    </motion.button>
                  </motion.div>
                )}

                {/* ── SUCCESS STATE ── */}
                {shareSuccess && (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    className="gcal-wizard-body"
                    style={{ textAlign: 'center', padding: '50px 30px' }}
                  >
                    <motion.div
                      className="gcal-success-circle"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 15 }}
                    >
                      <motion.svg width="48" height="48" viewBox="0 0 48 48">
                        <motion.path
                          d="M14 24 L22 32 L34 16"
                          fill="none"
                          stroke="white"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          variants={checkVariants}
                          initial="hidden"
                          animate="visible"
                        />
                      </motion.svg>
                    </motion.div>

                    <motion.h3
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      style={{ fontSize: '20px', fontWeight: 700, marginTop: '24px', marginBottom: '8px' }}
                    >
                      Events Shared!
                    </motion.h3>
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 }}
                      style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.5' }}
                    >
                      "{selectedEventName}" has been shared to your class.
                      {autoShare && <><br />Future events with this name will auto-sync.</>}
                    </motion.p>

                    <motion.button
                      className="gcal-wizard-done-btn"
                      onClick={closeWizard}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.6 }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Done
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
