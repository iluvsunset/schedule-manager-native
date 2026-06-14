import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { showMessage } from '../../utils/helpers';
import { Search, LogOut, Key } from 'lucide-react';

export default function Topbar({ 
  searchTerm = '', 
  onSearchChange = () => {}, 
  classes = [], 
  selectedClassId = '', 
  onSelectClass = () => {} 
}) {
  const { currentUser, userRole, logout, resetPassword } = useAuth();
  
  const handleResetPassword = async () => {
    try {
      await resetPassword(currentUser.email);
      showMessage('Password setup link sent to your email!', 'success');
    } catch (error) {
      showMessage(error.message, 'error');
    }
  };

  const showClassSelector = ['it', 'academic_coordinator', 'teacher'].includes(userRole) && classes && classes.length > 0;

  return (
    <header className="topbar">
      <div className="topbar-brand">
        <div className="brand-mark" style={{ background: 'transparent' }}>
          <img src="/favicon.svg" alt="Chronos Logo" style={{ width: 24, height: 24, borderRadius: 6, objectFit: 'cover' }} />
        </div>
        <h1 style={{ fontFamily: 'var(--font-family)', fontWeight: 700 }}>Chronos</h1>
      </div>

      <div className="topbar-actions">
        {showClassSelector && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Class Context:</span>
            <select 
              value={selectedClassId} 
              onChange={(e) => onSelectClass(e.target.value)}
              style={{ 
                padding: '6px 12px', 
                background: 'rgba(255,255,255,0.03)', 
                border: '1px solid var(--border-default)', 
                borderRadius: 'var(--radius-sm)',
                color: 'white',
                fontSize: '13px',
                width: 'auto'
              }}
            >
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.className}</option>
              ))}
            </select>
          </div>
        )}

        {userRole === 'student' && classes && classes.length > 0 && (
          <div className="student-classes-indicator" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginRight: '4px' }}>My Class:</span>
            {classes.map(c => (
              <span 
                key={c.id} 
                style={{ 
                  padding: '4px 10px', 
                  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)', 
                  border: '1px solid rgba(139, 92, 246, 0.25)', 
                  borderRadius: 'var(--radius-full)', 
                  fontSize: '12px', 
                  fontWeight: 600, 
                  color: 'var(--brand-primary-hover)',
                  textShadow: '0 0 10px rgba(96, 165, 250, 0.3)'
                }}
              >
                {c.className}
              </span>
            ))}
          </div>
        )}

        <div className="topbar-search">
          <span className="search-icon">
            <Search size={16} />
          </span>
          <input 
            type="text" 
            placeholder="Search events..." 
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        <div className="user-menu" id="userMenuBtn">
          <div className="user-info">
            <div className="user-email" style={{ fontSize: '13px' }}>{currentUser?.email}</div>
            <div className={`user-role badge badge-${userRole}`}>{userRole?.replace('_', ' ')}</div>
          </div>
          <div className="user-avatar">{currentUser?.email?.[0].toUpperCase()}</div>
        </div>

        <button onClick={handleResetPassword} className="btn btn-ghost" title="Set/Reset Password">
          <Key size={18} />
        </button>

        <button onClick={logout} className="btn btn-ghost" title="Sign Out">
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
