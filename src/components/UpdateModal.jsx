import React, { useState, useEffect } from 'react';
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowRight, Download, RefreshCw, X } from 'lucide-react';
import { showMessage } from '../utils/helpers';

export default function UpdateModal() {
  const [updateInfo, setUpdateInfo] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState('idle'); // 'idle', 'downloading', 'completed', 'error'
  const [progress, setProgress] = useState(0); // 0 to 100
  const [bytesDownloaded, setBytesDownloaded] = useState(0);
  const [totalBytes, setTotalBytes] = useState(0);

  useEffect(() => {
    // Silently check for updates on startup
    const checkUpdates = async () => {
      try {
        console.log('Silently checking for updates...');
        const update = await check();
        if (update) {
          console.log(`Update available: version ${update.version}`);
          setUpdateInfo(update);
          setIsOpen(true);
        } else {
          console.log('No updates found.');
          // Fallback to mock update in dev mode for simulation
          if (import.meta.env.DEV) {
            console.log('Simulating update in development mode...');
            setUpdateInfo({
              isMock: true,
              version: '0.1.2',
              currentVersion: '0.1.1',
              body: 'Added integrated Profile Settings page, user-custom timezone selectors, location-based cron reminders, custom glassmorphic dropdown list options, and fluid shimmer loading animations.'
            });
            setIsOpen(true);
          }
        }
      } catch (err) {
        console.error('Failed to check for updates:', err);
        // Fallback to mock update in dev mode on error
        if (import.meta.env.DEV) {
          console.log('Simulating update in development mode due to error...');
          setUpdateInfo({
            isMock: true,
            version: '0.1.2',
            currentVersion: '0.1.1',
            body: 'Added integrated Profile Settings page, user-custom timezone selectors, location-based cron reminders, custom glassmorphic dropdown list options, and fluid shimmer loading animations.'
          });
          setIsOpen(true);
        }
      }
    };

    // Delay the check slightly so it doesn't block critical startup rendering
    const timer = setTimeout(checkUpdates, 3000);
    return () => clearTimeout(timer);
  }, []);

  if (!isOpen || !updateInfo) return null;

  const handleUpdate = async () => {
    setStatus('downloading');
    setProgress(0);
    setBytesDownloaded(0);

    if (updateInfo.isMock) {
      const total = 12.4 * 1024 * 1024; // 12.4 MB mock size
      setTotalBytes(total);
      
      let downloadedSum = 0;
      const interval = setInterval(() => {
        const chunk = Math.floor(Math.random() * (800 - 200) + 200) * 1024;
        downloadedSum = Math.min(downloadedSum + chunk, total);
        setBytesDownloaded(downloadedSum);
        
        const percent = Math.min(Math.round((downloadedSum / total) * 100), 100);
        setProgress(percent);
        
        if (downloadedSum >= total) {
          clearInterval(interval);
          setStatus('completed');
        }
      }, 150);
      return;
    }

    let downloadedSum = 0;
    try {
      await updateInfo.downloadAndInstall((event) => {
        switch (event.event) {
          case 'Started':
            if (event.data?.contentLength) {
              setTotalBytes(event.data.contentLength);
            }
            break;
          case 'Progress':
            if (event.data?.chunkLength) {
              downloadedSum += event.data.chunkLength;
              setBytesDownloaded(downloadedSum);
              
              if (event.data?.contentLength) {
                const percent = Math.min(Math.round((downloadedSum / event.data.contentLength) * 100), 100);
                setProgress(percent);
              } else if (totalBytes > 0) {
                const percent = Math.min(Math.round((downloadedSum / totalBytes) * 100), 100);
                setProgress(percent);
              }
            }
            break;
          case 'Finished':
            setStatus('completed');
            setProgress(100);
            break;
        }
      });
    } catch (err) {
      console.error('Update failed:', err);
      setStatus('error');
      showMessage('Update failed: ' + err.message, 'error');
    }
  };

  const handleRelaunch = async () => {
    try {
      if (updateInfo.isMock) {
        console.log('Simulated restart!');
        setIsOpen(false);
        setStatus('idle');
        setProgress(0);
        setBytesDownloaded(0);
        showMessage('Simulated application update/restart successfully!', 'success');
        return;
      }
      await relaunch();
    } catch (err) {
      console.error('Relaunch failed:', err);
      showMessage('Failed to restart app. Please restart it manually.', 'error');
    }
  };

  const formatMB = (bytes) => {
    if (!bytes) return '0 MB';
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <AnimatePresence>
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        fontFamily: "'Inter', -apple-system, sans-serif"
      }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.4 }}
          style={{
            background: 'rgba(28, 28, 30, 0.85)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '460px',
            boxShadow: '0 24px 60px rgba(0, 0, 0, 0.6)',
            padding: '28px 24px',
            color: '#F2F2F7',
            position: 'relative'
          }}
        >
          {/* Close button - only allowed if not currently downloading/installing */}
          {status !== 'downloading' && (
            <button
              onClick={() => setIsOpen(false)}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: 'transparent',
                border: 'none',
                color: '#8E8E93',
                cursor: 'pointer',
                padding: '4px',
                display: 'inline-flex',
                alignItems: 'center',
                transition: 'color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#FFFFFF'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#8E8E93'}
            >
              <X size={18} />
            </button>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '40px',
              height: '40px',
              background: 'rgba(10, 132, 255, 0.12)',
              border: '1px solid rgba(10, 132, 255, 0.24)',
              borderRadius: '10px',
              color: '#0A84FF'
            }}>
              <Sparkles size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700 }}>Update Available</h3>
              <p style={{ margin: 0, fontSize: '12px', color: '#8E8E93', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>v{updateInfo.currentVersion}</span>
                <ArrowRight size={10} />
                <span style={{ color: '#30D158', fontWeight: 600 }}>v{updateInfo.version}</span>
              </p>
            </div>
          </div>

          {status === 'idle' && (
            <>
              {/* Release Notes */}
              <div style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '12px',
                padding: '14px 16px',
                fontSize: '13px',
                lineHeight: '1.5',
                color: '#E5E5EA',
                maxHeight: '160px',
                overflowY: 'auto',
                marginBottom: '24px'
              }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#8E8E93', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Release Notes</h4>
                {updateInfo.body ? (
                  <div style={{ whiteSpace: 'pre-wrap' }}>{updateInfo.body}</div>
                ) : (
                  <div style={{ fontStyle: 'italic', color: '#8E8E93' }}>No release notes provided.</div>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => setIsOpen(false)}
                  style={{
                    flex: 1,
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '10px',
                    padding: '11px',
                    color: '#F2F2F7',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                >
                  Later
                </button>
                <button
                  onClick={handleUpdate}
                  style={{
                    flex: 2,
                    background: '#0A84FF',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '11px',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'filter 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.filter = 'brightness(1.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.filter = 'brightness(1.0)'}
                >
                  <Download size={14} /> Update Now
                </button>
              </div>
            </>
          )}

          {status === 'downloading' && (
            <div style={{ textAlign: 'center', padding: '10px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#AEAEB2', marginBottom: '8px' }}>
                <span>Downloading update...</span>
                <span>{progress}%</span>
              </div>
              
              {/* Progress track */}
              <div style={{
                height: '6px',
                background: 'rgba(255,255,255,0.08)',
                borderRadius: '3px',
                overflow: 'hidden',
                marginBottom: '10px'
              }}>
                <div style={{
                  height: '100%',
                  background: '#0A84FF',
                  width: `${progress}%`,
                  transition: 'width 0.2s ease-out'
                }} />
              </div>

              <div style={{ fontSize: '12px', color: '#8E8E93', textAlign: 'left' }}>
                {totalBytes > 0 ? (
                  <span>{formatMB(bytesDownloaded)} of {formatMB(totalBytes)}</span>
                ) : (
                  <span>Downloading...</span>
                )}
              </div>
            </div>
          )}

          {status === 'completed' && (
            <div style={{ textAlign: 'center', padding: '10px 0' }}>
              <p style={{ margin: '0 0 20px 0', fontSize: '14px', color: '#30D158', fontWeight: 500 }}>
                Update downloaded and ready to install!
              </p>
              <button
                onClick={handleRelaunch}
                style={{
                  width: '100%',
                  background: '#30D158',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '12px',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'filter 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.filter = 'brightness(1.1)'}
                onMouseLeave={(e) => e.currentTarget.style.filter = 'brightness(1.0)'}
              >
                <RefreshCw size={14} /> Restart and Install
              </button>
            </div>
          )}

          {status === 'error' && (
            <div style={{ textAlign: 'center', padding: '10px 0' }}>
              <p style={{ margin: '0 0 20px 0', fontSize: '14px', color: '#FF453A' }}>
                An error occurred during download/installation.
              </p>
              <button
                onClick={() => setStatus('idle')}
                style={{
                  width: '100%',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '10px',
                  padding: '12px',
                  color: '#F2F2F7',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Try Again
              </button>
            </div>
          )}

        </motion.div>
      </div>
    </AnimatePresence>
  );
}
