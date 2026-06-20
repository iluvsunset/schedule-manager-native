import React, { useState } from 'react';
import { formatTime } from '../../utils/helpers';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { Eye, Play, Check, X, Trash2, Clock, Send, Share2, Edit3 } from 'lucide-react';

export default function CalendarView({ schedules, onSelectEvent, onStart, onComplete, onDelete, onCancel, onEdit, onShare, onSendReminder }) {
  const { canEditSchedule, canDeleteSchedule, userRole } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [direction, setDirection] = useState(0);
  const [selectedDayEvents, setSelectedDayEvents] = useState(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthLabel = currentDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

  const prevMonth = () => {
    setDirection(-1);
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setDirection(1);
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToday = () => {
    const newDate = new Date();
    setDirection(newDate > currentDate ? 1 : (newDate < currentDate ? -1 : 0));
    setCurrentDate(newDate);
  };

  // Generate cells
  const cells = [];

  // Spacers for preceding month
  for (let i = 0; i < firstDayIndex; i++) {
    cells.push({ type: 'empty', key: `empty-prev-${i}` });
  }

  // Days in current month
  for (let day = 1; day <= daysInMonth; day++) {
    const isToday = isCurrentMonth && today.getDate() === day;
    
    // Filter schedules matching this day
    const dayEvents = schedules.filter(s => {
      try {
        const d = s.date?.toDate ? s.date.toDate() : new Date(s.date);
        return d.getDate() === day && d.getMonth() === month && d.getFullYear() === year;
      } catch (e) {
        return false;
      }
    });

    cells.push({
      type: 'day',
      day,
      isToday,
      events: dayEvents,
      key: `day-${day}`
    });
  }

  // Spacers for succeeding month to complete standard grid (rows of 7)
  const totalCells = cells.length;
  const remainingCells = (7 - (totalCells % 7)) % 7;
  for (let i = 0; i < remainingCells; i++) {
    cells.push({ type: 'empty', key: `empty-next-${i}` });
  }

  // Group into weeks
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  const handleDayClick = (cell) => {
    if (cell.events.length >= 1) {
      const dateLabel = new Date(year, month, cell.day).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric'
      });
      setSelectedDayEvents({
        day: cell.day,
        dateLabel,
        events: cell.events
      });
    }
  };

  return (
    <div className="content-panel">
      <div className="panel-header">
        <h2>{monthLabel}</h2>
        <div className="panel-actions">
          <button className="btn-icon" onClick={prevMonth} title="Previous Month">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>
          <motion.button 
            className="btn btn-ghost" 
            onClick={goToday}
            whileTap={{ scale: 0.85 }}
            animate={isCurrentMonth ? { scale: [1, 1.02, 1], opacity: [1, 0.8, 1] } : {}}
            transition={isCurrentMonth ? { repeat: Infinity, duration: 2, ease: "easeInOut" } : {}}
          >
            Today
          </motion.button>
          <button className="btn-icon" onClick={nextMonth} title="Next Month">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
        </div>
      </div>

      <div className="calendar-wrapper" style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
        <div className="calendar-weekdays">
          <div>Sun</div>
          <div>Mon</div>
          <div>Tue</div>
          <div>Wed</div>
          <div>Thu</div>
          <div>Fri</div>
          <div>Sat</div>
        </div>
        <div style={{ position: 'relative', flex: 1 }}>
          <AnimatePresence custom={direction} mode="popLayout" initial={false}>
            <motion.div
              key={`${year}-${month}`}
              custom={direction}
              className="calendar-days"
              style={{ display: 'flex', flexDirection: 'column', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
              initial="enter"
              animate="center"
              exit="exit"
              variants={{
                enter: { opacity: 1 },
                center: { opacity: 1 },
                exit: { opacity: 0, transition: { duration: 0.3, ease: "easeIn" } }
              }}
            >
              {weeks.map((week, wIndex) => (
                <motion.div
                  key={`week-${wIndex}`}
                  custom={direction}
                  variants={{
                    enter: (d) => ({ x: d === 0 ? 0 : (d > 0 ? 20 : -20), opacity: 0 }),
                    center: { x: 0, opacity: 1, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: wIndex * 0.03 } },
                    exit: (d) => ({ x: d === 0 ? 0 : (d > 0 ? -20 : 20), opacity: 0, transition: { duration: 0.3, ease: "easeIn" } })
                  }}
                  style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', flex: 1 }}
                >
                  {week.map((cell) => {
                    if (cell.type === 'empty') {
                      return <div key={cell.key} className="day-cell empty" />;
                    }

                    return (
                      <motion.div 
                        key={cell.key} 
                        className={`day-cell ${cell.isToday ? 'today' : ''}`}
                        onClick={() => cell.events.length > 0 && handleDayClick(cell)}
                        whileTap={{ scale: 0.92 }}
                      >
                        {cell.isToday ? (
                          <motion.div 
                            className="day-header"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1], delay: 0.15 }}
                          >
                            {cell.day}
                          </motion.div>
                        ) : (
                          <div className="day-header">{cell.day}</div>
                        )}
                        {cell.events.length > 0 && (
                          <div className="day-events">
                            {cell.events.map((ev, evIndex) => (
                              <motion.div 
                                key={ev.id} 
                                className={`event-dot ${ev.status === 'completed' ? 'completed' : ''} ${ev.source === 'google_calendar' ? 'gcal' : ''}`}
                                title={ev.place}
                                initial={{ x: -6, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: evIndex * 0.05 }}
                                whileHover={{ y: -1 }}
                                whileTap={{ scale: 0.96 }}
                                style={{ textDecoration: 'none' }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (cell.events.length > 1) {
                                    handleDayClick(cell);
                                  } else {
                                    onSelectEvent(ev);
                                  }
                                }}
                              >
                                {ev.source === 'google_calendar' && <span style={{ marginRight: '3px' }}>📅</span>}
                                {ev.place}
                              </motion.div>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {selectedDayEvents && (
          <div 
            className="modal-backdrop"
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.65)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
            }}
            onClick={() => setSelectedDayEvents(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              style={{
                background: 'rgba(20, 20, 25, 0.92)',
                backdropFilter: 'blur(24px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '20px',
                width: '90%',
                maxWidth: '440px',
                boxShadow: '0 24px 60px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                padding: '24px',
                color: '#F2F2F7',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.3px' }}>Events on this Day</h3>
                  <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#A2A2A7', fontWeight: 500 }}>{selectedDayEvents.dateLabel}</p>
                </div>
                <button
                  onClick={() => setSelectedDayEvents(null)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: 'none',
                    borderRadius: '50%',
                    color: '#D1D1D6',
                    cursor: 'pointer',
                    padding: '6px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
                    e.currentTarget.style.color = '#FFFFFF';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                    e.currentTarget.style.color = '#D1D1D6';
                  }}
                >
                  <X size={16} strokeWidth={2.5} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '350px', overflowY: 'auto', paddingRight: '4px' }}>
                {selectedDayEvents.events.map((ev) => {
                  const isGcal = ev.source === 'google_calendar';
                  const isCompleted = ev.status === 'completed';
                  const isOngoing = ev.status === 'ongoing';
                  const isCancelled = ev.status === 'cancelled';
                  
                  let dotColor = '#FFC01E'; // upcoming
                  if (isCompleted) {
                    dotColor = '#10B981';
                  } else if (isOngoing) {
                    dotColor = '#3B82F6';
                  } else if (isCancelled) {
                    dotColor = '#EF4444';
                  } else if (isGcal) {
                    dotColor = '#007AFF';
                  }

                  return (
                    <div
                      key={ev.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%',
                        padding: '14px 16px',
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.07)',
                        borderRadius: '14px',
                        gap: '12px',
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.07)';
                      }}
                    >
                      <div
                        onClick={() => {
                          onSelectEvent(ev);
                          setSelectedDayEvents(null);
                        }}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          flex: 1,
                          minWidth: 0,
                          cursor: 'pointer'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: dotColor,
                            flexShrink: 0
                          }} />
                          <span style={{
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            color: isCancelled ? '#8E8E93' : '#FFFFFF',
                            textDecoration: isCancelled ? 'line-through' : 'none',
                            fontWeight: 600,
                            fontSize: '14px'
                          }}>{ev.place}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#8E8E93' }}>
                          {ev.date && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Clock size={12} />
                              {formatTime(ev.date?.toDate ? ev.date.toDate() : new Date(ev.date))}
                            </span>
                          )}
                          <span style={{
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: isGcal ? 'rgba(59, 130, 246, 0.12)' : 'rgba(255, 255, 255, 0.06)',
                            color: isGcal ? '#3B82F6' : '#AEAEB2',
                            fontSize: '10px',
                            fontWeight: 600
                          }}>
                            {isGcal ? 'GCal' : 'Class'}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                        {/* View Details */}
                        <button
                          onClick={() => {
                            onSelectEvent(ev);
                            setSelectedDayEvents(null);
                          }}
                          title="View Details"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            color: '#AEAEB2',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                            e.currentTarget.style.color = '#FFFFFF';
                            e.currentTarget.style.transform = 'scale(1.08)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                            e.currentTarget.style.color = '#AEAEB2';
                            e.currentTarget.style.transform = 'none';
                          }}
                        >
                          <Eye size={13} />
                        </button>

                        {/* Start (Play) */}
                        {canEditSchedule && canEditSchedule(ev) && ev.status !== 'completed' && ev.status !== 'ongoing' && onStart && (
                          <button
                            onClick={() => {
                              onStart(ev.id);
                              setSelectedDayEvents(null);
                            }}
                            title="Start Event"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '28px',
                              height: '28px',
                              borderRadius: '50%',
                              background: 'rgba(16, 185, 129, 0.1)',
                              border: '1px solid rgba(16, 185, 129, 0.2)',
                              color: '#10B981',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'rgba(16, 185, 129, 0.25)';
                              e.currentTarget.style.border = '1px solid rgba(16, 185, 129, 0.4)';
                              e.currentTarget.style.transform = 'scale(1.08)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)';
                              e.currentTarget.style.border = '1px solid rgba(16, 185, 129, 0.2)';
                              e.currentTarget.style.transform = 'none';
                            }}
                          >
                            <Play size={12} fill="#10B981" />
                          </button>
                        )}

                        {/* Complete (Check) */}
                        {canEditSchedule && canEditSchedule(ev) && ev.status === 'ongoing' && onComplete && (
                          <button
                            onClick={() => {
                              onComplete(ev.id);
                              setSelectedDayEvents(null);
                            }}
                            title="Complete Event"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '28px',
                              height: '28px',
                              borderRadius: '50%',
                              background: 'rgba(16, 185, 129, 0.1)',
                              border: '1px solid rgba(16, 185, 129, 0.2)',
                              color: '#10B981',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'rgba(16, 185, 129, 0.25)';
                              e.currentTarget.style.border = '1px solid rgba(16, 185, 129, 0.4)';
                              e.currentTarget.style.transform = 'scale(1.08)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)';
                              e.currentTarget.style.border = '1px solid rgba(16, 185, 129, 0.2)';
                              e.currentTarget.style.transform = 'none';
                            }}
                          >
                            <Check size={12} strokeWidth={3} />
                          </button>
                        )}

                        {/* Cancel (X) */}
                        {canEditSchedule && canEditSchedule(ev) && ev.status !== 'cancelled' && ev.status !== 'completed' && onCancel && (
                          <button
                            onClick={() => {
                              onCancel(ev.id);
                              setSelectedDayEvents(null);
                            }}
                            title="Cancel Event"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '28px',
                              height: '28px',
                              borderRadius: '50%',
                              background: 'rgba(239, 68, 68, 0.1)',
                              border: '1px solid rgba(239, 68, 68, 0.2)',
                              color: '#EF4444',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.25)';
                              e.currentTarget.style.border = '1px solid rgba(239, 68, 68, 0.4)';
                              e.currentTarget.style.transform = 'scale(1.08)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                              e.currentTarget.style.border = '1px solid rgba(239, 68, 68, 0.2)';
                              e.currentTarget.style.transform = 'none';
                            }}
                          >
                            <X size={12} strokeWidth={2.5} />
                          </button>
                        )}

                        {/* Send Email Reminder */}
                        {userRole !== 'student' && onSendReminder && (
                          <button
                            onClick={() => {
                              onSendReminder(ev.id);
                              setSelectedDayEvents(null);
                            }}
                            title="Send Email Reminder"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '28px',
                              height: '28px',
                              borderRadius: '50%',
                              background: 'rgba(59, 130, 246, 0.1)',
                              border: '1px solid rgba(59, 130, 246, 0.2)',
                              color: '#3B82F6',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'rgba(59, 130, 246, 0.25)';
                              e.currentTarget.style.border = '1px solid rgba(59, 130, 246, 0.4)';
                              e.currentTarget.style.transform = 'scale(1.08)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)';
                              e.currentTarget.style.border = '1px solid rgba(59, 130, 246, 0.2)';
                              e.currentTarget.style.transform = 'none';
                            }}
                          >
                            <Send size={11} />
                          </button>
                        )}

                        {/* Share */}
                        {canEditSchedule && canEditSchedule(ev) && onShare && (
                          <button
                            onClick={() => {
                              onShare(ev);
                              setSelectedDayEvents(null);
                            }}
                            title="Share Event"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '28px',
                              height: '28px',
                              borderRadius: '50%',
                              background: 'rgba(255, 255, 255, 0.05)',
                              border: '1px solid rgba(255, 255, 255, 0.08)',
                              color: '#AEAEB2',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                              e.currentTarget.style.color = '#FFFFFF';
                              e.currentTarget.style.transform = 'scale(1.08)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                              e.currentTarget.style.color = '#AEAEB2';
                              e.currentTarget.style.transform = 'none';
                            }}
                          >
                            <Share2 size={12} />
                          </button>
                        )}

                        {/* Edit */}
                        {canEditSchedule && canEditSchedule(ev) && onEdit && (
                          <button
                            onClick={() => {
                              onEdit(ev);
                              setSelectedDayEvents(null);
                            }}
                            title="Edit Event"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '28px',
                              height: '28px',
                              borderRadius: '50%',
                              background: 'rgba(255, 255, 255, 0.05)',
                              border: '1px solid rgba(255, 255, 255, 0.08)',
                              color: '#AEAEB2',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                              e.currentTarget.style.color = '#FFFFFF';
                              e.currentTarget.style.transform = 'scale(1.08)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                              e.currentTarget.style.color = '#AEAEB2';
                              e.currentTarget.style.transform = 'none';
                            }}
                          >
                            <Edit3 size={12} />
                          </button>
                        )}

                        {/* Delete (Trash) */}
                        {canDeleteSchedule && canDeleteSchedule(ev) && onDelete && (
                          <button
                            onClick={() => {
                              onDelete(ev.id);
                              setSelectedDayEvents(null);
                            }}
                            title="Delete Event"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '28px',
                              height: '28px',
                              borderRadius: '50%',
                              background: 'rgba(239, 68, 68, 0.1)',
                              border: '1px solid rgba(239, 68, 68, 0.2)',
                              color: '#EF4444',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.25)';
                              e.currentTarget.style.border = '1px solid rgba(239, 68, 68, 0.4)';
                              e.currentTarget.style.transform = 'scale(1.08)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                              e.currentTarget.style.border = '1px solid rgba(239, 68, 68, 0.2)';
                              e.currentTarget.style.transform = 'none';
                            }}
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
