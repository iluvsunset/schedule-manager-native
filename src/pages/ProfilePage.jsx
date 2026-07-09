import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { doc, setDoc, getDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { showMessage } from '../utils/helpers';
import { 
  ArrowLeft, Mail, Shield, Key, Save, Check, Globe, 
  Bell, Settings, Sliders, User, Sparkles, Cpu, Plus, Trash2, Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import WebGLBackground from '../components/WebGLBackground';
import Topbar from '../components/layout/Topbar';
import Sidebar from '../components/layout/Sidebar';

// Country → Timezone map (sorted by region)
const TIMEZONE_OPTIONS = [
  { label: '🇻🇳 Vietnam (UTC+7)', value: 'Asia/Ho_Chi_Minh', country: 'Vietnam' },
  { label: '🇯🇵 Japan (UTC+9)', value: 'Asia/Tokyo', country: 'Japan' },
  { label: '🇰🇷 South Korea (UTC+9)', value: 'Asia/Seoul', country: 'South Korea' },
  { label: '🇨🇳 China (UTC+8)', value: 'Asia/Shanghai', country: 'China' },
  { label: '🇸🇬 Singapore (UTC+8)', value: 'Asia/Singapore', country: 'Singapore' },
  { label: '🇹🇭 Thailand (UTC+7)', value: 'Asia/Bangkok', country: 'Thailand' },
  { label: '🇲🇾 Malaysia (UTC+8)', value: 'Asia/Kuala_Lumpur', country: 'Malaysia' },
  { label: '🇵🇭 Philippines (UTC+8)', value: 'Asia/Manila', country: 'Philippines' },
  { label: '🇮🇩 Indonesia – Jakarta (UTC+7)', value: 'Asia/Jakarta', country: 'Indonesia (WIB)' },
  { label: '🇮🇳 India (UTC+5:30)', value: 'Asia/Kolkata', country: 'India' },
  { label: '🇦🇺 Australia – Sydney (UTC+10)', value: 'Australia/Sydney', country: 'Australia (AEST)' },
  { label: '🇳🇿 New Zealand (UTC+12)', value: 'Pacific/Auckland', country: 'New Zealand' },
  { label: '🇬🇧 United Kingdom (UTC+0/+1)', value: 'Europe/London', country: 'United Kingdom' },
  { label: '🇫🇷 France (UTC+1/+2)', value: 'Europe/Paris', country: 'France' },
  { label: '🇩🇪 Germany (UTC+1/+2)', value: 'Europe/Berlin', country: 'Germany' },
  { label: '🇺🇸 USA – New York (UTC-5/-4)', value: 'America/New_York', country: 'USA (Eastern)' },
  { label: '🇺🇸 USA – Chicago (UTC-6/-5)', value: 'America/Chicago', country: 'USA (Central)' },
  { label: '🇺🇸 USA – Los Angeles (UTC-8/-7)', value: 'America/Los_Angeles', country: 'USA (Pacific)' },
  { label: '🇨🇦 Canada – Toronto (UTC-5/-4)', value: 'America/Toronto', country: 'Canada (Eastern)' },
  { label: '🇧🇷 Brazil – São Paulo (UTC-3)', value: 'America/Sao_Paulo', country: 'Brazil' },
  { label: '🇦🇪 UAE – Dubai (UTC+4)', value: 'Asia/Dubai', country: 'UAE' },
  { label: '🇸🇦 Saudi Arabia (UTC+3)', value: 'Asia/Riyadh', country: 'Saudi Arabia' },
  { label: '🇿🇦 South Africa (UTC+2)', value: 'Africa/Johannesburg', country: 'South Africa' },
];

const ToggleSwitch = ({ checked, onChange, label, description, disabled }) => {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <div style={{ paddingRight: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <span style={{ fontSize: '14px', fontWeight: 600, color: '#f8fafc' }}>{label}</span>
        {description && <span style={{ fontSize: '11px', color: '#94a3b8', lineHeight: '14px' }}>{description}</span>}
      </div>
      <label style={{ position: 'relative', display: 'inline-block', width: '42px', height: '22px', flexShrink: 0, cursor: disabled ? 'not-allowed' : 'pointer' }}>
        <input 
          type="checkbox" 
          checked={checked} 
          onChange={e => !disabled && onChange(e.target.checked)} 
          style={{ opacity: 0, width: 0, height: 0 }} 
        />
        <span 
          style={{
            position: 'absolute',
            inset: 0,
            background: checked ? '#10b981' : 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '24px',
            transition: '0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            boxShadow: checked ? '0 0 10px rgba(16,185,129,0.15)' : 'none'
          }}
        />
        <span 
          style={{
            position: 'absolute',
            content: '""',
            height: '14px',
            width: '14px',
            left: checked ? '24px' : '4px',
            bottom: '4px',
            background: 'white',
            borderRadius: '50%',
            transition: '0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
          }}
        />
      </label>
    </div>
  );
};

const SegmentedControl = ({ options, selected, onChange, label, description }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '16px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginBottom: '4px' }}>
        <span style={{ fontSize: '14px', fontWeight: 600, color: '#f8fafc' }}>{label}</span>
        {description && <span style={{ fontSize: '11px', color: '#94a3b8' }}>{description}</span>}
      </div>
      <div style={{ display: 'flex', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '10px', padding: '2px', overflow: 'hidden' }}>
        {options.map(opt => {
          const isSelected = selected === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              style={{
                flex: 1,
                padding: '8px 12px',
                background: isSelected ? 'rgba(255,255,255,0.08)' : 'transparent',
                border: 'none',
                borderRadius: '8px',
                color: isSelected ? 'white' : '#64748b',
                fontSize: '12px',
                fontWeight: isSelected ? 600 : 500,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                fontFamily: 'inherit'
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default function ProfilePage() {
  const { currentUser, userRole, userDisplayName, setUserDisplayName, setUserUsername, setUserTimezone, resetPassword } = useAuth();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState('');
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(true);
  const [emailRemindersEnabled, setEmailRemindersEnabled] = useState(true);
  const [emailClassUpdatesEnabled, setEmailClassUpdatesEnabled] = useState(true);
  const [emailReminderTiming, setEmailReminderTiming] = useState('day_before');
  const [emailReminderOffsets, setEmailReminderOffsets] = useState([12, 8]);
  const [newReminderHours, setNewReminderHours] = useState(4);

  const addReminderOffset = () => {
    if (emailReminderOffsets.length >= 5) {
      showMessage('Maximum of 5 reminders allowed', 'error');
      return;
    }
    if (emailReminderOffsets.includes(newReminderHours)) {
      showMessage('This reminder time already exists', 'error');
      return;
    }
    const updated = [...emailReminderOffsets, newReminderHours].sort((a, b) => b - a);
    setEmailReminderOffsets(updated);
    showMessage(`Added ${newReminderHours}h reminder offset`, 'success');
  };

  const removeReminderOffset = (offset) => {
    const updated = emailReminderOffsets.filter(x => x !== offset);
    setEmailReminderOffsets(updated);
    showMessage(`Removed ${offset}h reminder offset`, 'success');
  };
  
  // WebGL Controls (Saved in LocalStorage for dynamic HMR background reaction)
  const [webglEnabled, setWebglEnabled] = useState(true);
  const [ambientSpeed, setAmbientSpeed] = useState('normal');

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState([]);
  
  // Custom select state
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Fetch Classes for Sidebar student context
  useEffect(() => {
    if (!currentUser || !userRole) return;
    const q = ['student', 'teacher'].includes(userRole)
      ? query(collection(db, 'classes'), where('participants', 'array-contains', currentUser.email.toLowerCase()))
      : query(collection(db, 'classes'));

    const unsubscribe = onSnapshot(q, (snap) => {
      const clsList = [];
      snap.forEach(d => clsList.push({ id: d.id, ...d.data() }));
      setClasses(clsList);
    });
    return unsubscribe;
  }, [currentUser, userRole]);

  // Load profile settings on mount
  useEffect(() => {
    if (!currentUser) return;
    const fetchProfile = async () => {
      try {
        const snap = await getDoc(doc(db, 'allowed_users', currentUser.email.toLowerCase()));
        if (snap.exists()) {
          const data = snap.data();
          setDisplayName(data.displayName || data.username || '');
          setTimezone(data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone);
          setEmailNotificationsEnabled(data.emailNotificationsEnabled !== false);
          setEmailRemindersEnabled(data.emailRemindersEnabled !== false);
          setEmailClassUpdatesEnabled(data.emailClassUpdatesEnabled !== false);
          setEmailReminderTiming(data.emailReminderTiming || 'day_before');
          setEmailReminderOffsets(data.emailReminderOffsets || [12, 8]);
        }
        
        // Load WebGL configurations from localStorage
        const localWebgl = localStorage.getItem('webgl_enabled');
        const localSpeed = localStorage.getItem('ambient_speed');
        setWebglEnabled(localWebgl !== 'false');
        setAmbientSpeed(localSpeed || 'normal');
      } catch (e) {
        setDisplayName(userDisplayName || '');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [currentUser]);

  // Handle saving of settings
  const handleSave = async (e) => {
    if (e) e.preventDefault();
    if (!currentUser) return;
    const cleanName = displayName.trim();
    if (!cleanName) {
      showMessage('Please enter a display name', 'error');
      return;
    }
    
    setSaving(true);
    try {
      // Slugified username compatibility fallback
      const cleanUsername = cleanName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9._-]/g, '');

      // Persist user details & preferences to Firestore
      await setDoc(doc(db, 'allowed_users', currentUser.email.toLowerCase()), {
        displayName: cleanName,
        username: cleanUsername,
        timezone: timezone,
        emailNotificationsEnabled,
        emailRemindersEnabled,
        emailClassUpdatesEnabled,
        emailReminderTiming,
        emailReminderOffsets,
        role: userRole || 'student'
      }, { merge: true });

      setUserDisplayName(cleanName);
      setUserUsername(cleanUsername);
      setUserTimezone(timezone);

      // Save local storage options
      localStorage.setItem('webgl_enabled', webglEnabled ? 'true' : 'false');
      localStorage.setItem('ambient_speed', ambientSpeed);

      // Trigger WebGL re-evaluation
      window.dispatchEvent(new Event('ambient_config_changed'));

      setSaved(true);
      showMessage('Settings updated successfully!', 'success');
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      showMessage('Failed to save settings: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async () => {
    try {
      await resetPassword(currentUser.email);
      showMessage('Password reset link sent to your email!', 'success');
    } catch (error) {
      showMessage(error.message, 'error');
    }
  };

  const handleWebglToggle = (val) => {
    setWebglEnabled(val);
    localStorage.setItem('webgl_enabled', val ? 'true' : 'false');
    window.dispatchEvent(new Event('ambient_config_changed'));
  };

  const handleSpeedChange = (val) => {
    setAmbientSpeed(val);
    localStorage.setItem('ambient_speed', val);
    window.dispatchEvent(new Event('ambient_config_changed'));
  };

  const avatarLetter = (displayName || currentUser?.email || '?')[0].toUpperCase();
  const roleLabel = userRole?.replace(/_/g, ' ') || 'user';

  const roleBadgeColors = {
    it: { bg: 'rgba(167,139,250,0.15)', border: 'rgba(167,139,250,0.3)', color: '#a78bfa' },
    academic_coordinator: { bg: 'rgba(251,191,36,0.15)', border: 'rgba(251,191,36,0.3)', color: '#fbbf24' },
    senior_teacher: { bg: 'rgba(129,140,248,0.15)', border: 'rgba(129,140,248,0.3)', color: '#818cf8' },
    teacher: { bg: 'rgba(96,165,250,0.15)', border: 'rgba(96,165,250,0.3)', color: '#60a5fa' },
    student: { bg: 'rgba(52,211,153,0.15)', border: 'rgba(52,211,153,0.3)', color: '#34d399' },
  };
  const roleStyle = roleBadgeColors[userRole] || roleBadgeColors.student;

  const currentSelectedTimezoneOption = TIMEZONE_OPTIONS.find(opt => opt.value === timezone) || { label: timezone, value: timezone };

  return (
    <div className="screen active" style={{ display: 'flex' }}>
      <WebGLBackground />
      <div className="dashboard-container" style={{ width: '100%' }}>
        <Topbar classes={classes} />
        
        <div className="dashboard-body">
          <Sidebar classes={classes} />
          
          <main className="main-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', padding: '32px 24px', overflowY: 'auto' }}>
            
            {/* Center Layout Wrapper (Wider for premium dashboard feel) */}
            <div style={{ width: '100%', maxWidth: '980px', display: 'flex', flexDirection: 'column' }}>
              
              {/* Back Link */}
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: '20px' }}>
                <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#64748b', textDecoration: 'none', fontSize: '13px', fontWeight: 600, transition: 'color 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'white'}
                  onMouseLeave={e => e.currentTarget.style.color = '#64748b'}
                >
                  <ArrowLeft size={14} />
                  Back to Dashboard
                </Link>
              </motion.div>

              {loading ? (
                /* Shimmer Dashboard Mockup */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
                  <div className="shimmer-bg" style={{ height: '180px', borderRadius: '24px' }} />
                  <div className="profile-dashboard-grid" style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '24px', width: '100%' }}>
                    <div className="shimmer-bg" style={{ height: '420px', borderRadius: '24px' }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                      <div className="shimmer-bg" style={{ height: '220px', borderRadius: '24px' }} />
                      <div className="shimmer-bg" style={{ height: '180px', borderRadius: '24px' }} />
                    </div>
                  </div>
                </div>
              ) : (
                /* Full Dashboard Layout */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
                  
                  {/* Premium Header Banner Card */}
                  <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.99 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    style={{
                      position: 'relative',
                      background: 'rgba(255, 255, 255, 0.02)',
                      backdropFilter: 'blur(20px)',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                      borderRadius: '24px',
                      overflow: 'hidden',
                      boxShadow: '0 20px 50px rgba(0, 0, 0, 0.4)',
                    }}
                  >
                    {/* Premium flat background header */}
                    <div style={{ height: '90px', background: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', position: 'relative' }} />

                    <div style={{ padding: '0 24px 24px', display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: '24px', marginTop: '-36px' }}>
                      
                      {/* Left: User Badge & Meta */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <div style={{
                          width: 80, height: 80, borderRadius: '20px',
                          background: '#3b82f6',
                          border: '4px solid #040406',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '32px', fontWeight: 800, color: 'white',
                          boxShadow: '0 10px 25px rgba(59, 130, 246, 0.25)',
                          zIndex: 2,
                        }}>
                          {avatarLetter}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: 'white', letterSpacing: '-0.5px' }}>{displayName || 'Setup Profile'}</h1>
                            <span style={{
                              padding: '3px 10px',
                              background: roleStyle.bg,
                              border: `1px solid ${roleStyle.border}`,
                              borderRadius: '20px',
                              fontSize: '11px',
                              fontWeight: 700,
                              color: roleStyle.color,
                              textTransform: 'capitalize',
                              letterSpacing: '0.5px',
                            }}>
                              {roleLabel}
                            </span>
                          </div>
                          <span style={{ fontSize: '13px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Mail size={13} style={{ opacity: 0.6 }} /> {currentUser?.email}
                          </span>
                        </div>
                      </div>

                      {/* Right: Quick Stats Panel */}
                      <div style={{ display: 'flex', gap: '12px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '12px 20px', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', paddingRight: '16px', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
                          <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Classes</span>
                          <span style={{ fontSize: '16px', fontWeight: 700, color: 'white', marginTop: '2px' }}>{classes.length}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', paddingRight: '16px', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
                          <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Email Reminders</span>
                          <span style={{ fontSize: '16px', fontWeight: 700, color: emailNotificationsEnabled && emailRemindersEnabled ? '#10b981' : '#64748b', marginTop: '2px' }}>
                            {emailNotificationsEnabled && emailRemindersEnabled ? 'Active' : 'Muted'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>System Engine</span>
                          <span style={{ fontSize: '16px', fontWeight: 700, color: webglEnabled ? '#3b82f6' : '#64748b', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Cpu size={14} style={{ opacity: 0.8 }} /> {webglEnabled ? 'WebGL GPU' : 'Muted'}
                          </span>
                        </div>
                      </div>

                    </div>
                  </motion.div>

                  {/* Settings columns */}
                  <div className="profile-dashboard-grid" style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '24px', width: '100%' }}>
                    
                    {/* Left Column: Account configurations */}
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.45, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
                      style={{
                        background: 'rgba(255, 255, 255, 0.02)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        borderRadius: '24px',
                        padding: '28px',
                        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.4)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '24px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '16px' }}>
                        <User size={18} style={{ color: '#3b82f6' }} />
                        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'white' }}>Profile Settings</h2>
                      </div>

                      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        
                        {/* Display Name Input (Combined Full Name) */}
                        <div>
                          <label style={{ display: 'block', marginBottom: '8px', fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                            Full Name
                          </label>
                          <input
                            type="text"
                            value={displayName}
                            onChange={e => setDisplayName(e.target.value)}
                            placeholder="Enter your full name"
                            maxLength={60}
                            style={{ 
                              width: '100%', 
                              padding: '12px 16px', 
                              background: 'rgba(255,255,255,0.04)', 
                              border: '1px solid rgba(255,255,255,0.08)', 
                              borderRadius: '12px', 
                              color: 'white', 
                              fontSize: '14px', 
                              outline: 'none', 
                              boxSizing: 'border-box', 
                              transition: 'all 0.2s', 
                              fontFamily: 'inherit' 
                            }}
                            onFocus={e => { e.target.style.borderColor = 'rgba(59,130,246,0.5)'; e.target.style.background = 'rgba(255,255,255,0.06)'; }}
                            onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.background = 'rgba(255,255,255,0.04)'; }}
                          />
                          <p style={{ margin: '6px 0 0 4px', fontSize: '11px', color: '#64748b' }}>
                            This name will represent you in classes, notifications, and logs.
                          </p>
                        </div>

                        {/* Location & Timezone selector */}
                        <div>
                          <label style={{ display: 'block', marginBottom: '8px', fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                            Location &amp; Timezone
                          </label>
                          
                          <div ref={dropdownRef} style={{ position: 'relative' }}>
                            <button
                              type="button"
                              onClick={() => setDropdownOpen(!dropdownOpen)}
                              style={{
                                width: '100%',
                                padding: '12px 16px 12px 36px',
                                background: 'rgba(255,255,255,0.04)',
                                border: '1px solid rgba(255,255,255,0.08)',
                                borderRadius: '12px',
                                color: 'white',
                                fontSize: '14px',
                                outline: 'none',
                                boxSizing: 'border-box',
                                transition: 'all 0.2s',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                textAlign: 'left',
                                fontFamily: 'inherit'
                              }}
                              onFocus={e => { e.currentTarget.style.borderColor = 'rgba(59,130,246,0.5)'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                              onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                            >
                              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {currentSelectedTimezoneOption.label}
                              </span>
                              <span style={{ transition: 'transform 0.2s', transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', fontSize: '9px', color: '#64748b' }}>
                                ▼
                              </span>
                            </button>
                            
                            <Globe size={14} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none', opacity: 0.8 }} />
                            
                            <AnimatePresence>
                              {dropdownOpen && (
                                <motion.div
                                  initial={{ opacity: 0, y: -8, scale: 0.98 }}
                                  animate={{ opacity: 1, y: 0, scale: 1 }}
                                  exit={{ opacity: 0, y: -8, scale: 0.98 }}
                                  transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                                  style={{
                                    position: 'absolute',
                                    top: '100%',
                                    left: 0,
                                    right: 0,
                                    zIndex: 50,
                                    marginTop: '6px',
                                    background: 'rgba(10, 10, 16, 0.96)',
                                    backdropFilter: 'blur(30px)',
                                    border: '1px solid rgba(255, 255, 255, 0.08)',
                                    borderRadius: '12px',
                                    maxHeight: '200px',
                                    overflowY: 'auto',
                                    boxShadow: '0 15px 40px rgba(0,0,0,0.6)',
                                  }}
                                >
                                  {TIMEZONE_OPTIONS.map(opt => (
                                    <div
                                      key={opt.value}
                                      onClick={() => {
                                        setTimezone(opt.value);
                                        setDropdownOpen(false);
                                      }}
                                      style={{
                                        padding: '10px 14px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        background: opt.value === timezone ? 'rgba(255,255,255,0.06)' : 'transparent',
                                        color: opt.value === timezone ? '#fff' : '#94a3b8',
                                        transition: 'all 0.15s',
                                        fontSize: '13px'
                                      }}
                                      onMouseEnter={e => {
                                        e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                                        e.currentTarget.style.color = '#fff';
                                      }}
                                      onMouseLeave={e => {
                                        e.currentTarget.style.background = opt.value === timezone ? 'rgba(255,255,255,0.06)' : 'transparent';
                                        e.currentTarget.style.color = opt.value === timezone ? '#fff' : '#94a3b8';
                                      }}
                                    >
                                      <span>{opt.label}</span>
                                      {opt.value === timezone && <Check size={13} style={{ color: '#10b981' }} />}
                                    </div>
                                  ))}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                          <p style={{ margin: '6px 0 0 4px', fontSize: '11px', color: '#64748b' }}>
                            Your timezone synchronizes notifications and schedules correctly to your location.
                          </p>
                        </div>

                        {/* Form Buttons */}
                        <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                          <button type="button" onClick={handleResetPassword}
                            style={{
                              flex: 1,
                              padding: '11px 16px',
                              background: 'rgba(255, 255, 255, 0.02)',
                              border: '1px solid rgba(255, 255, 255, 0.06)',
                              borderRadius: '12px',
                              color: '#94a3b8',
                              fontSize: '13px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '8px',
                              transition: 'all 0.2s',
                              fontFamily: 'inherit',
                            }}
                            onMouseEnter={e => {
                              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                              e.currentTarget.style.color = 'white';
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                              e.currentTarget.style.color = '#94a3b8';
                            }}
                          >
                            <Key size={14} /> Reset Password
                          </button>

                          <motion.button type="submit" disabled={saving} whileTap={{ scale: 0.98 }}
                            style={{
                              flex: 2,
                              padding: '11px 24px',
                              border: 'none',
                              borderRadius: '12px',
                              color: 'white',
                              fontSize: '14px',
                              fontWeight: 700,
                              cursor: saving ? 'not-allowed' : 'pointer',
                              background: saved ? '#10b981' : '#3b82f6',
                              opacity: saving ? 0.75 : 1,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '8px',
                              boxShadow: saved ? '0 4px 15px rgba(16,185,129,0.2)' : '0 4px 15px rgba(59, 130, 246, 0.2)',
                              transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                              fontFamily: 'inherit',
                            }}
                          >
                            {saving ? (
                              <><span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.6s linear infinite', display: 'inline-block' }} /> Saving...</>
                            ) : saved ? (
                              <><Check size={15} /> Settings Saved</>
                            ) : (
                              <><Save size={14} /> Save Configuration</>
                            )}
                          </motion.button>
                        </div>

                      </form>
                    </motion.div>

                    {/* Right Column: Preferences & Appearance */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                      
                      {/* Notification Preferences */}
                      <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.45, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                        style={{
                          background: 'rgba(255, 255, 255, 0.02)',
                          backdropFilter: 'blur(20px)',
                          border: '1px solid rgba(255, 255, 255, 0.05)',
                          borderRadius: '24px',
                          padding: '24px 28px',
                          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.4)',
                          display: 'flex',
                          flexDirection: 'column',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '16px', marginBottom: '8px' }}>
                          <Bell size={18} style={{ color: '#8b5cf6' }} />
                          <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: 'white' }}>Email Notification Rules</h2>
                        </div>

                        <ToggleSwitch 
                          checked={emailNotificationsEnabled}
                          onChange={setEmailNotificationsEnabled}
                          label="Global Notifications"
                          description="Override matrix to receive any emails"
                        />

                        <ToggleSwitch 
                          checked={emailRemindersEnabled}
                          onChange={setEmailRemindersEnabled}
                          disabled={!emailNotificationsEnabled}
                          label="Event Reminders"
                          description="Receive schedule & lecture notification emails"
                        />

                        {emailRemindersEnabled && emailNotificationsEnabled && (
                          <div style={{ marginTop: '20px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '20px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px' }}>
                              <span style={{ fontSize: '14px', fontWeight: 600, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Clock size={16} style={{ color: '#10b981' }} />
                                Custom Reminders List
                              </span>
                              <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                                Convert and notify you in your local timezone (<strong>{currentSelectedTimezoneOption.label}</strong>). Max 5 reminders.
                              </span>
                            </div>

                            {/* Active reminders list */}
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
                              {emailReminderOffsets.length === 0 ? (
                                <div style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic', padding: '8px 0' }}>
                                  No reminders configured. Add one below!
                                </div>
                              ) : (
                                emailReminderOffsets.map(offset => (
                                  <div 
                                    key={offset}
                                    style={{
                                      background: 'rgba(16, 185, 129, 0.1)',
                                      border: '1px solid rgba(16, 185, 129, 0.2)',
                                      color: '#10b981',
                                      padding: '6px 12px',
                                      borderRadius: '12px',
                                      fontSize: '12px',
                                      fontWeight: 600,
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '8px',
                                      transition: 'all 0.2s'
                                    }}
                                  >
                                    <span>{offset} hours before</span>
                                    <button 
                                      type="button"
                                      onClick={() => removeReminderOffset(offset)}
                                      style={{
                                        background: 'none',
                                        border: 'none',
                                        color: '#ef4444',
                                        cursor: 'pointer',
                                        padding: 0,
                                        display: 'flex',
                                        alignItems: 'center',
                                        opacity: 0.8
                                      }}
                                      onMouseEnter={e => e.currentTarget.style.opacity = 1}
                                      onMouseLeave={e => e.currentTarget.style.opacity = 0.8}
                                      title="Remove reminder"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                ))
                              )}
                            </div>

                            {/* Add Reminder controls */}
                            {emailReminderOffsets.length < 5 ? (
                              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', background: 'rgba(0,0,0,0.15)', padding: '10px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.04)' }}>
                                <select 
                                  value={newReminderHours}
                                  onChange={e => setNewReminderHours(Number(e.target.value))}
                                  style={{
                                    background: 'rgba(0,0,0,0.3)',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    color: 'white',
                                    borderRadius: '8px',
                                    padding: '8px 12px',
                                    fontSize: '12px',
                                    fontWeight: 500,
                                    outline: 'none',
                                    flex: 1,
                                    cursor: 'pointer'
                                  }}
                                >
                                  <option value={1}>1 hour before class</option>
                                  <option value={2}>2 hours before class</option>
                                  <option value={4}>4 hours before class</option>
                                  <option value={6}>6 hours before class</option>
                                  <option value={8}>8 hours before class</option>
                                  <option value={12}>12 hours before class</option>
                                  <option value={18}>18 hours before class</option>
                                  <option value={24}>24 hours (1 day) before</option>
                                  <option value={36}>36 hours before class</option>
                                  <option value={48}>48 hours (2 days) before</option>
                                </select>
                                <button 
                                  type="button"
                                  onClick={addReminderOffset}
                                  style={{
                                    background: 'var(--brand-primary)',
                                    border: 'none',
                                    color: 'white',
                                    padding: '8px 14px',
                                    borderRadius: '8px',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                  }}
                                  onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.1)'}
                                  onMouseLeave={e => e.currentTarget.style.filter = 'brightness(1)'}
                                >
                                  <Plus size={14} /> Add
                                </button>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', color: '#fbbf24', fontSize: '11px', background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.1)', padding: '10px 14px', borderRadius: '12px' }}>
                                <span>Max limit of 5 reminders reached. Remove one to add a new threshold.</span>
                              </div>
                            )}
                          </div>
                        )}

                        <ToggleSwitch 
                          checked={emailClassUpdatesEnabled}
                          onChange={setEmailClassUpdatesEnabled}
                          disabled={!emailNotificationsEnabled}
                          label="Class Announcements"
                          description="Notify when added or modified in class rosters"
                        />
                      </motion.div>

                      {/* WebGL Ambient Background Options */}
                      <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.45, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
                        style={{
                          background: 'rgba(255, 255, 255, 0.02)',
                          backdropFilter: 'blur(20px)',
                          border: '1px solid rgba(255, 255, 255, 0.05)',
                          borderRadius: '24px',
                          padding: '24px 28px',
                          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.4)',
                          display: 'flex',
                          flexDirection: 'column',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '16px', marginBottom: '8px' }}>
                          <Sliders size={18} style={{ color: '#10b981' }} />
                          <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: 'white' }}>System Engine &amp; Performance</h2>
                        </div>

                        <ToggleSwitch 
                          checked={webglEnabled}
                          onChange={handleWebglToggle}
                          label="Ambient Flow Engine"
                          description="GPU-accelerated ambient background"
                        />

                        <SegmentedControl 
                          label="Engine Speed"
                          description="Adjust speed of WebGL fluid simulation"
                          selected={ambientSpeed}
                          onChange={handleSpeedChange}
                          options={[
                            { label: 'Off', value: 'off' },
                            { label: 'Slow', value: 'slow' },
                            { label: 'Normal', value: 'normal' },
                            { label: 'Fast', value: 'fast' }
                          ]}
                        />
                      </motion.div>

                    </div>

                  </div>

                </div>
              )}
              
            </div>
            
          </main>
        </div>
      </div>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input::placeholder { color: rgba(148,163,184,0.3); }
        @keyframes pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        .shimmer-bg {
          background: rgba(255, 255, 255, 0.04);
          animation: pulse 1.5s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
}
