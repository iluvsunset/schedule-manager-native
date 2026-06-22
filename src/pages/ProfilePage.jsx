import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { doc, setDoc, getDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { showMessage } from '../utils/helpers';
import { ArrowLeft, Mail, Shield, Key, Save, Edit3, Check, Globe } from 'lucide-react';
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

export default function ProfilePage() {
  const { currentUser, userRole, userDisplayName, userUsername, setUserDisplayName, setUserUsername, resetPassword } = useAuth();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [timezone, setTimezone] = useState('Asia/Ho_Chi_Minh');
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

  useEffect(() => {
    if (!currentUser) return;
    const fetchProfile = async () => {
      try {
        const snap = await getDoc(doc(db, 'allowed_users', currentUser.email.toLowerCase()));
        if (snap.exists()) {
          const data = snap.data();
          setDisplayName(data.displayName || '');
          setUsername(data.username || '');
          setTimezone(data.timezone || 'Asia/Ho_Chi_Minh');
        }
      } catch (e) {
        setDisplayName(userDisplayName || '');
        setUsername(userUsername || '');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [currentUser]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!currentUser) return;
    const cleanUsername = username.trim().toLowerCase().replace(/\s+/g, '_');
    const cleanDisplayName = displayName.trim();
    if (cleanUsername && !/^[a-z0-9._-]+$/.test(cleanUsername)) {
      showMessage('Username can only contain letters, numbers, dots, underscores, and hyphens.', 'error');
      return;
    }
    setSaving(true);
    try {
      await setDoc(doc(db, 'allowed_users', currentUser.email.toLowerCase()), {
        displayName: cleanDisplayName,
        username: cleanUsername,
        timezone: timezone,
        role: userRole || 'student'
      }, { merge: true });
      setUserDisplayName(cleanDisplayName);
      setUserUsername(cleanUsername);
      setSaved(true);
      showMessage('Profile updated successfully!', 'success');
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      showMessage('Failed to save: ' + err.message, 'error');
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

  const avatarLetter = (displayName || username || currentUser?.email || '?')[0].toUpperCase();
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
          
          <main className="main-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', padding: '40px 24px', overflowY: 'auto' }}>
            
            {/* Centering wrapper */}
            <div style={{ width: '100%', maxWidth: '560px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              
              {/* Back Button */}
              <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} style={{ width: '100%', marginBottom: '24px' }}>
                <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary, #94a3b8)', textDecoration: 'none', fontSize: '14px', fontWeight: 500, transition: 'color 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'white'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary, #94a3b8)'}
                >
                  <ArrowLeft size={16} />
                  Back to Dashboard
                </Link>
              </motion.div>

              {loading ? (
                /* Shimmer Mockup Card */
                <div
                  style={{
                    width: '100%',
                    background: 'rgba(255,255,255,0.04)',
                    backdropFilter: 'blur(24px)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '24px',
                    overflow: 'hidden',
                    boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
                  }}
                >
                  {/* Shimmer Banner */}
                  <div className="shimmer-bg" style={{ height: '110px', position: 'relative' }} />

                  {/* Shimmer Avatar Row */}
                  <div style={{ padding: '0 32px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <div
                      className="shimmer-bg"
                      style={{
                        width: 72, height: 72, borderRadius: '50%',
                        border: '3px solid var(--bg-root, #0a0a12)',
                        marginTop: '-36px',
                        zIndex: 2,
                      }}
                    />
                    <div
                      className="shimmer-bg"
                      style={{
                        width: '100px',
                        height: '28px',
                        borderRadius: '20px',
                      }}
                    />
                  </div>

                  {/* Shimmer Content Form */}
                  <div style={{ padding: '0 32px 32px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* Header shimmer */}
                    <div style={{ marginBottom: '8px' }}>
                      <div className="shimmer-bg" style={{ width: '180px', height: '26px', borderRadius: '6px', marginBottom: '6px' }} />
                      <div className="shimmer-bg" style={{ width: '260px', height: '14px', borderRadius: '4px' }} />
                    </div>

                    {/* Display Name Input Shimmer */}
                    <div>
                      <div className="shimmer-bg" style={{ width: '90px', height: '14px', borderRadius: '4px', marginBottom: '8px' }} />
                      <div className="shimmer-bg" style={{ width: '100%', height: '46px', borderRadius: '12px' }} />
                    </div>

                    {/* Username Input Shimmer */}
                    <div>
                      <div className="shimmer-bg" style={{ width: '80px', height: '14px', borderRadius: '4px', marginBottom: '8px' }} />
                      <div className="shimmer-bg" style={{ width: '100%', height: '46px', borderRadius: '12px' }} />
                    </div>

                    {/* Timezone Input Shimmer */}
                    <div>
                      <div className="shimmer-bg" style={{ width: '120px', height: '14px', borderRadius: '4px', marginBottom: '8px' }} />
                      <div className="shimmer-bg" style={{ width: '100%', height: '46px', borderRadius: '12px' }} />
                    </div>

                    <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)' }} />

                    {/* Email Read-only Shimmer */}
                    <div>
                      <div className="shimmer-bg" style={{ width: '100px', height: '14px', borderRadius: '4px', marginBottom: '8px' }} />
                      <div className="shimmer-bg" style={{ width: '100%', height: '46px', borderRadius: '12px' }} />
                    </div>

                    {/* Role Read-only Shimmer */}
                    <div>
                      <div className="shimmer-bg" style={{ width: '90px', height: '14px', borderRadius: '4px', marginBottom: '8px' }} />
                      <div className="shimmer-bg" style={{ width: '100%', height: '46px', borderRadius: '12px' }} />
                    </div>

                    {/* Actions Shimmer */}
                    <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                      <div className="shimmer-bg" style={{ flex: 1, height: '46px', borderRadius: '12px' }} />
                      <div className="shimmer-bg" style={{ flex: 2, height: '46px', borderRadius: '12px' }} />
                    </div>
                  </div>
                </div>
              ) : (
                /* Actual Card Loaded */
                <motion.div
                  initial={{ opacity: 0, y: 30, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  style={{
                    width: '100%',
                    background: 'rgba(255,255,255,0.04)',
                    backdropFilter: 'blur(24px)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '24px', overflow: 'hidden',
                    boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
                  }}
                >
                  {/* Header Banner - Emerald/Indigo linear gradient */}
                  <div style={{ height: '110px', background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.35) 0%, rgba(99, 102, 241, 0.35) 100%)', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(255,255,255,0.015) 20px, rgba(255,255,255,0.015) 40px)' }} />
                  </div>

                  {/* Avatar Row */}
                  <div style={{ padding: '0 32px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 18 }}
                      style={{
                        width: 72, height: 72, borderRadius: '50%',
                        background: 'linear-gradient(135deg, #10b981, #6366f1)',
                        border: '3px solid var(--bg-root, #0a0a12)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '28px', fontWeight: 800, color: 'white',
                        boxShadow: '0 8px 24px rgba(99, 102, 241, 0.4)',
                        fontFamily: 'var(--font-family, Inter)',
                        marginTop: '-36px',
                        zIndex: 2,
                      }}
                    >
                      {avatarLetter}
                    </motion.div>
                    <div style={{
                      padding: '6px 14px',
                      background: roleStyle.bg,
                      border: `1px solid ${roleStyle.border}`,
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: 700,
                      color: roleStyle.color,
                      textTransform: 'capitalize',
                      letterSpacing: '0.3px',
                      backdropFilter: 'blur(8px)',
                      boxShadow: '0 2px 10px rgba(0,0,0,0.2)'
                    }}>
                      {roleLabel}
                    </div>
                  </div>

                  {/* Form */}
                  <form onSubmit={handleSave} style={{ padding: '0 32px 32px' }}>
                    <div style={{ marginBottom: '28px' }}>
                      <h1 style={{ margin: '0 0 4px', fontSize: '22px', fontWeight: 700, color: 'var(--text-primary, white)', fontFamily: 'var(--font-family)' }}>
                        {displayName || username || 'Your Profile'}
                      </h1>
                      <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary, #94a3b8)' }}>Manage your account display settings</p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                      {/* Display Name */}
                      <div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary, #94a3b8)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                          <Edit3 size={12} /> Display Name
                        </label>
                        <input
                          type="text"
                          value={displayName}
                          onChange={e => setDisplayName(e.target.value)}
                          placeholder="How should we call you?"
                          maxLength={60}
                          style={{ width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: '12px', color: 'var(--text-primary, white)', fontSize: '15px', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s, background 0.2s', fontFamily: 'inherit' }}
                          onFocus={e => { e.target.style.borderColor = 'rgba(139,92,246,0.5)'; e.target.style.background = 'rgba(255,255,255,0.07)'; }}
                          onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.10)'; e.target.style.background = 'rgba(255,255,255,0.05)'; }}
                        />
                        <p style={{ margin: '6px 0 0 4px', fontSize: '11px', color: 'var(--text-secondary, #94a3b8)', opacity: 0.7 }}>This name is shown in the app instead of your email.</p>
                      </div>

                      {/* Username */}
                      <div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary, #94a3b8)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                          <span style={{ fontWeight: 800, fontSize: '13px' }}>@</span> Username
                        </label>
                        <div style={{ position: 'relative' }}>
                          <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '15px', color: 'var(--text-secondary, #94a3b8)', fontWeight: 600, pointerEvents: 'none' }}>@</span>
                          <input
                            type="text"
                            value={username}
                            onChange={e => setUsername(e.target.value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9._-]/g, ''))}
                            placeholder="your.username"
                            maxLength={30}
                            style={{ width: '100%', padding: '12px 16px 12px 32px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: '12px', color: 'var(--text-primary, white)', fontSize: '15px', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s, background 0.2s', fontFamily: 'monospace', letterSpacing: '0.3px' }}
                            onFocus={e => { e.target.style.borderColor = 'rgba(139,92,246,0.5)'; e.target.style.background = 'rgba(255,255,255,0.07)'; }}
                            onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.10)'; e.target.style.background = 'rgba(255,255,255,0.05)'; }}
                          />
                        </div>
                        <p style={{ margin: '6px 0 0 4px', fontSize: '11px', color: 'var(--text-secondary, #94a3b8)', opacity: 0.7 }}>Letters, numbers, dots, underscores and hyphens only.</p>
                      </div>

                      {/* Timezone / Country */}
                      <div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary, #94a3b8)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                          <Globe size={12} /> Location &amp; Timezone
                        </label>
                        
                        {/* Custom Select Dropdown Container */}
                        <div ref={dropdownRef} style={{ position: 'relative' }}>
                          <button
                            type="button"
                            onClick={() => setDropdownOpen(!dropdownOpen)}
                            style={{
                              width: '100%',
                              padding: '12px 16px 12px 36px',
                              background: 'rgba(255,255,255,0.05)',
                              border: '1px solid rgba(255,255,255,0.10)',
                              borderRadius: '12px',
                              color: 'var(--text-primary, white)',
                              fontSize: '14px',
                              outline: 'none',
                              boxSizing: 'border-box',
                              transition: 'border-color 0.2s, background 0.2s',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              textAlign: 'left',
                              fontFamily: 'inherit'
                            }}
                            onFocus={e => { e.currentTarget.style.borderColor = 'rgba(139,92,246,0.5)'; e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; }}
                            onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                          >
                            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {currentSelectedTimezoneOption.label}
                            </span>
                            <span style={{ transition: 'transform 0.2s', transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', fontSize: '10px', color: 'var(--text-secondary, #94a3b8)', opacity: 0.8 }}>
                              ▼
                            </span>
                          </button>
                          
                          {/* Globe Icon */}
                          <Globe size={14} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary, #94a3b8)', pointerEvents: 'none', opacity: 0.6 }} />
                          
                          {/* Animated Dropdown Menu */}
                          <AnimatePresence>
                            {dropdownOpen && (
                              <motion.div
                                initial={{ opacity: 0, y: -10, scale: 0.98 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -10, scale: 0.98 }}
                                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                                style={{
                                  position: 'absolute',
                                  top: '100%',
                                  left: 0,
                                  right: 0,
                                  zIndex: 50,
                                  marginTop: '8px',
                                  background: 'rgba(15, 15, 25, 0.95)',
                                  backdropFilter: 'blur(30px)',
                                  border: '1px solid rgba(255, 255, 255, 0.08)',
                                  borderRadius: '12px',
                                  maxHeight: '220px',
                                  overflowY: 'auto',
                                  boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
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
                                      padding: '10px 16px',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      background: opt.value === timezone ? 'rgba(255,255,255,0.06)' : 'transparent',
                                      color: opt.value === timezone ? '#fff' : 'var(--text-secondary, #94a3b8)',
                                      transition: 'background 0.15s, color 0.15s',
                                      fontSize: '14px'
                                    }}
                                    onMouseEnter={e => {
                                      e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                                      e.currentTarget.style.color = '#fff';
                                    }}
                                    onMouseLeave={e => {
                                      e.currentTarget.style.background = opt.value === timezone ? 'rgba(255,255,255,0.06)' : 'transparent';
                                      e.currentTarget.style.color = opt.value === timezone ? '#fff' : 'var(--text-secondary, #94a3b8)';
                                    }}
                                  >
                                    <span>{opt.label}</span>
                                    {opt.value === timezone && <Check size={14} style={{ color: '#34d399' }} />}
                                  </div>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                        
                        <p style={{ margin: '6px 0 0 4px', fontSize: '11px', color: 'var(--text-secondary, #94a3b8)', opacity: 0.7 }}>
                          Used for scheduling email reminders in your local time.
                        </p>
                      </div>

                      <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)' }} />

                      {/* Email (read-only) */}
                      <div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary, #94a3b8)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                          <Mail size={12} /> Email Address
                        </label>
                        <div style={{
                          padding: '12px 16px',
                          background: 'rgba(15, 15, 25, 0.4)',
                          border: '1px solid rgba(255, 255, 255, 0.04)',
                          borderRadius: '12px',
                          color: 'rgba(255, 255, 255, 0.5)',
                          fontSize: '14px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.2)'
                        }}>
                          <Mail size={14} style={{ opacity: 0.4, flexShrink: 0 }} />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentUser?.email}</span>
                          <span style={{
                            marginLeft: 'auto',
                            flexShrink: 0,
                            fontSize: '10px',
                            fontWeight: 600,
                            padding: '2px 8px',
                            color: 'rgba(255, 255, 255, 0.4)',
                            background: 'rgba(255, 255, 255, 0.04)',
                            border: '1px solid rgba(255, 255, 255, 0.06)',
                            borderRadius: '6px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                          }}>
                            read-only
                          </span>
                        </div>
                      </div>

                      {/* Role (read-only) */}
                      <div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary, #94a3b8)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                          <Shield size={12} /> System Role
                        </label>
                        <div style={{
                          padding: '12px 16px',
                          background: 'rgba(15, 15, 25, 0.4)',
                          border: '1px solid rgba(255, 255, 255, 0.04)',
                          borderRadius: '12px',
                          fontSize: '14px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.2)'
                        }}>
                          <Shield size={14} style={{ color: roleStyle.color, opacity: 0.6 }} />
                          <span style={{ color: roleStyle.color, opacity: 0.8, fontWeight: 600, textTransform: 'capitalize' }}>{roleLabel}</span>
                          <span style={{
                            marginLeft: 'auto',
                            flexShrink: 0,
                            fontSize: '10px',
                            fontWeight: 600,
                            padding: '2px 8px',
                            color: 'rgba(255, 255, 255, 0.4)',
                            background: 'rgba(255, 255, 255, 0.04)',
                            border: '1px solid rgba(255, 255, 255, 0.06)',
                            borderRadius: '6px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                          }}>
                            read-only
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                        <button type="button" onClick={handleResetPassword}
                          style={{
                            flex: 1,
                            padding: '12px 16px',
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            borderRadius: '12px',
                            color: 'var(--text-secondary, #94a3b8)',
                            fontSize: '14px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            transition: 'all 0.25s',
                            fontFamily: 'inherit',
                            boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.07)';
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                            e.currentTarget.style.color = 'white';
                            e.currentTarget.style.transform = 'translateY(-1px)';
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                            e.currentTarget.style.color = 'var(--text-secondary, #94a3b8)';
                            e.currentTarget.style.transform = 'translateY(0)';
                          }}
                        >
                          <Key size={15} /> Reset Password
                        </button>

                        <motion.button type="submit" disabled={saving} whileTap={{ scale: 0.97 }}
                          style={{
                            flex: 2,
                            padding: '12px 24px',
                            border: 'none',
                            borderRadius: '12px',
                            color: 'white',
                            fontSize: '15px',
                            fontWeight: 700,
                            cursor: saving ? 'not-allowed' : 'pointer',
                            background: saved ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                            opacity: saving ? 0.7 : 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            boxShadow: saved ? '0 4px 20px rgba(16,185,129,0.4)' : '0 4px 20px rgba(139,92,246,0.3)',
                            transition: 'background 0.3s, opacity 0.2s, box-shadow 0.3s, transform 0.2s',
                            fontFamily: 'inherit',
                          }}
                          onMouseEnter={e => {
                            if (!saving) {
                              e.currentTarget.style.transform = 'translateY(-1px)';
                              e.currentTarget.style.boxShadow = saved ? '0 6px 24px rgba(16,185,129,0.5)' : '0 6px 24px rgba(139,92,246,0.4)';
                            }
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = saved ? '0 4px 20px rgba(16,185,129,0.4)' : '0 4px 20px rgba(139,92,246,0.3)';
                          }}
                        >
                          {saving ? (
                            <><span style={{ width: 15, height: 15, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.6s linear infinite', display: 'inline-block' }} /> Saving...</>
                          ) : saved ? (
                            <><Check size={16} /> Saved!</>
                          ) : (
                            <><Save size={15} /> Save Profile</>
                          )}
                        </motion.button>
                      </div>
                    </div>
                  </form>
                </motion.div>
              )}
              
            </div>
            
          </main>
        </div>
      </div>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input::placeholder { color: rgba(148,163,184,0.45); }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .shimmer-bg {
          background: linear-gradient(90deg, rgba(255, 255, 255, 0.03) 25%, rgba(255, 255, 255, 0.08) 37%, rgba(255, 255, 255, 0.03) 63%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite linear;
        }
      `}</style>
    </div>
  );
}
