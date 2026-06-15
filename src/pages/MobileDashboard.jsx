import React, { useState, useMemo, useCallback } from 'react';
import { addDoc, collection, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { showMessage, formatTime, formatDate } from '../utils/helpers';
import { Link } from 'react-router-dom';
import DatePicker from '../components/ui/DatePicker';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ClipboardList, MessageSquare, Inbox,
  Home, Calendar, List, User, Plus, ChevronRight,
  Search, ArrowLeft, ArrowRight, X, Play, Check, Edit3, Trash2, Send, ExternalLink, Share2, MoreVertical, Clock, MapPin, Zap
} from 'lucide-react';
/* ───────────────────────────────────────────────
   Helper: safe date conversion
   ─────────────────────────────────────────────── */
function toDate(d) {
  if (!d) return null;
  if (d instanceof Date) return d;
  if (typeof d.toDate === 'function') return d.toDate();
  const parsed = new Date(d);
  return isNaN(parsed) ? null : parsed;
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function getFirstName(email) {
  if (!email) return 'there';
  return email.split('@')[0];
}

// Removed inline SVG components, using Lucide directly

/* ═══════════════════════════════════════════════
   MOBILE DASHBOARD COMPONENT
   ═══════════════════════════════════════════════ */
export default function MobileDashboard({
  schedules = [],
  allSchedules = [],
  loading = false,
  classes = [],
  selectedClassId = '',
  nextEvent = null,
  tasks = [],
  feedback = null,
  onStart,
  onComplete,
  onDelete,
  onCancel,
}) {
  const { currentUser, userRole, logout, can, canEditSchedule, canDeleteSchedule, resetPassword } = useAuth();

  // ── Tab state ──
  const [currentTab, setCurrentTab] = useState('home');

  // ── Events tab state ──
  const [searchTerm, setSearchTerm] = useState('');
  const [eventFilter, setEventFilter] = useState('all');

  // ── Calendar tab state ──
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());

  // ── Action sheet state ──
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  // ── Detail sheet state ──
  const [showDetail, setShowDetail] = useState(false);

  // ── Create modal state ──
  const [showCreate, setShowCreate] = useState(false);
  const [createDate, setCreateDate] = useState('');
  const [createTime, setCreateTime] = useState('');
  const [createTitle, setCreateTitle] = useState('');
  const [createLocation, setCreateLocation] = useState('');
  const [createNotes, setCreateNotes] = useState('');
  const [creating, setCreating] = useState(false);

  /* ─────────────────────────────────────────────
     STATS
     ───────────────────────────────────────────── */
  const stats = useMemo(() => {
    const total = allSchedules.length;
    let live = 0;
    let upcoming = 0;
    let done = 0;
    allSchedules.forEach((s) => {
      if (s.status === 'ongoing') live++;
      else if (s.status === 'completed') done++;
      else upcoming++;
    });
    return { total, live, upcoming, done };
  }, [allSchedules]);

  /* ─────────────────────────────────────────────
     HERO STATE
     ───────────────────────────────────────────── */
  const heroData = useMemo(() => {
    if (!nextEvent) return { badge: 'idle', badgeLabel: 'ALL CAUGHT UP', timeText: '—', subtitle: 'No upcoming events', isLive: false };

    const date = toDate(nextEvent.date);
    if (nextEvent.status === 'ongoing') {
      return {
        badge: 'live',
        badgeLabel: 'LIVE NOW',
        timeText: 'LIVE',
        subtitle: nextEvent.place || 'Untitled Event',
        dateText: date ? formatDate(date) : '',
        isLive: true,
      };
    }

    const now = new Date();
    if (date) {
      const diffMs = date - now;
      if (diffMs > 0 && diffMs < 3600000) {
        const mins = Math.ceil(diffMs / 60000);
        return {
          badge: 'next',
          badgeLabel: 'NEXT UP',
          timeText: `In ${mins}m`,
          subtitle: nextEvent.place || 'Untitled Event',
          dateText: formatDate(date),
          isLive: false,
        };
      }
      return {
        badge: 'next',
        badgeLabel: 'NEXT UP',
        timeText: formatTime(date),
        subtitle: nextEvent.place || 'Untitled Event',
        dateText: formatDate(date),
        isLive: false,
      };
    }

    return {
      badge: 'next',
      badgeLabel: 'NEXT UP',
      timeText: '--:--',
      subtitle: nextEvent.place || 'Untitled Event',
      dateText: '',
      isLive: false,
    };
  }, [nextEvent]);

  /* ─────────────────────────────────────────────
     EVENTS FILTERING + SORTING
     ───────────────────────────────────────────── */
  const filteredEvents = useMemo(() => {
    const now = new Date();
    let list = [...schedules];

    // search
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter((s) => (s.place || '').toLowerCase().includes(q));
    }

    // filter
    if (eventFilter === 'ongoing') {
      list = list.filter((s) => s.status === 'ongoing');
    } else if (eventFilter === 'upcoming') {
      list = list.filter((s) => {
        if (s.status === 'completed' || s.status === 'ongoing' || s.status === 'cancelled') return false;
        const d = toDate(s.date);
        return d ? d >= now : true;
      });
    } else if (eventFilter === 'past') {
      list = list.filter((s) => {
        if (s.status === 'completed' || s.status === 'cancelled') return true;
        if (s.status === 'ongoing') return false;
        const d = toDate(s.date);
        return d ? d < now : false;
      });
    }

    // sort
    if (eventFilter === 'upcoming') {
      list.sort((a, b) => {
        const da = toDate(a.date);
        const db_ = toDate(b.date);
        return (da?.getTime() || 0) - (db_?.getTime() || 0);
      });
    } else {
      list.sort((a, b) => {
        const da = toDate(a.date);
        const db_ = toDate(b.date);
        return (db_?.getTime() || 0) - (da?.getTime() || 0);
      });
    }

    return list;
  }, [schedules, searchTerm, eventFilter]);

  /* ─────────────────────────────────────────────
     CALENDAR HELPERS
     ───────────────────────────────────────────── */
  const calendarData = useMemo(() => {
    const firstDay = new Date(calYear, calMonth, 1).getDay();
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const monthName = new Date(calYear, calMonth).toLocaleString('default', { month: 'long' });

    // index events by day
    const eventsByDay = {};
    schedules.forEach((s) => {
      const d = toDate(s.date);
      if (!d) return;
      if (d.getMonth() === calMonth && d.getFullYear() === calYear) {
        const day = d.getDate();
        if (!eventsByDay[day]) eventsByDay[day] = [];
        eventsByDay[day].push(s);
      }
    });

    return { firstDay, daysInMonth, monthName, eventsByDay };
  }, [schedules, calMonth, calYear]);

  const today = new Date();
  const isToday = (day) =>
    today.getDate() === day && today.getMonth() === calMonth && today.getFullYear() === calYear;

  const prevMonth = useCallback(() => {
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear((y) => y - 1);
    } else {
      setCalMonth((m) => m - 1);
    }
  }, [calMonth]);

  const nextMonth = useCallback(() => {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear((y) => y + 1);
    } else {
      setCalMonth((m) => m + 1);
    }
  }, [calMonth]);

  /* ─────────────────────────────────────────────
     EVENT HANDLERS
     ───────────────────────────────────────────── */
  const openActionSheet = (event) => {
    setSelectedEvent(event);
    setShowActionSheet(true);
    setShowDetail(false);
  };

  const closeActionSheet = () => {
    setShowActionSheet(false);
  };

  const openDetail = (event) => {
    setSelectedEvent(event || selectedEvent);
    setShowDetail(true);
    setShowActionSheet(false);
  };

  const closeDetail = () => {
    setShowDetail(false);
  };

  const handleActionStart = () => {
    if (selectedEvent && onStart) {
      onStart(selectedEvent.id);
      closeActionSheet();
    }
  };

  const handleActionComplete = () => {
    if (selectedEvent && onComplete) {
      onComplete(selectedEvent.id);
      closeActionSheet();
    }
  };

  const handleActionDelete = () => {
    if (selectedEvent && onDelete) {
      onDelete(selectedEvent.id);
      closeActionSheet();
    }
  };

  const handleActionCancel = () => {
    if (selectedEvent && onCancel) {
      onCancel(selectedEvent.id);
      closeActionSheet();
    }
  };

  /* ─────────────────────────────────────────────
     CREATE EVENT HANDLER
     ───────────────────────────────────────────── */
  const handleCreate = async (e) => {
    e.preventDefault();

    if (!createDate || !createTitle.trim()) {
      showMessage('Date and Title are required', 'error');
      return;
    }

    if (!currentUser) {
      showMessage('You must be signed in', 'error');
      return;
    }

    const classObj = classes.length > 0 ? classes[0] : null;

    setCreating(true);
    try {
      const dateStr = createTime ? `${createDate}T${createTime}` : `${createDate}T00:00`;
      const dateObj = new Date(dateStr);

      await addDoc(collection(db, 'schedules'), {
        place: createTitle.trim(),
        date: Timestamp.fromDate(dateObj),
        location: createLocation.trim(),
        notes: createNotes.trim(),
        status: 'upcoming',
        participants: classObj?.participants || [],
        classId: classObj?.id || selectedClassId || '',
        className: classObj?.className || '',
        userId: currentUser.uid,
        userEmail: currentUser.email,
      });

      showMessage('Event created!', 'success');
      setCreateDate('');
      setCreateTime('');
      setCreateTitle('');
      setCreateLocation('');
      setCreateNotes('');
      setShowCreate(false);
    } catch (err) {
      showMessage(err.message, 'error');
    } finally {
      setCreating(false);
    }
  };

  /* ─────────────────────────────────────────────
     RENDER: LOADING SKELETON
     ───────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="m-container">
        <div className="m-skeleton-header">
          <div className="m-skeleton-line m-skeleton-lg" />
          <div className="m-skeleton-line m-skeleton-sm" />
        </div>
        <div className="m-skeleton-hero" />
        <div className="m-skeleton-stats">
          <div className="m-skeleton-stat" />
          <div className="m-skeleton-stat" />
          <div className="m-skeleton-stat" />
          <div className="m-skeleton-stat" />
        </div>
        <div className="m-skeleton-card" />
        <div className="m-skeleton-card" />
        <div className="m-skeleton-card" />
        <nav className="m-tab-bar">
          <button className="m-tab active" type="button"><Home size={18} /></button>
          <button className="m-tab" type="button"><List size={18} /></button>
          {/* Plus */}
          <button className="m-tab" type="button"><Calendar size={18} /></button>
          <button className="m-tab" type="button"><User size={18} /></button>
        </nav>
      </div>
    );
  }

  /* ═══════════════════════════════════════════
     RENDER: MAIN LAYOUT
     ═══════════════════════════════════════════ */
  return (
    <div className="m-container">
      <div className="m-content">
        {/* ─── HOME TAB ─── */}
        {currentTab === 'home' && (
          <section className="m-tab-content">
            {/* Greeting */}
            <header className="m-greeting">
              <h1 className="m-greeting-title">
                {getGreeting()}, {getFirstName(currentUser?.email)}
              </h1>
              <p className="m-greeting-sub">
                {today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
            </header>

            {/* Hero Card */}
            <div className={`m-hero ${heroData.isLive ? 'live' : ''}`}>
              <span className={`m-hero-badge ${heroData.badge}`}>{heroData.badgeLabel}</span>
              <div className="m-hero-time">{heroData.timeText}</div>
              <p className="m-hero-event">{heroData.subtitle}</p>
              {heroData.dateText && <p className="m-hero-date">{heroData.dateText}</p>}
            </div>

            {/* Stats Grid */}
            <div className="m-stats">
              <div className="m-stat-card">
                <span className="m-stat-value">{stats.total}</span>
                <span className="m-stat-label">Total</span>
              </div>
              <div className="m-stat-card m-stat-live">
                <span className="m-stat-value">{stats.live}</span>
                <span className="m-stat-label">Live</span>
              </div>
              <div className="m-stat-card m-stat-upcoming">
                <span className="m-stat-value">{stats.upcoming}</span>
                <span className="m-stat-label">Upcoming</span>
              </div>
              <div className="m-stat-card m-stat-done">
                <span className="m-stat-value">{stats.done}</span>
                <span className="m-stat-label">Done</span>
              </div>
            </div>

            {/* Student Widgets */}
            {userRole === 'student' && (
              <div className="m-student-widgets">
                {/* Tasks Widget */}
                <div className="m-widget">
                  <h3 className="m-widget-title">
                    <ClipboardList size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                    Pending Tasks
                  </h3>
                  {tasks.length === 0 ? (
                    <p className="m-widget-empty">No pending tasks — you're all caught up!</p>
                  ) : (
                    <ul className="m-task-list">
                      {tasks.slice(0, 3).map((task, i) => (
                        <li key={i} className="m-task-item">
                          <span className="m-task-course">{task.course}</span>
                          <span className="m-task-desc">{task.desc}</span>
                          {task.date && (
                            <span className="m-task-due">Due {task.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                          )}
                          {task.link && (
                            <a href={task.link} className="m-task-link" target="_blank" rel="noopener noreferrer">Open →</a>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                  {tasks.length > 3 && (
                    <p className="m-widget-more">+{tasks.length - 3} more tasks</p>
                  )}
                </div>

                {/* Feedback Widget */}
                <div className="m-widget">
                  <h3 className="m-widget-title">
                    <MessageSquare size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                    Latest Feedback
                  </h3>
                  {!feedback ? (
                    <p className="m-widget-empty">No feedback yet</p>
                  ) : (
                    <div className="m-feedback-card">
                      <div className="m-feedback-header">
                        <span className="m-feedback-course">{feedback.place}</span>
                        <span className="m-feedback-date">{feedback.date}</span>
                      </div>
                      {feedback.reviewLearned && (
                        <p className="m-feedback-text">
                          <strong>Key takeaway:</strong> {feedback.reviewLearned}
                        </p>
                      )}
                      {feedback.reviewNotes && (
                        <p className="m-feedback-text">
                          <strong>Notes:</strong> {feedback.reviewNotes}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        )}

        {/* ─── EVENTS TAB ─── */}
        {currentTab === 'events' && (
          <section className="m-tab-content">
            <header className="m-section-header">
              <h2 className="m-section-title">Events</h2>
            </header>

            {/* Search */}
            <div className="m-search">
              <Search size={18} className="m-search-icon" />
              <input
                className="m-search-input"
                type="text"
                placeholder="Search events..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Filter Chips */}
            <div className="m-chips">
              {[
                { key: 'all', label: 'All' },
                { key: 'ongoing', label: 'Live' },
                { key: 'upcoming', label: 'Upcoming' },
                { key: 'past', label: 'History' },
              ].map((chip) => (
                <button
                  key={chip.key}
                  type="button"
                  className={`m-chip ${eventFilter === chip.key ? 'active' : ''}`}
                  onPointerDown={() => setEventFilter(chip.key)}
                  onClick={() => setEventFilter(chip.key)}
                >
                  {chip.label}
                </button>
              ))}
            </div>

            {/* Event List */}
            <div className="m-event-list">
              {filteredEvents.length === 0 ? (
                <div className="m-empty-state">
                  <span className="m-empty-icon"><Inbox size={48} color="var(--text-secondary)" /></span>
                  <p className="m-empty-text">No events found</p>
                </div>
              ) : (
                <AnimatePresence>
                  {filteredEvents.map((schedule, index) => {
                    const date = toDate(schedule.date);
                    const isLive = schedule.status === 'ongoing';
                    const isCompleted = schedule.status === 'completed';
                    const isGcal = schedule.source === 'google_calendar';

                    return (
                      <motion.button
                        key={schedule.id}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2, delay: index * 0.05 }}
                        type="button"
                        className={`m-event-card ${isLive ? 'live' : ''} ${isCompleted ? 'completed' : ''}`}
                        onTap={() => openActionSheet(schedule)}
                      >
                      <div className="m-event-date-badge">
                        <span className="m-event-date-month">
                          {date ? date.toLocaleString('en-US', { month: 'short' }).toUpperCase() : '—'}
                        </span>
                        <span className="m-event-date-day">
                          {date ? date.getDate() : '—'}
                        </span>
                      </div>
                      <div className="m-event-info">
                        <div className="m-event-title-row">
                          {isLive && <span className="m-event-live-dot" />}
                          <span className="m-event-title" style={{ textDecoration: schedule.status === 'cancelled' ? 'line-through' : 'none', color: schedule.status === 'cancelled' ? 'var(--text-secondary)' : 'inherit' }}>
                            {schedule.place || 'Untitled'}
                          </span>
                          {isGcal && <span className="m-gcal-tag">GCal</span>}
                        </div>
                        <div className="m-event-meta">
                          {date && <span className="m-event-time">{formatTime(date)}</span>}
                          {schedule.location && !schedule.location.includes('google.com/calendar/event') && (
                            <span className="m-event-location">📍 {schedule.location}</span>
                          )}
                        </div>
                      </div>
                      <ChevronRight size={20} className="m-chevron" />
                    </motion.button>
                  );
                })}
                </AnimatePresence>
              )}
            </div>
          </section>
        )}

        {/* ─── CALENDAR TAB ─── */}
        {currentTab === 'calendar' && (
          <section className="m-tab-content">
            <header className="m-section-header">
              <h2 className="m-section-title">Calendar</h2>
            </header>

            {/* Month nav */}
            <div className="m-cal-nav">
              <button type="button" className="m-cal-nav-btn" onPointerDown={prevMonth} onClick={prevMonth} aria-label="Previous month">
                <ArrowLeft size={20} className="m-cal-arrow" />
              </button>
              <span className="m-cal-month-label">{calendarData.monthName} {calYear}</span>
              <button type="button" className="m-cal-nav-btn" onPointerDown={nextMonth} onClick={nextMonth} aria-label="Next month">
                <ArrowRight size={20} className="m-cal-arrow" />
              </button>
            </div>

            {/* Weekday headers */}
            <div className="m-cal-weekdays">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                <span key={i} className="m-cal-weekday">{d}</span>
              ))}
            </div>

            {/* Day grid */}
            <div className="m-cal-grid">
              {/* Empty padding cells */}
              {Array.from({ length: calendarData.firstDay }).map((_, i) => (
                <div key={`pad-${i}`} className="m-cal-cell m-cal-empty" />
              ))}

              {/* Day cells */}
              {Array.from({ length: calendarData.daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dayEvents = calendarData.eventsByDay[day] || [];
                const hasEvent = dayEvents.length > 0;

                // Determine dot style based on first event
                let dotClass = '';
                if (hasEvent) {
                  const first = dayEvents[0];
                  if (first.status === 'ongoing') dotClass = 'live';
                  else if (first.status === 'completed') dotClass = 'completed';
                  else if (first.source === 'google_calendar') dotClass = 'gcal';
                }

                return (
                  <button
                    key={day}
                    type="button"
                    className={`m-cal-cell ${isToday(day) ? 'today' : ''} ${hasEvent ? 'has-event' : ''}`}
                    onClick={() => {
                      if (hasEvent) {
                        openDetail(dayEvents[0]);
                      }
                    }}
                  >
                    <span className="m-cal-day-num">{day}</span>
                    {hasEvent && <span className={`m-cal-dot ${dotClass}`} />}
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* ─── PROFILE TAB ─── */}
        {currentTab === 'profile' && (
          <section className="m-tab-content">
            {/* Profile Hero */}
            <div className="m-profile-hero">
              <div className="m-profile-avatar">
                {currentUser?.email ? currentUser.email[0].toUpperCase() : '?'}
              </div>
              <p className="m-profile-email">{currentUser?.email || 'No email'}</p>
              <span className="m-profile-role-badge">{userRole || 'user'}</span>
            </div>

            {/* Settings Group */}
            <div className="m-settings-group">
              <h3 className="m-settings-heading">Account</h3>
              <div className="m-settings-row">
                <span className="m-settings-label">Email</span>
                <span className="m-settings-value">{currentUser?.email || '—'}</span>
              </div>
              <div className="m-settings-row">
                <span className="m-settings-label">Role</span>
                <span className="m-settings-value">
                  <span className="m-role-badge">{userRole || 'user'}</span>
                </span>
              </div>
              <div
                className="m-settings-row m-settings-link"
                style={{ cursor: 'pointer' }}
                onClick={async () => {
                  try {
                    await resetPassword(currentUser.email);
                    showMessage('Password setup link sent to your email!', 'success');
                  } catch (err) {
                    showMessage(err.message, 'error');
                  }
                }}
              >
                <span className="m-settings-label">Set/Reset Password</span>
                <ChevronRight size={20} className="m-chevron" />
              </div>
              {can('view_console') && (
                <Link to="/admin" className="m-settings-row m-settings-link">
                  <span className="m-settings-label">Admin Console</span>
                  <ChevronRight size={20} className="m-chevron" />
                </Link>
              )}
            </div>

            {/* Sign out */}
            <button type="button" className="m-signout-btn" onClick={logout}>
              Sign Out
            </button>
          </section>
        )}
      </div>

      {/* ─── FAB ─── */}
      {/* ─── BOTTOM TAB BAR ─── */}
      {/* 
        key: 'home'
        key: 'events'
        key: 'calendar'
        key: 'profile'
        currentTab === key ? 'active' : '' 
      */}
      <nav className={`m-tab-bar ${can('create_schedule') ? 'm-tab-bar-fab-active' : ''}`}>
        <button type="button" className={`m-tab ${currentTab === 'home' ? 'active' : ''}`} onClick={() => setCurrentTab('home')}>
          <Home size={24} className="m-tab-icon" />
        </button>
        <button type="button" className={`m-tab ${currentTab === 'events' ? 'active' : ''}`} onClick={() => setCurrentTab('events')}>
          <List size={24} className="m-tab-icon" />
        </button>
        {can('create_schedule') && (
          <button
            type="button"
            className="m-fab"
            aria-label="Add Schedule"
            onClick={() => setShowCreate(true)}
          >
            <Plus size={24} />
          </button>
        )}
        <button type="button" className={`m-tab ${currentTab === 'calendar' ? 'active' : ''}`} onClick={() => setCurrentTab('calendar')}>
          <Calendar size={24} className="m-tab-icon" />
        </button>
        <button type="button" className={`m-tab ${currentTab === 'profile' ? 'active' : ''}`} onClick={() => setCurrentTab('profile')}>
          <User size={24} className="m-tab-icon" />
        </button>
      </nav>

      {/* ═══════════════════════════════════════════
          ACTION SHEET
         ═══════════════════════════════════════════ */}
      {showActionSheet && selectedEvent && (
        <>
          <div className="m-sheet-overlay" onClick={closeActionSheet} role="presentation" />
          <div className="m-sheet">
            <div className="m-sheet-handle" />
            <h3 className="m-sheet-title">{selectedEvent.place || 'Untitled Event'}</h3>

            <div className="m-action-grid">
              <button type="button" className="m-action-btn" onClick={() => openDetail(selectedEvent)}>
                <span className="m-action-icon"><ClipboardList size={18} /></span>
                <span className="m-action-label">Details</span>
              </button>

              {canEditSchedule(selectedEvent) && selectedEvent.status !== 'completed' && selectedEvent.status !== 'ongoing' && (
                <button type="button" className="m-action-btn" onClick={handleActionStart}>
                  <span className="m-action-icon"><Play size={18} /></span>
                  <span className="m-action-label">Start</span>
                </button>
              )}

              {canEditSchedule(selectedEvent) && selectedEvent.status === 'ongoing' && (
                <button type="button" className="m-action-btn" onClick={handleActionComplete}>
                  <span className="m-action-icon"><Check size={18} /></span>
                  <span className="m-action-label">Complete</span>
                </button>
              )}

              {canEditSchedule(selectedEvent) && selectedEvent.status !== 'cancelled' && (
                <button type="button" className="m-action-btn danger" onClick={handleActionCancel}>
                  <span className="m-action-icon" style={{ color: '#FF4444' }}><X size={18} /></span>
                  <span className="m-action-label" style={{ color: '#FF4444' }}>Cancel</span>
                </button>
              )}

              {canDeleteSchedule(selectedEvent) && (
                <button type="button" className="m-action-btn danger" onClick={handleActionDelete}>
                  <span className="m-action-icon"><Trash2 size={18} /></span>
                  <span className="m-action-label">Delete</span>
                </button>
              )}
            </div>

            <button type="button" className="m-sheet-cancel" onClick={closeActionSheet}>
              Cancel
            </button>
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════════
          DETAIL SHEET
         ═══════════════════════════════════════════ */}
      {showDetail && selectedEvent && (
        <>
          <div className="m-sheet-overlay" onClick={closeDetail} role="presentation" />
          <div className="m-sheet m-sheet-detail">
            <div className="m-sheet-handle" />
            <h3 className="m-sheet-title">{selectedEvent.place || 'Untitled Event'}</h3>

            <div className="m-detail-sections">
              {/* Date */}
              <div className="m-detail-row">
                <span className="m-detail-icon"><Calendar size={18} /></span>
                <div className="m-detail-content">
                  <span className="m-detail-label">Date</span>
                  <span className="m-detail-value">
                    {toDate(selectedEvent.date)
                      ? toDate(selectedEvent.date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })
                      : 'No date set'}
                  </span>
                </div>
              </div>

              {/* Time */}
              <div className="m-detail-row">
                <span className="m-detail-icon"><Clock size={18} /></span>
                <div className="m-detail-content">
                  <span className="m-detail-label">Time</span>
                  <span className="m-detail-value">{formatTime(selectedEvent.date) || 'No time set'}</span>
                </div>
              </div>

              {/* Location */}
              {selectedEvent.location && !selectedEvent.location.includes('google.com/calendar/event') && (
                <div className="m-detail-row">
                  <span className="m-detail-icon"><MapPin size={18} /></span>
                  <div className="m-detail-content">
                    <span className="m-detail-label">Location</span>
                    <span className="m-detail-value">{selectedEvent.location}</span>
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedEvent.notes && (
                <div className="m-detail-row">
                  <span className="m-detail-icon"><Edit3 size={18} /></span>
                  <div className="m-detail-content">
                    <span className="m-detail-label">Notes</span>
                    <span className="m-detail-value">{selectedEvent.notes}</span>
                  </div>
                </div>
              )}

              {/* Assignment */}
              {selectedEvent.assignmentTask && (
                <div className="m-detail-section m-detail-warning">
                  <div className="m-detail-section-header">
                    <span className="m-detail-icon"><Zap size={18} /></span>
                    <span className="m-detail-section-title">Assignment</span>
                  </div>
                  <p className="m-detail-section-text">{selectedEvent.assignmentTask}</p>
                  {selectedEvent.assignmentDue && (
                    <p className="m-detail-section-meta">Due: {selectedEvent.assignmentDue}</p>
                  )}
                  {selectedEvent.assignmentLink && (
                    <a
                      href={selectedEvent.assignmentLink}
                      className="m-detail-section-link"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open Link →
                    </a>
                  )}
                </div>
              )}

              {/* Review */}
              {(selectedEvent.reviewLearned || selectedEvent.reviewNotes) && (
                <div className="m-detail-section m-detail-success">
                  <div className="m-detail-section-header">
                    <span className="m-detail-section-title">Review</span>
                  </div>
                  {selectedEvent.reviewLearned && (
                    <p className="m-detail-section-text">
                      <strong>Learned:</strong> {selectedEvent.reviewLearned}
                    </p>
                  )}
                  {selectedEvent.reviewNotes && (
                    <p className="m-detail-section-text">
                      <strong>Notes:</strong> {selectedEvent.reviewNotes}
                    </p>
                  )}
                </div>
              )}
            </div>

            <button type="button" className="m-sheet-cancel" onClick={closeDetail}>
              Close
            </button>
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════════
          CREATE MODAL
         ═══════════════════════════════════════════ */}
      {showCreate && (
        <>
          <div className="m-modal-overlay" onClick={() => setShowCreate(false)} role="presentation" />
          <div className="m-modal">
            <div className="m-sheet-handle" />
            <div className="m-modal-header">
              <h3 className="m-modal-title">New Event</h3>
              <button type="button" className="m-modal-close" onClick={() => setShowCreate(false)} aria-label="Close">
                <X size={24} className="m-close-icon" />
              </button>
            </div>

            <form className="m-create-form" onSubmit={handleCreate}>
              <div className="m-form-group">
                <label className="m-form-label" htmlFor="m-create-date">Date *</label>
                <DatePicker 
                  value={createDate} 
                  onChange={setCreateDate} 
                />
              </div>

              <div className="m-form-group">
                <label className="m-form-label" htmlFor="m-create-time">Time</label>
                <input
                  id="m-create-time"
                  className="m-form-input"
                  type="time"
                  value={createTime}
                  onChange={(e) => setCreateTime(e.target.value)}
                />
              </div>

              <div className="m-form-group">
                <label className="m-form-label" htmlFor="m-create-title">Title *</label>
                <input
                  id="m-create-title"
                  className="m-form-input"
                  type="text"
                  placeholder="Event name"
                  value={createTitle}
                  onChange={(e) => setCreateTitle(e.target.value)}
                  required
                />
              </div>

              <div className="m-form-group">
                <label className="m-form-label" htmlFor="m-create-location">Location</label>
                <input
                  id="m-create-location"
                  className="m-form-input"
                  type="text"
                  placeholder="Room or link"
                  value={createLocation}
                  onChange={(e) => setCreateLocation(e.target.value)}
                />
              </div>

              <div className="m-form-group">
                <label className="m-form-label" htmlFor="m-create-notes">Notes</label>
                <textarea
                  id="m-create-notes"
                  className="m-form-input m-form-textarea"
                  placeholder="Additional notes..."
                  value={createNotes}
                  onChange={(e) => setCreateNotes(e.target.value)}
                  rows={3}
                />
              </div>

              <button type="submit" className="m-form-submit" disabled={creating}>
                {creating ? 'Creating...' : 'Create Event'}
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
