import React, { useState } from 'react';
import { Monitor, AlertTriangle, Terminal, Download, Check, Copy, ShieldAlert } from 'lucide-react';

export default function BrowserDeprecation() {
  const [copied, setCopied] = useState(false);
  const command = 'xattr -d com.apple.quarantine "/Applications/Schedule Manager.app"';

  const handleCopy = () => {
    navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      background: '#0B0B0C',
      color: '#F4F4F5',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background Glow */}
      <div style={{
        position: 'absolute',
        width: '500px',
        height: '500px',
        background: 'radial-gradient(circle, rgba(59, 130, 246, 0.08) 0%, rgba(0,0,0,0) 70%)',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
        zIndex: 1
      }} />

      <div style={{
        background: 'rgba(24, 24, 27, 0.75)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '24px',
        padding: '40px 32px',
        maxWidth: '520px',
        width: '100%',
        boxShadow: '0 24px 48px -12px rgba(0, 0, 0, 0.5)',
        textAlign: 'center',
        position: 'relative',
        zIndex: 2
      }}>
        {/* Warning Icon */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '64px',
          height: '64px',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          borderRadius: '16px',
          color: '#EF4444',
          marginBottom: '24px'
        }}>
          <Monitor size={32} />
        </div>

        <h1 style={{
          fontSize: '24px',
          fontWeight: 800,
          letterSpacing: '-0.02em',
          marginBottom: '12px',
          color: '#F4F4F5'
        }}>
          Web Client Deprecated
        </h1>

        <p style={{
          color: '#A1A1AA',
          fontSize: '14px',
          lineHeight: '1.6',
          marginBottom: '32px'
        }}>
          The web version of **Schedule Manager** is no longer supported. Please download the native macOS Desktop application to manage and access your class schedules.
        </p>

        {/* Download Section */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          borderRadius: '16px',
          padding: '20px',
          marginBottom: '28px',
          textAlign: 'left'
        }}>
          <h3 style={{
            fontSize: '13px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: '#71717A',
            marginBottom: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <Download size={14} /> Download Desktop App
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <a 
              href="https://github.com/iluvsunset/schedule/releases/latest" 
              target="_blank" 
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                background: '#3B82F6',
                color: '#FFFFFF',
                borderRadius: '10px',
                fontWeight: 600,
                fontSize: '14px',
                textDecoration: 'none',
                transition: 'all 0.2s',
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.2)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.filter = 'brightness(1.1)'}
              onMouseLeave={(e) => e.currentTarget.style.filter = 'brightness(1.0)'}
            >
              <span>Get Latest Release (GitHub)</span>
              <Download size={16} />
            </a>
          </div>
        </div>

        {/* macOS Security Instructions */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          borderRadius: '16px',
          padding: '20px',
          textAlign: 'left'
        }}>
          <h3 style={{
            fontSize: '13px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: '#71717A',
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <ShieldAlert size={14} style={{ color: '#F59E0B' }} /> macOS Security Warning
          </h3>
          
          <p style={{
            color: '#A1A1AA',
            fontSize: '13px',
            lineHeight: '1.5',
            marginBottom: '14px'
          }}>
            Since this app is self-signed, macOS Gatekeeper might show an error (e.g. <em>"App is damaged"</em> or blocked). You can fix this instantly by removing the quarantine flag:
          </p>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#09090B',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '8px',
            padding: '10px 12px',
            gap: '12px'
          }}>
            <code style={{
              fontFamily: 'SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace',
              fontSize: '11px',
              color: '#34D399',
              overflowX: 'auto',
              whiteSpace: 'nowrap',
              flex: 1
            }}>
              xattr -d com.apple.quarantine ...
            </code>
            <button 
              onClick={handleCopy}
              style={{
                background: 'transparent',
                border: 'none',
                color: copied ? '#34D399' : '#A1A1AA',
                cursor: 'pointer',
                padding: '4px',
                display: 'inline-flex',
                alignItems: 'center',
                transition: 'color 0.2s'
              }}
              title="Copy Command"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </button>
          </div>
          
          <div style={{
            fontSize: '11px',
            color: '#71717A',
            marginTop: '8px',
            fontStyle: 'italic'
          }}>
            Copy and paste the full command in Terminal, then relaunch the application.
          </div>
        </div>
      </div>
    </div>
  );
}
