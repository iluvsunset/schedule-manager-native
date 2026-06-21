import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getRelativeTime, formatTime } from '../../utils/helpers';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarDays, Plus, ExternalLink, Share2, Play, Check, Send, Edit3, Trash2 } from 'lucide-react';
import { openExternalUrl } from '../../platform';

export default function ScheduleList({ 
  schedules, 
  onViewDetails, 
  onEdit, 
  onShare, 
  onDelete, 
  onStart, 
  onComplete, 
  onSendReminder,
  onOpenCreate,
  onCancel
}) {
  const { userRole, can, canEditSchedule, canDeleteSchedule } = useAuth();
  const [filter, setFilter] = useState('all');

  const todayZero = new Date();
  todayZero.setHours(0, 0, 0, 0);

  const filtered = schedules.filter(s => {
    const status = s.status || 'upcoming';
    const d = s.date?.toDate ? s.date.toDate() : new Date(s.date);
    if (!d) return false;
    const sDateZero = new Date(d);
    sDateZero.setHours(0, 0, 0, 0);

    if (filter === 'ongoing') return status === 'ongoing';
    if (filter === 'upcoming') return status !== 'completed' && status !== 'ongoing' && status !== 'cancelled' && sDateZero >= todayZero;
    if (filter === 'past') return status === 'completed' || status === 'cancelled' || (status !== 'ongoing' && sDateZero < todayZero);
    return true;
  });

  if (filter === 'upcoming') {
    filtered.sort((a, b) => {
      const ad = a.date?.toDate ? a.date.toDate() : new Date(a.date);
      const bd = b.date?.toDate ? b.date.toDate() : new Date(b.date);
      return ad - bd;
    });
  } else {
    filtered.sort((a, b) => {
      const ad = a.date?.toDate ? a.date.toDate() : new Date(a.date);
      const bd = b.date?.toDate ? b.date.toDate() : new Date(b.date);
      return bd - ad;
    });
  }

  const showCreateBtn = can('create_schedule');

  return (
    <div className="content-panel">
      <div className="panel-header">
        <h2>Schedule</h2>
        <div className="panel-actions">
          <div className="filter-tabs">
            {['all', 'ongoing', 'upcoming', 'past'].map(f => (
              <button 
                key={f}
                className={`filter-tab ${filter === f ? 'active' : ''}`}
                onClick={() => setFilter(f)}
              >
                {f === 'ongoing' ? 'Live' : f === 'past' ? 'History' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          {showCreateBtn && (
            <button className="btn btn-primary" onClick={onOpenCreate} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={16} />
              New Event
            </button>
          )}
        </div>
      </div>

      <div className="schedules-list">
        {filtered.length === 0 ? (
          <div className="empty-state" style={{ padding: '60px 20px', textAlign: 'center' }}>
            <div className="empty-icon" style={{ marginBottom: '12px', color: 'var(--text-secondary)' }}>
              <CalendarDays size={48} />
            </div>
            <h3>No events found</h3>
            <p style={{ color: 'var(--text-secondary)' }}>Try adjusting your filters or check back later.</p>
          </div>
        ) : (
          <AnimatePresence>
            {filtered.map((schedule, index) => {
            const date = schedule.date?.toDate ? schedule.date.toDate() : new Date(schedule.date);
            const isOngoing = schedule.status === 'ongoing';
            const isCancelled = schedule.status === 'cancelled';
            const relativeTime = !isOngoing && !isCancelled ? getRelativeTime(date) : null;
            const showEdit = canEditSchedule(schedule);
            const showDelete = canDeleteSchedule(schedule);

            let linkUrl = null;
            if (schedule.location && (schedule.location.startsWith('http') || schedule.location.startsWith('www')) && !schedule.location.includes('google.com/calendar/event')) {
              linkUrl = schedule.location.startsWith('www') ? 'https://' + schedule.location : schedule.location;
            }

            const sourceTag = schedule.source === 'google_calendar' ? (
              <span className="gcal-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#4285F4' }}>
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                  <circle cx="9" cy="15" r="1.5" fill="#EA4335" stroke="none"></circle>
                  <circle cx="15" cy="15" r="1.5" fill="#34A853" stroke="none"></circle>
                </svg>
                Google Calendar
              </span>
            ) : null;

            return (
              <motion.div 
                key={schedule.id}
                initial={{ opacity: 0, y: 20, height: 'auto', marginBottom: 12 }}
                animate={{ opacity: 1, y: 0, height: 'auto', marginBottom: 12, transition: { duration: 0.3, ease: 'easeOut', delay: index * 0.04 } }}
                exit={{ opacity: 0, height: 0, marginBottom: 0, scale: 0.95, padding: 0, border: 0, transition: { duration: 0.25, ease: 'easeIn' } }}
                className={`schedule-item stagger-item ${schedule.status === 'completed' || isCancelled ? 'past' : ''} ${isOngoing ? 'ongoing' : ''}`}
                onClick={(e) => {
                  if (!e.target.closest('.schedule-actions-wrapper') && !e.target.closest('.action-btn')) {
                    onViewDetails(schedule);
                  }
                }}
              >
                <div className="schedule-card-header">
                  <div className="date-badge">
                    <span className="date-month">
                      {date.toLocaleString('en-US', { month: 'short' }).toUpperCase()}
                    </span>
                    <span className="date-day">{date.getDate()}</span>
                  </div>
                  <div className="schedule-content">
                    <div className="schedule-title" style={{ textDecoration: isCancelled ? 'line-through' : 'none', color: isCancelled ? 'var(--text-secondary)' : 'inherit' }}>
                      {schedule.place}
                      {sourceTag}
                    </div>
                    <div className="schedule-time-row">
                      {isCancelled && <span className="status-tag" style={{ background: '#FFEEEE', color: '#FF4444' }}>CANCELLED</span>}
                      {isOngoing && <span className="status-tag live">LIVE</span>}
                      {relativeTime && <span className="relative-badge">{relativeTime}</span>}
                      <span className="schedule-weekday">{date.toLocaleString('en-US', { weekday: 'short' })}</span>
                      <span>{formatTime(date)}</span>
                    </div>
                    {schedule.location && !schedule.location.includes('google.com/calendar/event') && (
                      <div className="schedule-location" style={{ marginTop: '4px', fontSize: '12px', color: 'var(--brand-primary)', wordBreak: 'break-all' }}>
                        📍 {schedule.location}
                      </div>
                    )}
                  </div>
                </div>

                <div className="schedule-actions-wrapper" onClick={(e) => e.stopPropagation()}>
                  {linkUrl && (
                    <button className="action-btn" onClick={() => openExternalUrl(linkUrl)} title="Join Event" style={{ color: 'var(--brand-primary)' }}>
                      <ExternalLink size={15} />
                    </button>
                  )}
                  {can('share_event') && (
                    <button className="action-btn" onClick={() => onShare(schedule)} title="Share Settings">
                      <Share2 size={15} />
                    </button>
                  )}
                  {showEdit && schedule.status !== 'completed' && !isOngoing && (
                    <button className="action-btn" onClick={() => onStart(schedule.id)} title="Start Event" style={{ color: 'var(--color-success)' }}>
                      <Play size={15} />
                    </button>
                  )}
                  {showEdit && isOngoing && (
                    <button className="action-btn" onClick={() => onComplete(schedule.id)} title="Complete Event" style={{ color: 'var(--color-success)' }}>
                      <Check size={15} />
                    </button>
                  )}
                  {showEdit && (
                    <button className="action-btn" onClick={() => onSendReminder(schedule.id)} title="Send Email Reminder">
                      <Send size={15} />
                    </button>
                  )}
                  {showEdit && schedule.status !== 'cancelled' && (
                    <button className="action-btn danger" onClick={() => onCancel && onCancel(schedule.id)} title="Cancel Event" style={{ color: '#FF4444' }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
                    </button>
                  )}
                  {showEdit && (
                    <button className="action-btn" onClick={() => onEdit(schedule)} title="Edit Details">
                      <Edit3 size={15} />
                    </button>
                  )}
                  {showDelete && (
                    <button className="action-btn danger" onClick={() => onDelete(schedule.id)} title="Delete Event">
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
