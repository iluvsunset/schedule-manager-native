import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ClassMembersView({ classes, selectedClassId }) {
  const selectedClass = classes.find(c => c.id === selectedClassId);

  if (!selectedClass) {
    return (
      <div className="content-panel" style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
        <h3>No Class Selected</h3>
        <p style={{ marginTop: '10px' }}>Please select a class from the top right menu to view its members.</p>
      </div>
    );
  }

  const participants = selectedClass.participants || [];

  return (
    <div className="content-panel" style={{ height: '100%', overflowY: 'auto' }}>
      <div className="panel-header" style={{ borderBottom: '1px solid var(--border-default)', paddingBottom: '16px', marginBottom: '16px' }}>
        <h2>{selectedClass.className} - Members</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
          {participants.length} participant{participants.length !== 1 ? 's' : ''} enrolled
        </p>
      </div>

      {participants.length === 0 ? (
        <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          No members found in this class.
        </div>
      ) : (
        <div className="scrollable-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          <AnimatePresence>
          {participants.map((email, idx) => (
            <motion.div 
              key={email}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1, transition: { duration: 0.3, ease: 'easeOut', delay: idx * 0.04 } }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.25, ease: 'easeIn' } }}
              className="list-item" style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: '16px', padding: '16px', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)' }}>
              <div 
                className="user-avatar" 
                style={{ width: '44px', height: '44px', fontSize: '18px', flexShrink: 0 }}
              >
                {email.charAt(0).toUpperCase()}
              </div>
              <div style={{ overflow: 'hidden', textAlign: 'left' }}>
                <div style={{ color: 'var(--text-primary)', fontWeight: '700', fontSize: '15px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '2px' }}>
                  {email.split('@')[0]}
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {email}
                </div>
              </div>
            </motion.div>
          ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
