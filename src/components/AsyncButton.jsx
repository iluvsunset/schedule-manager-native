import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Check, X as XIcon } from 'lucide-react';

export default function AsyncButton({ 
  onClick, 
  type = "button", 
  className = "btn btn-primary btn-full", 
  style, 
  children,
  actionFn
}) {
  const [state, setState] = useState('idle'); // idle | loading | success | error

  const handleClick = async (e) => {
    if (onClick) onClick(e);
    if (!actionFn) return;
    
    e.preventDefault();
    if (state !== 'idle') return;
    
    setState('loading');
    try {
      await actionFn();
      setState('success');
      setTimeout(() => setState('idle'), 2000);
    } catch (err) {
      setState('error');
      setTimeout(() => setState('idle'), 2000);
    }
  };

  return (
    <motion.button
      type={actionFn ? "button" : type}
      className={className}
      style={{
        ...style,
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: state === 'success' ? 'var(--color-success)' : state === 'error' ? 'var(--color-error)' : undefined,
        borderColor: state === 'success' ? 'var(--color-success)' : state === 'error' ? 'var(--color-error)' : undefined,
      }}
      onClick={actionFn ? handleClick : onClick}
      disabled={state === 'loading'}
      animate={state === 'error' ? { x: [-10, 10, -10, 10, 0] } : {}}
      transition={{ duration: 0.4 }}
    >
      <AnimatePresence mode="wait">
        {state === 'idle' && (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {children}
          </motion.div>
        )}
        {state === 'loading' && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Loader2 className="spinner" size={18} style={{ animation: 'spin 1s linear infinite' }} />
          </motion.div>
        )}
        {state === 'success' && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Check size={18} />
          </motion.div>
        )}
        {state === 'error' && (
          <motion.div
            key="error"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <XIcon size={18} />
          </motion.div>
        )}
      </AnimatePresence>
      <style>{`
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </motion.button>
  );
}
