import React, { useState } from 'react';
import { Monitor, Download, Check, Copy, ShieldAlert, ArrowRight } from 'lucide-react';

export default function BrowserDeprecation() {
  const [copied, setCopied] = useState(false);
  const command = 'xattr -d com.apple.quarantine "/Applications/Schedule Manager.app"';

  const handleCopy = () => {
    navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

        .deprecation-root {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          background: #080808;
          color: #F5F5F5;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          position: relative;
          overflow: hidden;
        }

        /* Ambient orbs */
        .orb-1 {
          position: absolute;
          width: 600px;
          height: 600px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(212, 175, 55, 0.06) 0%, transparent 70%);
          top: -100px;
          right: -100px;
          pointer-events: none;
        }

        .orb-2 {
          position: absolute;
          width: 500px;
          height: 500px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(255, 255, 255, 0.03) 0%, transparent 70%);
          bottom: -100px;
          left: -100px;
          pointer-events: none;
        }

        .card {
          position: relative;
          z-index: 2;
          width: 100%;
          max-width: 480px;
        }

        /* Top eyebrow badge */
        .badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          border-radius: 999px;
          padding: 6px 14px;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #F87171;
          margin-bottom: 32px;
        }

        .badge-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #EF4444;
          animation: pulse-dot 2s ease-in-out infinite;
        }

        @keyframes pulse-dot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }

        /* Headline */
        .headline {
          font-size: clamp(2rem, 6vw, 3.2rem);
          font-weight: 900;
          letter-spacing: -0.04em;
          line-height: 1.05;
          color: #FFFFFF;
          margin-bottom: 16px;
        }

        .headline span {
          color: #D4AF37;
        }

        .subtext {
          font-size: 15px;
          font-weight: 400;
          line-height: 1.65;
          color: #71717A;
          margin-bottom: 40px;
          max-width: 380px;
        }

        /* Divider */
        .divider {
          width: 100%;
          height: 1px;
          background: rgba(255, 255, 255, 0.06);
          margin-bottom: 32px;
        }

        /* Download section */
        .section-label {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #52525B;
          margin-bottom: 12px;
        }

        .download-btn {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          padding: 16px 20px;
          background: #D4AF37;
          color: #0A0A0A;
          border-radius: 14px;
          font-weight: 700;
          font-size: 15px;
          text-decoration: none;
          transition: all 0.2s ease;
          cursor: pointer;
          border: none;
          box-shadow: 0 8px 24px rgba(212, 175, 55, 0.25), 0 0 0 1px rgba(212, 175, 55, 0.15);
          letter-spacing: -0.01em;
          margin-bottom: 32px;
        }

        .download-btn:hover {
          background: #E8C547;
          transform: translateY(-1px);
          box-shadow: 0 12px 32px rgba(212, 175, 55, 0.35), 0 0 0 1px rgba(212, 175, 55, 0.2);
        }

        .download-btn:active {
          transform: translateY(0);
        }

        .btn-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .btn-icon-wrap {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          background: rgba(0, 0, 0, 0.12);
          border-radius: 8px;
          flex-shrink: 0;
        }

        /* Terminal block */
        .terminal-card {
          background: #0D0D0D;
          border: 1px solid rgba(255, 255, 255, 0.07);
          border-radius: 14px;
          overflow: hidden;
        }

        .terminal-header {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }

        .terminal-dots {
          display: flex;
          gap: 6px;
        }

        .dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
        }

        .dot-r { background: #FF5F57; }
        .dot-y { background: #FFBD2E; }
        .dot-g { background: #28C840; }

        .terminal-title {
          font-size: 11px;
          color: #52525B;
          font-weight: 500;
          margin-left: 4px;
        }

        .terminal-body {
          padding: 16px;
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }

        .terminal-prompt {
          color: #52525B;
          font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
          font-size: 12px;
          flex-shrink: 0;
          padding-top: 1px;
        }

        .terminal-code {
          font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
          font-size: 12px;
          color: #34D399;
          word-break: break-all;
          flex: 1;
          line-height: 1.5;
        }

        .copy-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          padding: 6px 12px;
          font-size: 11px;
          font-weight: 600;
          color: #A1A1AA;
          cursor: pointer;
          transition: all 0.2s;
          flex-shrink: 0;
          font-family: 'Inter', sans-serif;
          letter-spacing: 0.01em;
        }

        .copy-btn:hover {
          background: rgba(255, 255, 255, 0.08);
          color: #F4F4F5;
          border-color: rgba(255, 255, 255, 0.14);
        }

        .copy-btn.copied {
          background: rgba(52, 211, 153, 0.1);
          border-color: rgba(52, 211, 153, 0.2);
          color: #34D399;
        }

        .warning-row {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          background: rgba(245, 158, 11, 0.05);
          border-top: 1px solid rgba(255, 255, 255, 0.05);
        }

        .warning-text {
          font-size: 12px;
          color: #71717A;
          line-height: 1.5;
        }
      `}</style>

      <div className="deprecation-root">
        <div className="orb-1" />
        <div className="orb-2" />

        <div className="card">
          {/* Badge */}
          <div style={{ textAlign: 'center' }}>
            <div className="badge" style={{ margin: '0 auto 32px' }}>
              <span className="badge-dot" />
              Web version discontinued
            </div>
          </div>

          {/* Headline */}
          <h1 className="headline">
            Download the<br />
            <span>Desktop App</span>
          </h1>

          <p className="subtext">
            Schedule Manager has moved to native macOS. The web version is no longer supported — download the app for the full experience.
          </p>

          <div className="divider" />

          {/* Download CTA */}
          <div className="section-label">Step 1 — Get the app</div>
          <a
            className="download-btn"
            href="https://github.com/iluvsunset/schedule-manager-native/releases/latest"
            target="_blank"
            rel="noopener noreferrer"
          >
            <div className="btn-left">
              <div className="btn-icon-wrap">
                <Download size={16} />
              </div>
              Get Latest Release on GitHub
            </div>
            <ArrowRight size={18} />
          </a>

          {/* Terminal */}
          <div className="section-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldAlert size={12} style={{ color: '#F59E0B' }} />
            Step 2 — Bypass Gatekeeper
          </div>

          <div className="terminal-card">
            <div className="terminal-header">
              <div className="terminal-dots">
                <div className="dot dot-r" />
                <div className="dot dot-y" />
                <div className="dot dot-g" />
              </div>
              <span className="terminal-title">Terminal</span>
            </div>
            <div className="terminal-body">
              <span className="terminal-prompt">$</span>
              <code className="terminal-code">{command}</code>
              <button
                className={`copy-btn ${copied ? 'copied' : ''}`}
                onClick={handleCopy}
                title="Copy command"
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <div className="warning-row">
              <ShieldAlert size={12} style={{ color: '#F59E0B', flexShrink: 0 }} />
              <span className="warning-text">
                Paste this in Terminal after moving the app to your <strong style={{ color: '#A1A1AA' }}>/Applications</strong> folder, then relaunch.
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
