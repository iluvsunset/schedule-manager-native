import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { formatTime } from '../../utils/helpers';
import { LayoutDashboard, Calendar, Users, CalendarDays, Shield, ClipboardList, MessageSquare, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { openExternalUrl } from '../../platform';


const sidebarVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.05 }
  }
};

const linkVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { 
    opacity: 1, 
    x: 0, 
    transition: { ease: 'easeOut', duration: 0.3 } 
  }
};

export default function Sidebar({ 
  activeTab, 
  setActiveTab, 
  nextEvent, 
  tasks = [], 
  feedback = null,
  classes = []
}) {
  const { userRole, can } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  const showAdmin = can('view_console');
  const showGcal = can('connect_gcal');
  const isStudent = userRole === 'student';

  const isAdminActive = location.pathname === '/admin';
  const isProfileActive = location.pathname === '/profile';

  // Calculate live panel values for students
  let statusLabel = 'IDLE';
  let statusClass = 'status-pill';
  let timeLabel = '--:--';
  let placeLabel = 'No Events';
  let dateLabel = "You're all caught up";
  let linkUrl = null;

  if (nextEvent) {
    const start = nextEvent.date?.toDate ? nextEvent.date.toDate() : new Date(nextEvent.date);
    const now = new Date();
    
    if (nextEvent.status === 'ongoing') {
      statusLabel = 'LIVE NOW';
      statusClass = 'status-pill live';
      timeLabel = 'LIVE';
      placeLabel = nextEvent.place;
      dateLabel = 'Happening right now';
    } else {
      statusLabel = 'NEXT UP';
      statusClass = 'status-pill upcoming';
      placeLabel = nextEvent.place;
      
      const diffMs = start - now;
      const diffMins = Math.floor(diffMs / 60000);
      
      if (diffMins < 60) {
        timeLabel = `In ${diffMins}m`;
      } else {
        timeLabel = formatTime(start);
      }

      const diffDays = Math.round((new Date(start.toDateString()) - new Date(now.toDateString())) / (1000 * 60 * 60 * 24));
      dateLabel = diffDays === 0 ? 'Today' : (diffDays === 1 ? 'Tomorrow' : start.toLocaleDateString());
    }

    if (nextEvent.location && (nextEvent.location.startsWith('http') || nextEvent.location.startsWith('www')) && !nextEvent.location.includes('google.com/calendar/event')) {
      linkUrl = nextEvent.location.startsWith('www') ? 'https://' + nextEvent.location : nextEvent.location;
    }
  }

  return (
    <aside className="sidebar">
      <nav className="nav-section">
        <div className="nav-section-label">Menu</div>
        <motion.div className="nav-links-container" style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '4px' }} variants={sidebarVariants} initial="hidden" animate="visible">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'calendar', label: 'Calendar', icon: Calendar },
            ...(!isStudent ? [{ id: 'members', label: 'Class Members', icon: Users }] : []),
            ...(showGcal ? [{ id: 'gcal', label: 'Google Calendar', icon: CalendarDays }] : [])
          ].map((item) => {
            const isActive = activeTab === item.id && !isProfileActive && !isAdminActive;
            return (
              <motion.a key={item.id} variants={linkVariants}
                href="#" 
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={(e) => { 
                  e.preventDefault(); 
                  if (location.pathname !== '/') {
                    navigate('/', { state: { activeTab: item.id } });
                  } else {
                    setActiveTab(item.id); 
                  }
                }}
                whileTap={{ scale: 0.85 }}
                style={{ 
                  position: 'relative',
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)'
                }}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: 'rgba(59, 130, 246, 0.08)',
                      border: '1px solid rgba(59, 130, 246, 0.2)',
                      borderRadius: '6px',
                      zIndex: -1
                    }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <div style={{
                      position: 'absolute',
                      left: -1,
                      top: '25%',
                      height: '50%',
                      width: '3px',
                      background: 'var(--brand-primary, #3b82f6)',
                      borderRadius: '0 4px 4px 0'
                    }} />
                  </motion.div>
                )}
                <item.icon size={18} style={{ marginRight: '8px', zIndex: 1 }} />
                <span style={{ zIndex: 1 }}>{item.label}</span>
              </motion.a>
            );
          })}
        </motion.div>
      </nav>

      {showAdmin && (
        <div id="consoleLinkSection">
          <div className="nav-section-label">Admin</div>
          <Link 
            to="/admin" 
            className={`nav-item ${isAdminActive ? 'active' : ''}`}
            style={{ 
              position: 'relative', 
              color: isAdminActive ? 'var(--text-primary)' : 'var(--text-secondary)' 
            }}
          >
            {isAdminActive && (
              <motion.div
                layoutId="activeTabIndicator"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(59, 130, 246, 0.08)',
                  border: '1px solid rgba(59, 130, 246, 0.2)',
                  borderRadius: '6px',
                  zIndex: -1
                }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              >
                <div style={{
                  position: 'absolute',
                  left: -1,
                  top: '25%',
                  height: '50%',
                  width: '3px',
                  background: 'var(--brand-primary, #3b82f6)',
                  borderRadius: '0 4px 4px 0'
                }} />
              </motion.div>
            )}
            <Shield size={18} style={{ marginRight: '8px', zIndex: 1 }} />
            <span style={{ zIndex: 1 }}>Console</span>
          </Link>
        </div>
      )}

      <div>
        <div className="nav-section-label">Account</div>
        <Link 
          to="/profile" 
          className={`nav-item ${isProfileActive ? 'active' : ''}`}
          style={{ 
            position: 'relative', 
            color: isProfileActive ? 'var(--text-primary)' : 'var(--text-secondary)' 
          }}
        >
          {isProfileActive && (
            <motion.div
              layoutId="activeTabIndicator"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(59, 130, 246, 0.08)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                borderRadius: '6px',
                zIndex: -1
              }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
              <div style={{
                position: 'absolute',
                left: -1,
                top: '25%',
                height: '50%',
                width: '3px',
                background: 'var(--brand-primary, #3b82f6)',
                borderRadius: '0 4px 4px 0'
              }} />
            </motion.div>
          )}
          <User size={18} style={{ marginRight: '8px', zIndex: 1 }} />
          <span style={{ zIndex: 1 }}>My Profile</span>
        </Link>
      </div>

      {isStudent && (
        <>
          {/* Live Card */}
          <div className="live-card">
            <div className={statusClass}>{statusLabel}</div>
            <div className="big-time">{timeLabel}</div>
            <div className="big-place">{placeLabel}</div>
            <div className="big-date">{dateLabel}</div>
            {linkUrl && (
              <button 
                className="btn btn-primary btn-full" 
                style={{ marginTop: '16px' }}
                onClick={() => openExternalUrl(linkUrl)}
              >
                Join Link
              </button>
            )}
          </div>

          {/* Pending Tasks */}
          <div className="sidebar-widget">
            <div className="widget-title">
              <ClipboardList size={16} color="var(--color-warning)" style={{ marginRight: '8px' }} />
              Pending Tasks
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {tasks.length === 0 ? (
                <div style={{ padding: '10px 0', textAlign: 'center', opacity: 0.4, fontSize: '13px' }}>
                  🎉 No pending tasks
                </div>
              ) : (
                tasks.slice(0, 4).map((t, idx) => (
                  <div key={idx} style={{ background: 'rgba(255,255,255,0.02)', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-default)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '2px' }}>
                      <span style={{ fontWeight: 600, color: 'var(--brand-primary-hover)' }}>{t.course}</span>
                      <span style={{ color: 'var(--text-secondary)' }}>
                        {t.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-primary)', wordBreak: 'break-word' }}>{t.desc}</div>
                    {t.link && (
                      <a href={t.link.startsWith('http') ? t.link : 'https://' + t.link} target="_blank" rel="noreferrer" style={{ fontSize: '11px', color: 'var(--brand-primary)', marginTop: '4px', display: 'inline-block' }}>
                        Resource →
                      </a>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Teacher Feedback widget */}
          <div className="sidebar-widget">
            <div className="widget-title">
              <MessageSquare size={16} color="var(--brand-primary)" style={{ marginRight: '8px' }} />
              Feedback
            </div>
            <div>
              {feedback ? (
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--brand-primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                    {feedback.place} · {feedback.date}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-primary)', lineStyle: 'italic' }}>
                    "{feedback.reviewLearned || feedback.reviewNotes}"
                  </div>
                </div>
              ) : (
                <div style={{ padding: '10px 0', textAlign: 'center', opacity: 0.4, fontSize: '13px' }}>
                  No recent reviews
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </aside>
  );
}
