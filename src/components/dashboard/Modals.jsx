import React from 'react';

import { useState, useEffect } from 'react';
import AsyncButton from '../AsyncButton';
import DatePicker from '../ui/DatePicker';
import { getWebDomain } from '../../platform';
function ModalWrapper({ isOpen, onClose, children, maxWidth = '500px' }) {
  const [render, setRender] = useState(isOpen);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setRender(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setAnimate(true);
        });
      });
    } else {
      setAnimate(false);
    }
  }, [isOpen]);

  const handleTransitionEnd = (e) => {
    if (e.target.classList.contains('modal-wrapper') && !animate) {
      setRender(false);
    }
  };

  if (!render) return null;

  return (
    <div 
      className="modal-wrapper modal active" 
      onTransitionEnd={handleTransitionEnd}
      onClick={(e) => {
        if (e.target.classList.contains('modal-wrapper')) onClose();
      }}
      style={{
        opacity: animate ? 1 : 0,
        backdropFilter: animate ? 'blur(10px)' : 'blur(0px)',
        WebkitBackdropFilter: animate ? 'blur(10px)' : 'blur(0px)',
        transition: animate ? 'opacity 200ms ease, backdrop-filter 200ms ease' : 'opacity 180ms ease, backdrop-filter 180ms ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(4, 4, 6, 0.7)'
      }}
    >
      <div 
        className="modal-content"
        style={{ 
          maxWidth, 
          width: '100%',
          opacity: animate ? 1 : 0,
          transform: animate ? 'scale(1)' : 'scale(0.95)',
          transition: animate ? 'opacity 320ms ease, transform 320ms ease' : 'opacity 180ms ease, transform 180ms ease',
          willChange: 'transform, opacity'
        }}
        onClick={e => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

import { doc, getDoc, addDoc, updateDoc, deleteDoc, collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { showMessage, sendDynamicEmail, formatTime, formatDate } from '../../utils/helpers';

import { AlertTriangle, Calendar, Clock, MapPin, FileText, Link, Zap, CheckCircle, Globe, Lock, X } from 'lucide-react';

// ── CONFIRM MODAL ──────────────────────────────────────────────
export function ConfirmModal({ isOpen, message, onConfirm, onCancel }) {
  return (
    <ModalWrapper isOpen={isOpen} onClose={onCancel} maxWidth="400px">
      <div style={{ textAlign: 'center', padding: '32px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px', color: 'var(--color-warning)' }}>
          <AlertTriangle size={48} />
        </div>
        <h3 style={{ marginBottom: '24px', fontSize: '16px', fontWeight: 600 }}>{message}</h3>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button className="btn btn-secondary" onClick={onCancel} style={{ minWidth: '100px' }}>Cancel</button>
          <button className="btn btn-primary" onClick={onConfirm} style={{ minWidth: '100px', background: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}>Confirm</button>
        </div>
        </div>
      </ModalWrapper>
  );
}

// ── DETAIL MODAL ──────────────────────────────────────────────
export function EventDetailModal({ isOpen, onClose, schedule }) {
  if (!schedule) return null;
  const date = schedule.date ? (schedule.date.toDate ? schedule.date.toDate() : new Date(schedule.date)) : null;
  const dueDisplay = schedule.assignmentDue ? new Date(schedule.assignmentDue).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} maxWidth="500px">
        <div className="modal-header">
          <h3>{schedule.place}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="detail-group">
            <div className="detail-row">
              <div className="detail-icon"><Calendar size={16} /></div>
              <div className="detail-content">
                <div className="detail-label">Date</div>
                <div className="detail-value">{date ? date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : 'All Day'}</div>
              </div>
            </div>
            <div className="detail-row">
              <div className="detail-icon"><Clock size={16} /></div>
              <div className="detail-content">
                <div className="detail-label">Time</div>
                <div className="detail-value">{date ? formatTime(date) : 'All Day'}</div>
              </div>
            </div>
            {schedule.location && !schedule.location.includes('google.com/calendar/event') && (
              <div className="detail-row">
                <div className="detail-icon"><MapPin size={16} /></div>
                <div className="detail-content">
                  <div className="detail-label">Location</div>
                  <div className="detail-value">
                    <a href={schedule.location.startsWith('http') || schedule.location.startsWith('www') ? (schedule.location.startsWith('www') ? 'https://' + schedule.location : schedule.location) : '#'} target="_blank" rel="noreferrer" style={{ color: 'var(--brand-primary)' }}>
                      {schedule.location}
                    </a>
                  </div>
                </div>
              </div>
            )}
            {schedule.notes && (
              <div className="detail-row">
                <div className="detail-icon"><FileText size={16} /></div>
                <div className="detail-content">
                  <div className="detail-label">Notes</div>
                  <div className="detail-value" style={{ whiteSpace: 'pre-wrap' }}>{schedule.notes}</div>
                </div>
              </div>
            )}
            {schedule.source === 'google_calendar' && (
              <div className="detail-row">
                <div className="detail-icon"><Link size={16} /></div>
                <div className="detail-content">
                  <div className="detail-label">Source</div>
                  <div className="detail-value" style={{ color: 'var(--text-secondary)' }}>Imported from Google Calendar</div>
                </div>
              </div>
            )}
          </div>

          {schedule.assignmentTask && (
            <div className="detail-group" style={{ borderColor: 'rgba(245, 158, 11, 0.3)', background: 'rgba(245, 158, 11, 0.04)' }}>
              <div className="detail-row">
                <div className="detail-icon"><Zap size={16} color="var(--color-warning)" /></div>
                <div className="detail-content">
                  <div className="detail-label" style={{ color: 'var(--color-warning)' }}>Assignment</div>
                  <div className="detail-value">{schedule.assignmentTask}</div>
                  {dueDisplay && <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>Due: {dueDisplay}</div>}
                  {schedule.assignmentLink && (
                    <a href={schedule.assignmentLink.startsWith('http') ? schedule.assignmentLink : 'https://' + schedule.assignmentLink} target="_blank" rel="noreferrer" className="task-link" style={{ display: 'inline-block', marginTop: '6px', fontSize: '13px', color: 'var(--brand-primary)' }}>
                      Open Resource →
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}

          {(schedule.reviewLearned || schedule.reviewNotes) && (
            <div className="detail-group" style={{ borderColor: 'rgba(16, 185, 129, 0.3)', background: 'rgba(16, 185, 129, 0.04)' }}>
              <div className="detail-row">
                <div className="detail-icon"><CheckCircle size={16} color="var(--color-success)" /></div>
                <div className="detail-content">
                  <div className="detail-label" style={{ color: 'var(--color-success)' }}>Review</div>
                  {schedule.reviewLearned && <div className="detail-value" style={{ marginBottom: '8px' }}>{schedule.reviewLearned}</div>}
                  {schedule.reviewNotes && <div className="detail-value" style={{ fontStyle: 'italic', opacity: 0.8 }}>"{schedule.reviewNotes}"</div>}
                </div>
              </div>
            </div>
          )}
        </div>
    </ModalWrapper>
  );
}

// ── CREATE EVENT MODAL ────────────────────────────────────────
export function CreateEventModal({ isOpen, onClose, selectedClassContext, schedules, currentUser }) {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [place, setPlace] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [confirmAction, setConfirmAction] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedClassContext) {
      showMessage('Select a class context first!', 'error');
      return;
    }

    // Conflict check
    const conflict = schedules.find(s => {
      if (s.status === 'completed') return false;
      const d = s.date?.toDate ? s.date.toDate() : new Date(s.date);
      const sDate = d.toISOString().split('T')[0];
      const sTime = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
      return sDate === date && sTime === time && s.classId === selectedClassContext;
    });

    if (conflict) {
      setConfirmAction({
        message: `⚠️ Conflict: "${conflict.place}" at this time. Add anyway?`,
        onConfirm: async () => {
          setConfirmAction(null);
          await proceedCreate(dateTime, allClassParticipants);
        }
      });
      return;
    }

    await proceedCreate(dateTime, allClassParticipants);
  };

  const proceedCreate = async (dateTime, allClassParticipants) => {
    try {
      const classSnap = await getDoc(doc(db, 'classes', selectedClassContext));
      const scheduleData = {
        userId: currentUser.uid,
        userEmail: currentUser.email.toLowerCase(),
        classId: selectedClassContext,
        className: classSnap.exists() ? classSnap.data().className : '',
        date: Timestamp.fromDate(dateTime),
        place,
        location,
        notes,
        participants: allClassParticipants,
        createdAt: Timestamp.now(),
        status: 'upcoming'
      };

      await addDoc(collection(db, 'schedules'), scheduleData);

      // Send notifications to students
      const studentEmails = [];
      for (const email of allClassParticipants) {
        const uSnap = await getDoc(doc(db, 'allowed_users', email.toLowerCase()));
        if (uSnap.exists() && uSnap.data().role === 'student') {
          studentEmails.push(email);
        }
      }

      if (studentEmails.length > 0) {
        showMessage('Sending notifications...', 'success');
        const formattedDate = dateTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
        const formattedTime = time || 'All day';
        for (const email of studentEmails) {
          const emailData = { place, date: formattedDate, time: formattedTime, notes, link: getWebDomain() };
          await sendDynamicEmail(currentUser, email, email.split('@')[0], `New Event: ${place}`, emailData, 'schedule_created');
        }
      }

      setDate('');
      setTime('');
      setPlace('');
      setLocation('');
      setNotes('');
      showMessage('Event created successfully!', 'success');
      onClose();
    } catch (err) {
      showMessage('Error creating event: ' + err.message, 'error');
    }
  };

  return (
    <> <ModalWrapper isOpen={isOpen} onClose={onClose} maxWidth="500px">
        <div className="modal-header">
          <h3>Create New Event</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <form onSubmit={handleSubmit} className="create-event-form">
            <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Date</label>
                <DatePicker required value={date} onChange={setDate} />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Time</label>
                <input type="time" value={time} onChange={e => setTime(e.target.value)} />
              </div>
            </div>
            <div className="form-group">
              <label>Title</label>
              <input type="text" placeholder="e.g. Mathematics 101" required value={place} onChange={e => setPlace(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Location</label>
              <input type="text" placeholder="Room number or Zoom link" value={location} onChange={e => setLocation(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Notes</label>
              <textarea rows="3" placeholder="Optional notes..." value={notes} onChange={e => setNotes(e.target.value)}></textarea>
            </div>
            <AsyncButton actionFn={async () => {
              if(!date || !place) throw new Error('Missing fields');
              await handleSubmit({preventDefault: () => {}});
            }} className="btn btn-primary btn-full" style={{ marginTop: '8px' }}>Create Event</AsyncButton>
          </form>
        </div>
      </ModalWrapper>
      <ConfirmModal
        isOpen={!!confirmAction}
        message={confirmAction?.message}
        onConfirm={confirmAction?.onConfirm}
        onCancel={() => setConfirmAction(null)}
      />
    </>
  );
}

// ── EDIT EVENT MODAL ──────────────────────────────────────────
export function EditEventModal({ isOpen, onClose, schedule }) {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [place, setPlace] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [assignmentTask, setAssignmentTask] = useState('');
  const [assignmentLink, setAssignmentLink] = useState('');
  const [assignmentDue, setAssignmentDue] = useState('');
  const [reviewLearned, setReviewLearned] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');

  useEffect(() => {
    if (schedule) {
      const d = schedule.date ? (schedule.date.toDate ? schedule.date.toDate() : new Date(schedule.date)) : new Date();
      const dateStr = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
      const timeStr = d.toTimeString().slice(0, 5);

      setDate(dateStr);
      setTime(timeStr);
      setPlace(schedule.place || '');
      const loc = schedule.location || '';
      setLocation(loc.includes('google.com/calendar/event') ? '' : loc);
      setNotes(schedule.notes || '');
      setAssignmentTask(schedule.assignmentTask || '');
      setAssignmentLink(schedule.assignmentLink || '');
      setAssignmentDue(schedule.assignmentDue || '');
      setReviewLearned(schedule.reviewLearned || '');
      setReviewNotes(schedule.reviewNotes || '');
    }
  }, [schedule, isOpen]);

  if (!schedule) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const dateTime = new Date(`${date}T${time}`);
      const update = {
        place,
        location,
        notes,
        date: Timestamp.fromDate(dateTime),
        assignmentTask: assignmentTask || null,
        assignmentLink: assignmentLink || null,
        assignmentDue: assignmentDue || null,
        reviewLearned: reviewLearned || null,
        reviewNotes: reviewNotes || null
      };

      await updateDoc(doc(db, 'schedules', schedule.id), update);
      showMessage('Event updated successfully!', 'success');
      onClose();
    } catch (err) {
      showMessage('Error saving changes: ' + err.message, 'error');
    }
  };

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} maxWidth="700px">
        <div className="modal-header">
          <h3>Edit Event</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <form onSubmit={handleSubmit} className="horizontal-form">
            <div className="edit-col-left">
              <div className="section-title" style={{ marginBottom: '12px', fontSize: '13px', color: 'var(--brand-primary)', fontWeight: 600 }}>Event Details</div>
              <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Date</label>
                  <DatePicker required value={date} onChange={setDate} />
                </div>
                <div className="form-group" style={{ width: '110px' }}>
                  <label>Time</label>
                  <input type="time" required value={time} onChange={e => setTime(e.target.value)} />
                </div>
              </div>
              <div className="form-group">
                <label>Event Name</label>
                <input type="text" placeholder="Event name" required value={place} onChange={e => setPlace(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Location</label>
                <input type="text" placeholder="Location or URL" value={location} onChange={e => setLocation(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Notes</label>
                <textarea rows="3" placeholder="Notes..." value={notes} onChange={e => setNotes(e.target.value)}></textarea>
              </div>
            </div>
            <div className="edit-col-right">
              <div className="section-title" style={{ marginBottom: '12px', fontSize: '13px', color: 'var(--color-warning)', fontWeight: 600 }}>Tasks & Review</div>
              <div className="form-group">
                <label>Assignment</label>
                <input type="text" placeholder="Task description" value={assignmentTask} onChange={e => setAssignmentTask(e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <input type="text" placeholder="Resource link" value={assignmentLink} onChange={e => setAssignmentLink(e.target.value)} />
                </div>
                <div className="form-group" style={{ width: '130px' }}>
                  <DatePicker title="Due date" value={assignmentDue} onChange={setAssignmentDue} />
                </div>
              </div>
              <div style={{ borderTop: '1px solid var(--border-default)', paddingTop: '16px' }}>
                <div className="form-group">
                  <label style={{ color: 'var(--color-success)' }}>Review</label>
                  <textarea rows="2" placeholder="What was learned?" value={reviewLearned} onChange={e => setReviewLearned(e.target.value)}></textarea>
                </div>
                <div className="form-group">
                  <textarea rows="2" placeholder="Additional review notes" value={reviewNotes} onChange={e => setReviewNotes(e.target.value)}></textarea>
                </div>
              </div>
            </div>
            <AsyncButton actionFn={async () => {
              if(!date || !time || !place) throw new Error('Missing fields');
              await handleSubmit({preventDefault: () => {}});
            }} className="btn btn-primary btn-full" style={{ gridColumn: '1 / -1', marginTop: '12px' }}>Save Changes</AsyncButton>
          </form>
        </div>
      </ModalWrapper>
  );
}

// ── SHARE MODAL ───────────────────────────────────────────────
export function ShareModal({ isOpen, onClose, schedule, currentUser }) {
  const [emailInput, setEmailInput] = useState('');
  const [access, setAccess] = useState('restricted');
  const [expiration, setExpiration] = useState('');
  const [allowedEmails, setAllowedEmails] = useState([]);

  useEffect(() => {
    if (schedule && schedule.shareConfig) {
      const config = schedule.shareConfig;
      setAccess(config.isPublic ? 'public' : 'restricted');
      setAllowedEmails(config.allowedEmails || []);
      if (config.expiresAt) {
        const d = config.expiresAt.toDate ? config.expiresAt.toDate() : new Date(config.expiresAt);
        setExpiration(new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().slice(0, 16));
      } else {
        setExpiration('');
      }
    } else {
      setAccess('restricted');
      setAllowedEmails([]);
      setExpiration('');
    }
  }, [schedule, isOpen]);

  if (!schedule) return null;

  const saveConfig = async (updatedConfig) => {
    try {
      const newConfig = {
        isPublic: access === 'public',
        allowedEmails,
        expiresAt: expiration ? Timestamp.fromDate(new Date(expiration)) : null,
        ...updatedConfig
      };
      await updateDoc(doc(db, 'schedules', schedule.id), { shareConfig: newConfig });
      schedule.shareConfig = newConfig;
    } catch (err) {
      showMessage('Error saving share settings: ' + err.message, 'error');
    }
  };

  const handleAccessChange = async (val) => {
    setAccess(val);
    await saveConfig({ isPublic: val === 'public' });
  };

  const handleExpirationChange = async (val) => {
    setExpiration(val);
    const ts = val ? Timestamp.fromDate(new Date(val)) : null;
    await saveConfig({ expiresAt: ts });
  };

  const handleAddEmail = async () => {
    const email = emailInput.trim().toLowerCase();
    if (!email) return;
    if (allowedEmails.includes(email)) {
      setEmailInput('');
      return;
    }
    const newList = [...allowedEmails, email];
    setAllowedEmails(newList);
    setEmailInput('');
    await saveConfig({ allowedEmails: newList });
  };

  const handleRemoveEmail = async (email) => {
    const newList = allowedEmails.filter(e => e !== email);
    setAllowedEmails(newList);
    await saveConfig({ allowedEmails: newList });
  };

  const handleCopyLink = () => {
    const link = `${getWebDomain()}/share/${schedule.id}`;
    navigator.clipboard.writeText(link);
    showMessage('Sharing link copied to clipboard!', 'success');
  };

  const isPublic = access === 'public';
  const owner = schedule.userEmail || 'System';

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} maxWidth="480px">
        <div className="modal-header">
          <h3>Share "{schedule.place}"</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
            <input type="text" placeholder="Add people by email" value={emailInput} onChange={e => setEmailInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddEmail()} />
            <button className="btn btn-primary" onClick={handleAddEmail}>Invite</button>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <div className="form-group"><label>People with access</label></div>
            <div className="share-people-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '180px', overflowY: 'auto' }}>
              <div className="share-person" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div className="share-person-avatar" style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700 }}>
                  {owner[0].toUpperCase()}
                </div>
                <div className="share-person-name" style={{ fontSize: '13px' }}>
                  {owner} <span style={{ opacity: 0.5, fontSize: '11px' }}>(Owner)</span>
                </div>
              </div>

              {allowedEmails.map(email => (
                <div key={email} className="share-person" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div className="share-person-avatar" style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700 }}>
                      {email[0].toUpperCase()}
                    </div>
                    <div className="share-person-name" style={{ fontSize: '13px' }}>{email}</div>
                  </div>
                  <button className="btn-icon" onClick={() => handleRemoveEmail(email)} style={{ width: '24px', height: '24px' }}>
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <div className="form-group"><label>General Access</label></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className="share-person-avatar" style={{ width: '32px', height: '32px', borderRadius: '50%', background: isPublic ? 'var(--color-success-light)' : 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>
                {isPublic ? <Globe size={18} /> : <Lock size={18} />}
              </div>
              <div style={{ flex: 1 }}>
                <select value={access} onChange={e => handleAccessChange(e.target.value)} style={{ padding: '6px 12px' }}>
                  <option value="restricted">Restricted</option>
                  <option value="public">Anyone with the link</option>
                </select>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  {isPublic ? 'Anyone with the link can view this event details' : 'Only specific allowed emails can open this event link'}
                </div>
              </div>
            </div>
          </div>

          {isPublic && (
            <div style={{ marginBottom: '16px' }}>
              <div className="form-group">
                <label>Link Expiration</label>
                <input type="datetime-local" value={expiration} onChange={e => handleExpirationChange(e.target.value)} />
              </div>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={handleCopyLink}>Copy link</button>
          <button className="btn btn-primary" onClick={onClose}>Done</button>
        </div>
      </ModalWrapper>
  );
}

// ── GOOGLE SYNC PROMPT MODAL ──────────────────────────────────
export function GoogleSyncPromptModal({ isOpen, onClose, event, schedules }) {
  const [place, setPlace] = useState('');
  const [location, setLocation] = useState('');
  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => {
    if (event) {
      setPlace(event.place || '');
      const loc = event.location || '';
      setLocation(loc.includes('google.com/calendar/event') ? '' : loc);

      // Get autofill suggestions from other events in the same classroom
      const uniqueSuggestions = [];
      const seen = new Set();

      schedules.forEach((s) => {
        if (
          s.classId === event.classId &&
          s.place &&
          s.location &&
          !s.location.includes('google.com/calendar/event') &&
          s.id !== event.id
        ) {
          const key = `${s.place.trim()}-${s.location.trim()}`;
          if (!seen.has(key)) {
            seen.add(key);
            uniqueSuggestions.push({
              place: s.place.trim(),
              location: s.location.trim()
            });
          }
        }
      });

      setSuggestions(uniqueSuggestions);
    }
  }, [event, schedules, isOpen]);

  if (!event) return null;

  const date = event.date ? (event.date.toDate ? event.date.toDate() : new Date(event.date)) : null;

  const handleSave = async () => {
    try {
      await updateDoc(doc(db, 'schedules', event.id), {
        place: place.trim(),
        location: location.trim()
      });
      localStorage.setItem(`gcal_prompt_dismissed_${event.id}`, 'true');
      showMessage('Schedule updated successfully!', 'success');
      onClose();
    } catch (err) {
      showMessage('Error saving schedule: ' + err.message, 'error');
    }
  };

  const handleSkip = () => {
    localStorage.setItem(`gcal_prompt_dismissed_${event.id}`, 'true');
    onClose();
  };

  const selectSuggestion = (sug) => {
    setPlace(sug.place);
    setLocation(sug.location);
  };

  return (
    <ModalWrapper isOpen={isOpen} onClose={handleSkip} maxWidth="500px">
      <div className="modal-header">
        <h3>Google Sync - Specify Location</h3>
        <button className="modal-close" onClick={handleSkip}>×</button>
      </div>
      <div className="modal-body">
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: '1.4' }}>
          We detected an upcoming Google Calendar synced event: <strong>{event.place}</strong> on {date ? date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'unknown date'}.
        </p>

        <div className="form-group" style={{ marginBottom: '16px' }}>
          <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Event Name / Topic</label>
          <input 
            type="text" 
            placeholder="e.g. Mathematics 101" 
            value={place} 
            onChange={(e) => setPlace(e.target.value)} 
            style={{ width: '100%', marginTop: '4px' }}
          />
        </div>

        <div className="form-group" style={{ marginBottom: '16px' }}>
          <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Location / Map Link</label>
          <input 
            type="text" 
            placeholder="e.g. Room 101, Zoom link, or Google Maps URL" 
            value={location} 
            onChange={(e) => setLocation(e.target.value)} 
            style={{ width: '100%', marginTop: '4px' }}
          />
        </div>

        {suggestions.length > 0 && (
          <div style={{ marginTop: '20px', borderTop: '1px solid var(--border-default)', paddingTop: '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--brand-primary)', textTransform: 'uppercase', marginBottom: '8px' }}>
              Quick Fill from Classroom History
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '150px', overflowY: 'auto' }}>
              {suggestions.map((sug, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => selectSuggestion(sug)}
                  style={{
                    textAlign: 'left',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--border-default)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    cursor: 'pointer',
                    color: 'var(--text-primary)',
                    fontSize: '12px',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                    e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                    e.currentTarget.style.borderColor = 'var(--border-default)';
                  }}
                >
                  <div style={{ fontWeight: 600 }}>{sug.place}</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '11px', marginTop: '2px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    {sug.location}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="modal-footer" style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', padding: '16px 24px' }}>
        <button 
          className="btn btn-secondary" 
          onClick={handleSkip}
          style={{ minWidth: '80px' }}
        >
          Skip
        </button>
        <button 
          className="btn btn-primary" 
          onClick={handleSave}
          style={{ minWidth: '120px' }}
        >
          Save & Continue
        </button>
      </div>
    </ModalWrapper>
  );
}

