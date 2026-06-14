import React, { useState, useEffect } from 'react';
import { syncManager } from '../firebase';

/**
 * SyncStatusIndicator
 * Shows a small pill in the corner indicating sync status:
 * - Green dot + "Synced" when online
 * - Orange dot + "Syncing..." when reconnecting
 * - Red dot + "Offline" when disconnected (changes queued locally)
 */
export default function SyncStatusIndicator() {
  const [status, setStatus] = useState(navigator.onLine ? 'online' : 'offline');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const unsub = syncManager.onSyncEvent((event) => {
      setStatus(event);
      setVisible(true);

      // Auto-hide after 3 seconds for 'synced' and 'online'
      if (event === 'synced' || event === 'online') {
        setTimeout(() => setVisible(false), 3000);
      }
    });

    return unsub;
  }, []);

  // Always show when offline
  useEffect(() => {
    if (status === 'offline') {
      setVisible(true);
    }
  }, [status]);

  if (!visible) return null;

  const config = {
    online: { color: '#34D399', bg: 'rgba(52, 211, 153, 0.15)', label: 'Online' },
    offline: { color: '#F87171', bg: 'rgba(248, 113, 113, 0.15)', label: 'Offline - Changes saved locally' },
    synced: { color: '#34D399', bg: 'rgba(52, 211, 153, 0.15)', label: 'Synced ✓' },
  };

  const { color, bg, label } = config[status] || config.online;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 80,
        right: 16,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 14px',
        borderRadius: 20,
        background: bg,
        backdropFilter: 'blur(10px)',
        border: `1px solid ${color}33`,
        fontSize: 12,
        fontWeight: 600,
        color: color,
        transition: 'all 0.3s ease',
        animation: 'syncFadeIn 0.3s ease',
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: color,
          animation: status === 'offline' ? 'syncPulse 2s infinite' : 'none',
        }}
      />
      {label}
      <style>{`
        @keyframes syncFadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes syncPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
