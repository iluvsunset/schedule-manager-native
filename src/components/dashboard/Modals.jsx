import React from 'react';

import { useState, useEffect } from 'react';
import AsyncButton from '../AsyncButton';
import DatePicker from '../ui/DatePicker';
import { getWebDomain } from '../../platform';
function ModalWrapper({ isOpen, onClose, children, maxWidth = '500px' }) {
  const [render, setRender] = useState(isOpen);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setRender(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setAnimate(true);
        });
      });
    } else {
      setAnimate(false);
    }
  }, [isOpen]);

  const handleTransitionEnd = (e) => {
    if (e.target.classList.contains('modal-wrapper') && !animate) {
      setRender(false);
    }
  };

  if (!render) return null;

  return (
    <div 
      className="modal-wrapper modal active" 
      onTransitionEnd={handleTransitionEnd}
      onClick={(e) => {
        if (e.target.classList.contains('modal-wrapper')) onClose();
      }}
      style={{
        opacity: animate ? 1 : 0,
        backdropFilter: animate ? 'blur(10px)' : 'blur(0px)',
        WebkitBackdropFilter: animate ? 'blur(10px)' : 'blur(0px)',
        transition: animate ? 'opacity 200ms ease, backdrop-filter 200ms ease' : 'opacity 180ms ease, backdrop-filter 180ms ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(4, 4, 6, 0.7)'
      }}
    >
      <div 
        className="modal-content"
        style={{ 
          maxWidth, 
          width: '100%',
          opacity: animate ? 1 : 0,
          transform: animate ? 'scale(1)' : 'scale(0.95)',
          transition: animate ? 'opacity 320ms ease, transform 320ms ease' : 'opacity 180ms ease, transform 180ms ease',
          willChange: 'transform, opacity'
        }}
        onClick={e => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

import { doc, getDoc, addDoc, updateDoc, deleteDoc, collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { showMessage, sendDynamicEmail, formatTime, formatDate, syncGcalBackground } from '../../utils/helpers';
import { useAuth } from '../../contexts/AuthContext';
import { openExternalUrl } from '../../platform';

import { AlertTriangle, Calendar, Clock, MapPin, FileText, Link, Zap, CheckCircle, Globe, Lock, X, Play, Edit3, Share2, Trash2, Send, Search } from 'lucide-react';

// ── CONFIRM MODAL ──────────────────────────────────────────────
export function ConfirmModal({ isOpen, message, onConfirm, onCancel }) {
  return (
    <ModalWrapper isOpen={isOpen} onClose={onCancel} maxWidth="400px">
      <div style={{ textAlign: 'center', padding: '32px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px', color: 'var(--color-warning)' }}>
          <AlertTriangle size={48} />
        </div>
        <h3 style={{ marginBottom: '24px', fontSize: '16px', fontWeight: 600 }}>{message}</h3>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button className="btn btn-secondary" onClick={onCancel} style={{ minWidth: '100px' }}>Cancel</button>
          <button className="btn btn-primary" onClick={onConfirm} style={{ minWidth: '100px', background: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}>Confirm</button>
        </div>
        </div>
      </ModalWrapper>
  );
}

// ── PROGRESS BAR ──────────────────────────────────────────────
export function ScrapeProgressBar({ isSearching, duration = 4500 }) {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('Connecting...');

  useEffect(() => {
    if (!isSearching) {
      setProgress(0);
      return;
    }

    setProgress(0);
    setStatus('Initializing secure browser...');

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min((elapsed / duration) * 100, 95); // Cap at 95% until complete
      setProgress(pct);

      if (pct < 25) {
        setStatus('Initializing secure browser...');
      } else if (pct < 55) {
        setStatus('Connecting to Google Maps...');
      } else if (pct < 85) {
        setStatus('Parsing place information and photos...');
      } else {
        setStatus('Compiling verified address details...');
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isSearching, duration]);

  if (!isSearching) return null;

  const secondsRemaining = Math.max(0, Math.ceil((duration - (progress / 100) * duration) / 1000));

  return (
    <div style={{
      width: '100%',
      padding: '16px',
      background: 'rgba(255, 255, 255, 0.02)',
      border: '1px solid rgba(255, 255, 255, 0.06)',
      borderRadius: '12px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      marginBottom: '16px',
      boxSizing: 'border-box'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px' }}>
        <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{status}</span>
        <span style={{ color: 'var(--brand-primary)', fontWeight: 600 }}>Est. {secondsRemaining}s remaining</span>
      </div>
      
      {/* Progress track */}
      <div style={{
        width: '100%',
        height: '6px',
        background: 'rgba(255, 255, 255, 0.04)',
        borderRadius: '3px',
        overflow: 'hidden',
        position: 'relative'
      }}>
        {/* Progress fill */}
        <div style={{
          width: `${progress}%`,
          height: '100%',
          background: 'linear-gradient(90deg, var(--brand-primary), #60A5FA)',
          borderRadius: '3px',
          transition: 'width 0.15s ease-out'
        }} />
      </div>
    </div>
  );
}

// ── DETAIL MODAL ──────────────────────────────────────────────
export function EventDetailModal({ 
  isOpen, 
  onClose, 
  schedule, 
  onStart, 
  onComplete, 
  onCancel, 
  onDelete, 
  onEdit, 
  onShare, 
  onSendReminder 
}) {
  const { canEditSchedule, canDeleteSchedule, userRole } = useAuth();
  const [imageUrl, setImageUrl] = useState(null);
  const [loadingImage, setLoadingImage] = useState(false);
  const [resolvedAddress, setResolvedAddress] = useState(null);
  const [placeInfo, setPlaceInfo] = useState({
    summary: '',
    rating: '',
    category: '',
    website: '',
    phone: '',
    images: [],
    latitude: null,
    longitude: null,
    aiSummary: null
  });

  // Filter out Gemini N/A placeholder responses
  const isBlankAiField = (text) => {
    if (!text) return true;
    const lower = text.toLowerCase();
    return lower.includes('not available') || lower.includes('not specified') || lower.includes('not provided') || lower.includes('no information') || lower.includes('from the provided details') || lower.includes('information is not');
  };

  const cleanAiSummary = (ai) => {
    if (!ai) return null;
    return {
      ...ai,
      openingHours: isBlankAiField(ai.openingHours) ? null : ai.openingHours,
      priceRange: isBlankAiField(ai.priceRange) ? null : ai.priceRange,
      goodFor: Array.isArray(ai.goodFor) ? ai.goodFor.filter(t => !isBlankAiField(t)) : [],
      specialFeatures: Array.isArray(ai.specialFeatures) ? ai.specialFeatures.filter(f => !isBlankAiField(f.text)) : []
    };
  };

  const getHighResUrl = (url) => {
    if (!url) return url;
    if (url.includes('googleusercontent.com')) {
      return url.replace(/=s\d+.*$/, '=s1200-k-no').replace(/=w\d+-h\d+.*$/, '=s1200-k-no');
    }
    return url;
  };

  useEffect(() => {
    if (!isOpen || !schedule) return;
    setImageUrl(schedule.placeImage || null);
    // If the stored location is a URL, fall back to null until resolved
    const storedLocation = schedule.location || '';
    const isStoredUrl = storedLocation.startsWith('http');
    setResolvedAddress(isStoredUrl ? null : (storedLocation || null));
    setPlaceInfo({
      summary: schedule.placeSummary || '',
      rating: schedule.placeRating || '',
      category: schedule.placeCategory || '',
      website: schedule.placeWebsite || '',
      phone: schedule.placePhone || '',
      images: schedule.placeImages || [],
      latitude: schedule.placeLatitude || null,
      longitude: schedule.placeLongitude || null,
      aiSummary: cleanAiSummary(schedule.placeAiSummary) || null
    });

    const hasImage = !!schedule.placeImage;
    const hasSummary = !!schedule.placeSummary;
    const hasValidLocation = storedLocation && storedLocation.trim().length > 3;

    if ((!hasImage || !hasSummary) && hasValidLocation) {
      setLoadingImage(true);
      const fetchPlaceImage = async () => {
        try {
          const response = await fetch('/api/places/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: storedLocation })
          });
          const data = await response.json();
          if (data.results && data.results.length > 0) {
            const firstResult = data.results[0];
            const resolvedAddr = firstResult.address && !firstResult.address.includes('not found') ? firstResult.address : null;
            setResolvedAddress(resolvedAddr);
            setImageUrl(firstResult.image || null);
            setPlaceInfo({
              summary: firstResult.summary || '',
              rating: firstResult.rating || '',
              category: firstResult.category || '',
              website: firstResult.website || '',
              phone: firstResult.phone || '',
              images: firstResult.images || [],
              latitude: firstResult.latitude || null,
              longitude: firstResult.longitude || null,
              aiSummary: cleanAiSummary(firstResult.aiSummary) || null
            });

             await updateDoc(doc(db, 'schedules', schedule.id), { 
               location: resolvedAddr || storedLocation,
               placeImage: firstResult.image || null,
               placeImages: firstResult.images || null,
               placeSummary: firstResult.summary || null,
               placeRating: firstResult.rating || null,
               placeCategory: firstResult.category || null,
               placeWebsite: firstResult.website || null,
               placePhone: firstResult.phone || null,
               placeLatitude: firstResult.latitude || null,
               placeLongitude: firstResult.longitude || null,
               placeAiSummary: firstResult.aiSummary || null
             });
          }
        } catch (err) {
          console.error("Failed to dynamically fetch place image:", err);
        } finally {
          setLoadingImage(false);
        }
      };
      fetchPlaceImage();
    }
  }, [isOpen, schedule]);

  if (!schedule) return null;
  const date = schedule.date ? (schedule.date.toDate ? schedule.date.toDate() : new Date(schedule.date)) : null;
  const dueDisplay = schedule.assignmentDue ? new Date(schedule.assignmentDue).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} maxWidth="750px">
        {imageUrl ? (
          <div style={{ position: 'relative', width: '100%', height: '140px', background: 'rgba(0,0,0,0.4)' }}>
            <img 
              src={getHighResUrl(imageUrl)} 
              referrerPolicy="no-referrer"
              alt={schedule.place} 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
              onError={() => setImageUrl(null)}
            />
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(15,15,15,0.95))'
            }} />
            
            <div style={{
              position: 'absolute',
              bottom: '16px',
              left: '24px',
              right: '24px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
            }}>
              <div>
                {placeInfo.category && (
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: 'var(--brand-primary)',
                    background: 'rgba(59, 130, 246, 0.15)',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    letterSpacing: '0.05em'
                  }}>
                    {placeInfo.category}
                  </span>
                )}
                <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'white', margin: '6px 0 0 0' }}>{schedule.place}</h2>
              </div>
              <button className="modal-close" onClick={onClose} style={{ color: 'white', background: 'rgba(0,0,0,0.4)', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer' }}>×</button>
            </div>
          </div>
        ) : (
          <div className="modal-header">
            <h3>{schedule.place}</h3>
            <button className="modal-close" onClick={onClose}>×</button>
          </div>
        )}

        <div className="modal-body" style={{ padding: '20px', paddingBottom: '16px' }}>
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
            
            {/* Left Column: Schedule info */}
            <div style={{ flex: '1.2', minWidth: '260px', display: 'flex', flexDirection: 'column', gap: '16px', position: 'sticky', top: 0, alignSelf: 'flex-start' }}>
              <div className="section-title" style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Time & Schedule</div>
              
              <div style={{ display: 'flex', gap: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', padding: '12px', borderRadius: '12px' }}>
                <div style={{ flex: 1, display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', color: 'var(--brand-primary)', flexShrink: 0, paddingLeft: '10px' }}>
                    <Calendar size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Date</div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'white' }}>{date ? date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : 'All Day'}</div>
                  </div>
                </div>

                <div style={{ flex: 1, display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', color: 'var(--color-success)', flexShrink: 0, paddingLeft: '10px' }}>
                    <Clock size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Time</div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'white' }}>
                      {date ? formatTime(date) : 'All Day'}
                      {schedule.endDate && ` - ${formatTime(schedule.endDate.toDate ? schedule.endDate.toDate() : new Date(schedule.endDate))}`}
                    </div>
                  </div>
                </div>
              </div>

              {schedule.notes && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div className="section-title" style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Notes</div>
                  <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', padding: '14px', borderRadius: '12px', color: 'var(--text-secondary)', fontSize: '13px', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                    {schedule.notes}
                  </div>
                </div>
              )}

              {schedule.assignmentTask && (
                <div style={{ border: '1px solid rgba(245, 158, 11, 0.2)', background: 'rgba(245, 158, 11, 0.02)', padding: '16px', borderRadius: '12px', display: 'flex', gap: '12px' }}>
                  <div style={{ color: 'var(--color-warning)', flexShrink: 0, marginTop: '2px' }}><Zap size={16} /></div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-warning)' }}>Assignment</div>
                    <div style={{ fontSize: '13px', color: 'white' }}>{schedule.assignmentTask}</div>
                    {dueDisplay && <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>Due Date: {dueDisplay}</div>}
                    {schedule.assignmentLink && (
                      <a 
                        href="#" 
                        onClick={(e) => {
                          e.preventDefault();
                          const targetUrl = schedule.assignmentLink.startsWith('http') ? schedule.assignmentLink : 'https://' + schedule.assignmentLink;
                          openExternalUrl(targetUrl);
                        }}
                        style={{ alignSelf: 'flex-start', marginTop: '6px', fontSize: '12px', color: 'var(--brand-primary)', fontWeight: 600 }}
                      >
                        Open Resources →
                      </a>
                    )}
                  </div>
                </div>
              )}

              {(schedule.reviewLearned || schedule.reviewNotes) && (
                <div style={{ border: '1px solid rgba(16, 185, 129, 0.2)', background: 'rgba(16, 185, 129, 0.02)', padding: '16px', borderRadius: '12px', display: 'flex', gap: '12px' }}>
                  <div style={{ color: 'var(--color-success)', flexShrink: 0, marginTop: '2px' }}><CheckCircle size={16} /></div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-success)' }}>Review & Progress</div>
                    {schedule.reviewLearned && <div style={{ fontSize: '13px', color: 'white' }}>{schedule.reviewLearned}</div>}
                    {schedule.reviewNotes && <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>"{schedule.reviewNotes}"</div>}
                  </div>
                </div>
              )}

              {/* Added Image in left column */}
              {imageUrl && (
                <div style={{ width: '100%', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)', flex: 1, minHeight: '180px', maxHeight: '300px', display: 'flex' }}>
                  <img 
                    src={getHighResUrl(imageUrl)} 
                    referrerPolicy="no-referrer"
                    alt={schedule.place}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
              )}
            </div>

            {/* Right Column: Google Places details */}
            <div style={{ flex: '1', minWidth: '280px', display: 'flex', flexDirection: 'column', gap: '12px', borderLeft: '1px solid rgba(255,255,255,0.06)', paddingLeft: '20px' }}>
              <div className="section-title" style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span>Place Intelligence Console</span>
                {placeInfo.rating && (
                  <span style={{ fontSize: '12px', color: '#FBBF24', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    ★ {placeInfo.rating}
                  </span>
                )}
              </div>

              {/* 1. Leaflet Interactive Dark Map with Card Overlay */}
              {placeInfo.latitude && placeInfo.longitude && (
                <div style={{ position: 'relative', width: '100%', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)', boxShadow: '0 8px 30px rgba(0,0,0,0.3)' }}>
                  <iframe 
                    title="map"
                    srcDoc={`
                      <!DOCTYPE html>
                      <html>
                      <head>
                        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
                        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
                        <style>
                          body, html, #map { margin: 0; padding: 0; width: 100%; height: 100%; background: #020617; }
                          .leaflet-marker-icon { filter: hue-rotate(140deg); }
                        </style>
                      </head>
                      <body>
                        <div id="map"></div>
                        <script>
                          const map = L.map('map', { zoomControl: false, attributionControl: false }).setView([${placeInfo.latitude}, ${placeInfo.longitude}], 17);
                          L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                            maxZoom: 20
                          }).addTo(map);
                          const icon = L.divIcon({
                            html: '<div style="width:14px;height:14px;background:#3B82F6;border:3px solid white;border-radius:50%;box-shadow:0 0 0 4px rgba(59,130,246,0.3)"></div>',
                            iconSize: [20, 20],
                            iconAnchor: [10, 10],
                            className: ''
                          });
                          L.marker([${placeInfo.latitude}, ${placeInfo.longitude}], { icon }).addTo(map);
                        </script>
                      </body>
                      </html>
                    `}
                    style={{ width: '100%', height: '150px', border: 'none', display: 'block' }}
                  />
                  {/* Map Expand Overlay Button */}
                  <button 
                    type="button"
                    onClick={() => openExternalUrl(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(schedule.place + ' ' + schedule.location)}`)}
                    style={{
                      position: 'absolute',
                      top: '12px',
                      right: '12px',
                      background: 'rgba(15, 23, 42, 0.75)',
                      backdropFilter: 'blur(8px)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '6px',
                      color: 'white',
                      fontSize: '10px',
                      fontWeight: 600,
                      padding: '4px 8px',
                      cursor: 'pointer',
                      zIndex: 1000
                    }}
                  >
                    Expand ↗
                  </button>
                  {/* Map info banner overlay */}
                  <div style={{
                    position: 'absolute',
                    bottom: '12px',
                    left: '12px',
                    right: '12px',
                    background: 'rgba(15, 23, 42, 0.85)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '10px',
                    padding: '8px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    zIndex: 1000
                  }}>
                    {imageUrl && (
                      <img src={imageUrl} alt="" style={{ width: '32px', height: '32px', borderRadius: '6px', objectFit: 'cover' }} />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: 'white', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {schedule.place}
                      </div>
                      <div style={{ fontSize: '9px', color: 'var(--text-secondary)', display: 'flex', gap: '6px' }}>
                        <span>★ {placeInfo.rating || '4.0'}</span>
                        <span>•</span>
                        <span>{placeInfo.category || 'Location'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. Photo Gallery / Cover Image */}
              {placeInfo.images && placeInfo.images.length > 0 ? (
                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '6px' }}>
                  {placeInfo.images.map((imgUrl, idx) => (
                    <img
                      key={idx}
                      src={imgUrl}
                      referrerPolicy="no-referrer"
                      alt={`Location view ${idx + 1}`}
                      style={{ width: '120px', height: '80px', objectFit: 'cover', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  ))}
                </div>
              ) : imageUrl && !loadingImage ? (
                /* Fallback: show the single cover image full-width */
                <div style={{ width: '100%', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <img
                    src={imageUrl}
                    referrerPolicy="no-referrer"
                    alt={schedule.place}
                    style={{ width: '100%', height: '140px', objectFit: 'cover', display: 'block' }}
                    onError={(e) => { e.target.parentElement.style.display = 'none'; }}
                  />
                </div>
              ) : null}

              {/* Loader placeholder */}
              {loadingImage && (
                <div className="shimmer-bg" style={{ height: '140px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Analyzing place details...</span>
                </div>
              )}

              {/* 3. ChatGPT-like Place Intelligence Summary */}
              {placeInfo.aiSummary && !loadingImage ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {/* Paragraph Summary introduction */}
                  <div style={{ fontSize: '13px', lineHeight: 1.6, color: '#f1f5f9', background: 'rgba(255, 255, 255, 0.01)', border: '1px solid rgba(255, 255, 255, 0.03)', padding: '12px 14px', borderRadius: '12px' }}>
                    {placeInfo.aiSummary.chatgptSummary}
                    {placeInfo.aiSummary.summarySource && (
                      <span style={{ 
                        fontSize: '9px', 
                        background: 'rgba(139, 92, 246, 0.15)', 
                        color: '#c084fc', 
                        padding: '2px 6px', 
                        borderRadius: '4px', 
                        marginLeft: '8px', 
                        fontWeight: 700,
                        textTransform: 'uppercase'
                      }}>
                        {placeInfo.aiSummary.summarySource}
                      </span>
                    )}
                  </div>

                  {/* Location Address */}
                  {resolvedAddress && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>📍 Location</div>
                      <div style={{ fontSize: '12px', color: '#cbd5e1', paddingLeft: '4px', lineHeight: 1.5 }}>
                        <strong>{schedule.place}</strong>
                        <br />
                        <span style={{ color: 'var(--text-secondary)' }}>{resolvedAddress}</span>
                      </div>
                    </div>
                  )}

                  {/* Special Features highlights */}
                  {placeInfo.aiSummary.specialFeatures && placeInfo.aiSummary.specialFeatures.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>🦖 What makes it special</div>
                      <ul style={{ paddingLeft: '16px', margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {placeInfo.aiSummary.specialFeatures.map((feat, idx) => (
                          <li key={idx} style={{ fontSize: '12px', color: '#e2e8f0', lineHeight: 1.5 }}>
                            {feat.text}
                            {feat.source && (
                              <span style={{ 
                                fontSize: '8px', 
                                background: 'rgba(255,255,255,0.06)', 
                                border: '1px solid rgba(255,255,255,0.08)',
                                color: 'var(--text-secondary)', 
                                padding: '1px 5px', 
                                borderRadius: '4px', 
                                marginLeft: '6px',
                                display: 'inline-block',
                                verticalAlign: 'middle'
                              }}>
                                {feat.source}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Opening Hours */}
                  {placeInfo.aiSummary.openingHours && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>⏰ Opening Hours</div>
                      <div style={{ fontSize: '12px', color: '#cbd5e1', paddingLeft: '4px' }}>
                        {placeInfo.aiSummary.openingHours}
                      </div>
                    </div>
                  )}

                  {/* Price */}
                  {placeInfo.aiSummary.priceRange && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>💰 Price Range</div>
                      <div style={{ fontSize: '12px', color: '#cbd5e1', paddingLeft: '4px', lineHeight: 1.4 }}>
                        {placeInfo.aiSummary.priceRange}
                      </div>
                    </div>
                  )}

                  {/* Good For Tags */}
                  {placeInfo.aiSummary.goodFor && placeInfo.aiSummary.goodFor.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Perfect if you want</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {placeInfo.aiSummary.goodFor.map((tag, idx) => (
                          <span key={idx} style={{ fontSize: '10px', background: 'rgba(16, 185, 129, 0.1)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.15)', padding: '3px 8px', borderRadius: '20px', fontWeight: 600 }}>
                            ✓ {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Fallback layout if AI summary is not generated yet (backward compatible) */
                !loadingImage && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {schedule.location && !schedule.location.includes('google.com/calendar/event') && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Verified Location</div>
                        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', padding: '14px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div style={{ display: 'flex', gap: '8px', color: 'white', fontSize: '13px', lineHeight: 1.5 }}>
                            <MapPin size={16} style={{ color: 'var(--brand-primary)', flexShrink: 0, marginTop: '2px' }} />
                            <span style={{ wordBreak: 'break-all' }}>{schedule.location}</span>
                          </div>
                          <a 
                            href="#" 
                            onClick={(e) => {
                              e.preventDefault();
                              const mapUrl = schedule.location.startsWith('http') ? schedule.location : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(schedule.place + ' ' + schedule.location)}`;
                              openExternalUrl(mapUrl);
                            }}
                            style={{ alignSelf: 'flex-start', fontSize: '12px', color: 'var(--brand-primary)', fontWeight: 600 }}
                          >
                            Open in Google Maps ↗
                          </a>
                        </div>
                      </div>
                    )}

                    {placeInfo.summary && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>About this Place</div>
                        <div style={{ fontStyle: 'italic', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', padding: '14px', borderRadius: '12px' }}>
                          "{placeInfo.summary}"
                        </div>
                      </div>
                    )}
                  </div>
                )
              )}

              {/* Website and Phone Actions (Always visible) */}
              {(placeInfo.website || placeInfo.phone) && !loadingImage && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
                  {placeInfo.website && (
                    <a 
                      href="#" 
                      onClick={(e) => {
                        e.preventDefault();
                        openExternalUrl(placeInfo.website);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        padding: '10px 16px',
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: '8px',
                        color: 'white',
                        fontSize: '13px',
                        fontWeight: 600,
                        textDecoration: 'none',
                        transition: 'background 0.2s',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                    >
                      <Globe size={14} /> Visit Website
                    </a>
                  )}
                  {placeInfo.phone && (
                    <a 
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        const cleanPhone = placeInfo.phone.replace(/[^\d+ ]/g, '').trim();
                        openExternalUrl(`tel:${cleanPhone}`);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        padding: '10px 16px',
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: '8px',
                        color: 'white',
                        fontSize: '13px',
                        fontWeight: 600,
                        textDecoration: 'none',
                        transition: 'background 0.2s',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                    >
                      <Send size={14} /> Call {placeInfo.phone.replace(/[^\d+ ]/g, '').trim()}
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 24px',
          background: 'rgba(255, 255, 255, 0.02)',
          borderTop: '1px solid var(--border-default)',
          borderBottomLeftRadius: 'var(--radius-lg)',
          borderBottomRightRadius: 'var(--radius-lg)',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            {canEditSchedule && canEditSchedule(schedule) && schedule.status !== 'completed' && schedule.status !== 'ongoing' && onStart && (
              <button
                className="btn btn-primary"
                onClick={() => {
                  onStart(schedule.id);
                  onClose();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'linear-gradient(135deg, #10B981, #059669)',
                  borderColor: '#10B981',
                  color: '#FFFFFF'
                }}
              >
                <Play size={14} fill="#FFFFFF" />
                Start Event
              </button>
            )}

            {canEditSchedule && canEditSchedule(schedule) && schedule.status === 'ongoing' && onComplete && (
              <button
                className="btn btn-primary"
                onClick={() => {
                  onComplete(schedule.id);
                  onClose();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'linear-gradient(135deg, #10B981, #059669)',
                  borderColor: '#10B981',
                  color: '#FFFFFF'
                }}
              >
                <CheckCircle size={14} fill="#FFFFFF" />
                Complete Event
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            {userRole !== 'student' && onSendReminder && (
              <button
                onClick={() => {
                  onSendReminder(schedule.id);
                }}
                title="Send Email Reminder"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  color: '#AEAEB2',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(59, 130, 246, 0.15)';
                  e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.3)';
                  e.currentTarget.style.color = '#3B82F6';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                  e.currentTarget.style.color = '#AEAEB2';
                  e.currentTarget.style.transform = 'none';
                }}
              >
                <Send size={14} />
              </button>
            )}

            {canEditSchedule && canEditSchedule(schedule) && onShare && (
              <button
                onClick={() => {
                  onShare(schedule);
                }}
                title="Share Event"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  color: '#AEAEB2',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                  e.currentTarget.style.color = '#FFFFFF';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                  e.currentTarget.style.color = '#AEAEB2';
                  e.currentTarget.style.transform = 'none';
                }}
              >
                <Share2 size={14} />
              </button>
            )}

            {canEditSchedule && canEditSchedule(schedule) && onEdit && (
              <button
                onClick={() => {
                  onEdit(schedule);
                }}
                title="Edit Event"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  color: '#AEAEB2',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                  e.currentTarget.style.color = '#FFFFFF';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                  e.currentTarget.style.color = '#AEAEB2';
                  e.currentTarget.style.transform = 'none';
                }}
              >
                <Edit3 size={14} />
              </button>
            )}

            {canEditSchedule && canEditSchedule(schedule) && schedule.status !== 'cancelled' && schedule.status !== 'completed' && onCancel && (
              <button
                onClick={() => {
                  onCancel(schedule.id);
                  onClose();
                }}
                title="Cancel Event"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'rgba(239, 68, 68, 0.06)',
                  border: '1px solid rgba(239, 68, 68, 0.15)',
                  color: '#EF4444',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
                  e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.06)';
                  e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.15)';
                  e.currentTarget.style.transform = 'none';
                }}
              >
                <X size={14} strokeWidth={2.5} />
              </button>
            )}

            {canDeleteSchedule && canDeleteSchedule(schedule) && onDelete && (
              <button
                onClick={() => {
                  onDelete(schedule.id);
                  onClose();
                }}
                title="Delete Event"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'rgba(239, 68, 68, 0.06)',
                  border: '1px solid rgba(239, 68, 68, 0.15)',
                  color: '#EF4444',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
                  e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.06)';
                  e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.15)';
                  e.currentTarget.style.transform = 'none';
                }}
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>
    </ModalWrapper>
  );
}

// ── CREATE EVENT MODAL ────────────────────────────────────────
export function CreateEventModal({ isOpen, onClose, selectedClassContext, schedules, currentUser }) {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [place, setPlace] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [confirmAction, setConfirmAction] = useState(null);
  const [placeImage, setPlaceImage] = useState(null);
  const [searchingMaps, setSearchingMaps] = useState(false);
  const [mapQuery, setMapQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  
  const [placeSummary, setPlaceSummary] = useState('');
  const [placeRating, setPlaceRating] = useState('');
  const [placeCategory, setPlaceCategory] = useState('');
  const [placeWebsite, setPlaceWebsite] = useState('');
  const [placePhone, setPlacePhone] = useState('');

  const [coords, setCoords] = useState(null);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [resolvingDetails, setResolvingDetails] = useState(false);

  const resolveFullPlaceDetails = async (res) => {
    setResolvingDetails(true);
    try {
      const response = await fetch('/api/places/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: `${res.title} ${res.address}`,
          lat: coords?.lat,
          lng: coords?.lng
        })
      });
      const data = await response.json();
      if (data.results && data.results.length > 0) {
        const fullRes = data.results[0];
        setPlace(fullRes.title);
        setLocation(fullRes.address);
        setPlaceImage(fullRes.image);
        setPlaceSummary(fullRes.summary || '');
        setPlaceRating(fullRes.rating || '');
        setPlaceCategory(fullRes.category || '');
        setPlaceWebsite(fullRes.website || '');
        setPlacePhone(fullRes.phone || '');
        showMessage('Full place details resolved!', 'success');
      } else {
        setPlace(res.title);
        setLocation(res.address);
        setPlaceImage(res.image);
        setPlaceSummary(res.summary || '');
        setPlaceRating(res.rating || '');
        setPlaceCategory(res.category || '');
        setPlaceWebsite(res.website || '');
        setPlacePhone(res.phone || '');
        showMessage('Location selected.', 'success');
      }
    } catch (err) {
      console.error(err);
      setPlace(res.title);
      setLocation(res.address);
      setPlaceImage(res.image);
      setPlaceSummary(res.summary || '');
      setPlaceRating(res.rating || '');
      setPlaceCategory(res.category || '');
      setPlaceWebsite(res.website || '');
      setPlacePhone(res.phone || '');
      showMessage('Location selected.', 'success');
    } finally {
      setResolvingDetails(false);
    }
  };

  const requestLocation = () => {
    if (!navigator.geolocation) {
      showMessage('Geolocation is not supported by your client.', 'info');
      return;
    }
    setLoadingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setLoadingLocation(false);
        showMessage('Current location acquired!', 'success');
      },
      (error) => {
        setLoadingLocation(false);
        console.warn("Geolocation permission error:", error);
        showMessage('Could not access location. Defaulting to HCMC center.', 'info');
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    if (isOpen) {
      requestLocation();
    }
  }, [isOpen]);

  const handleMapSearch = async () => {
    if (!mapQuery.trim()) return;
    setSearchingMaps(true);
    setSearchResults([]);
    try {
      const response = await fetch('/api/places/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: mapQuery,
          lat: coords?.lat,
          lng: coords?.lng
        })
      });
      const data = await response.json();
      if (data.error) {
        showMessage(data.message || data.error, 'error');
      } else {
        const results = data.results || [];
        setSearchResults(results);
        if (results.length === 1) {
          const item = results[0];
          setPlace(item.title);
          setLocation(item.address);
          setPlaceImage(item.image);
          setPlaceSummary(item.summary || '');
          setPlaceRating(item.rating || '');
          setPlaceCategory(item.category || '');
          setPlaceWebsite(item.website || '');
          setPlacePhone(item.phone || '');
          showMessage('Location loaded!', 'success');
        } else if (results.length > 1) {
          showMessage(`Found ${results.length} matches! Choose one from the list.`, 'success');
        } else {
          showMessage('No matches found on Google Maps.', 'info');
        }
      }
    } catch (err) {
      showMessage('Failed to connect to Google Maps: ' + err.message, 'error');
    } finally {
      setSearchingMaps(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedClassContext) {
      showMessage('Select a class context first!', 'error');
      return;
    }

    const dateTime = new Date(`${date}T${time || '00:00'}`);

    // Conflict check
    const conflict = schedules.find(s => {
      if (s.status === 'completed') return false;
      const d = s.date?.toDate ? s.date.toDate() : new Date(s.date);
      const sDate = d.toISOString().split('T')[0];
      const sTime = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
      return sDate === date && sTime === time && s.classId === selectedClassContext;
    });

    if (conflict) {
      setConfirmAction({
        message: `⚠️ Conflict: "${conflict.place}" at this time. Add anyway?`,
        onConfirm: async () => {
          setConfirmAction(null);
          await proceedCreate(dateTime);
        }
      });
      return;
    }

    await proceedCreate(dateTime);
  };

  const proceedCreate = async (dateTime) => {
    try {
      const classSnap = await getDoc(doc(db, 'classes', selectedClassContext));
      const allClassParticipants = classSnap.exists() ? (classSnap.data().participants || []) : [];
      const endDateTime = endTime ? new Date(`${date}T${endTime}`) : null;
      const scheduleData = {
        userId: currentUser.uid,
        userEmail: currentUser.email.toLowerCase(),
        classId: selectedClassContext,
        className: classSnap.exists() ? classSnap.data().className : '',
        date: Timestamp.fromDate(dateTime),
        endDate: endDateTime ? Timestamp.fromDate(endDateTime) : null,
        place,
        location,
        notes,
        placeImage: placeImage || null,
        placeSummary: placeSummary || null,
        placeRating: placeRating || null,
        placeCategory: placeCategory || null,
        placeWebsite: placeWebsite || null,
        placePhone: placePhone || null,
        participants: allClassParticipants,
        createdAt: Timestamp.now(),
        status: 'upcoming'
      };

      const docRef = await addDoc(collection(db, 'schedules'), scheduleData);
      syncGcalBackground(scheduleData, docRef.id, 'sync');

      // Send notifications to students
      const studentEmails = [];
      for (const email of allClassParticipants) {
        const uSnap = await getDoc(doc(db, 'allowed_users', email.toLowerCase()));
        if (uSnap.exists() && uSnap.data().role === 'student') {
          studentEmails.push(email);
        }
      }

      if (studentEmails.length > 0) {
        showMessage('Sending notifications...', 'success');
        const formattedDate = dateTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
        const formattedTime = time || 'All day';
        for (const email of studentEmails) {
          const emailData = { place, date: formattedDate, time: formattedTime, notes, link: getWebDomain() };
          await sendDynamicEmail(currentUser, email, email.split('@')[0], `New Event: ${place}`, emailData, 'schedule_created');
        }
      }

      setDate('');
      setTime('');
      setEndTime('');
      setPlace('');
      setLocation('');
      setNotes('');
      setPlaceImage(null);
      setMapQuery('');
      setSearchResults([]);
      setPlaceSummary('');
      setPlaceRating('');
      setPlaceCategory('');
      setPlaceWebsite('');
      setPlacePhone('');
      showMessage('Event created successfully!', 'success');
      onClose();
    } catch (err) {
      showMessage('Error creating event: ' + err.message, 'error');
    }
  };

  return (
    <>
      <ModalWrapper isOpen={isOpen} onClose={onClose} maxWidth="850px">
        <div className="modal-header">
          <h3>Create New Event</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', gap: '28px', flexWrap: 'wrap' }}>
            
            {/* Left Column: Form details */}
            <form onSubmit={handleSubmit} style={{ flex: '1.2', minWidth: '280px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', gap: '16px' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Date</label>
                  <DatePicker required value={date} onChange={setDate} />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Start Time</label>
                  <input type="time" value={time} onChange={e => setTime(e.target.value)} />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>End Time</label>
                  <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
                </div>
              </div>
              
              <div className="form-group">
                <label>Event Name / Title</label>
                <input type="text" placeholder="e.g. Mathematics 101" required value={place} onChange={e => setPlace(e.target.value)} />
              </div>

              <div className="form-group">
                <label>Location / Address</label>
                <input type="text" placeholder="Room number, Zoom link, or address" value={location} onChange={e => setLocation(e.target.value)} />
              </div>

              <div className="form-group">
                <label>Notes</label>
                <textarea rows="3" placeholder="Optional notes..." value={notes} onChange={e => setNotes(e.target.value)} style={{ resize: 'none' }}></textarea>
              </div>

              <AsyncButton actionFn={async () => {
                if(!date || !place) throw new Error('Missing fields');
                await handleSubmit({preventDefault: () => {}});
              }} className="btn btn-primary btn-full" style={{ marginTop: '8px' }}>Create Event</AsyncButton>
            </form>

            {/* Right Column: Google Maps Search */}
            <div style={{ flex: '1', minWidth: '280px', display: 'flex', flexDirection: 'column', gap: '16px', borderLeft: '1px solid rgba(255,255,255,0.06)', paddingLeft: '28px' }}>
              <div className="section-title" style={{ fontSize: '13px', color: 'var(--brand-primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Search size={14} /> Google Maps Places
              </div>

               {/* Map search input */}
               <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                 <div style={{ position: 'relative', flex: 1, display: 'flex' }}>
                   <input 
                     type="text" 
                     placeholder="Search place name..." 
                     value={mapQuery}
                     onChange={e => setMapQuery(e.target.value)}
                     onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleMapSearch(); } }}
                     style={{ flex: 1, paddingRight: '36px' }}
                   />
                   <button
                     type="button"
                     onClick={requestLocation}
                     disabled={loadingLocation}
                     title={coords ? "Location active - Click to refresh" : "Request location permission"}
                     style={{
                       position: 'absolute',
                       right: '8px',
                       top: '50%',
                       transform: 'translateY(-50%)',
                       background: 'none',
                       border: 'none',
                       color: coords ? 'var(--color-success)' : 'var(--text-secondary)',
                       cursor: 'pointer',
                       display: 'flex',
                       alignItems: 'center',
                       justifyContent: 'center',
                       opacity: loadingLocation ? 0.5 : 1,
                       transition: 'color 0.2s'
                     }}
                   >
                     <MapPin size={16} fill={coords ? 'rgba(16, 185, 129, 0.2)' : 'none'} style={{ animation: loadingLocation ? 'spin 1s linear infinite' : 'none' }} />
                   </button>
                 </div>
                 <button 
                   type="button" 
                   onClick={handleMapSearch}
                   disabled={searchingMaps}
                   style={{
                     padding: '0 16px',
                     background: 'rgba(255,255,255,0.05)',
                     border: '1px solid rgba(255,255,255,0.08)',
                     borderRadius: '8px',
                     color: 'white',
                     fontSize: '13px',
                     fontWeight: 600,
                     cursor: 'pointer'
                   }}
                >
                  {searchingMaps ? '...' : 'Search'}
                </button>
              </div>

               {/* Search Results list */}
               {searchResults.length > 0 && !resolvingDetails && (
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto', paddingRight: '4px' }}>
                   <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Select a Match:</div>
                   {searchResults.map((res, idx) => (
                     <div 
                       key={idx}
                        onClick={() => resolveFullPlaceDetails(res)}
                       style={{
                         padding: '10px',
                         background: 'rgba(255,255,255,0.02)',
                         border: '1px solid rgba(255,255,255,0.04)',
                         borderRadius: '8px',
                         cursor: 'pointer',
                         transition: 'all 0.2s',
                         display: 'flex',
                         gap: '10px',
                         alignItems: 'center'
                       }}
                       onMouseEnter={e => {
                         e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                         e.currentTarget.style.borderColor = 'var(--brand-primary)';
                       }}
                       onMouseLeave={e => {
                         e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                         e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)';
                       }}
                     >
                       {res.image && (
                         <img src={res.image} style={{ width: '40px', height: '40px', borderRadius: '4px', objectFit: 'cover' }} alt="" />
                       )}
                       <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, minWidth: 0 }}>
                         <div style={{ fontSize: '13px', fontWeight: 600, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{res.title}</div>
                         <div style={{ fontSize: '11px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{res.address}</div>
                       </div>
                     </div>
                   ))}
                 </div>
               )}
 
               <ScrapeProgressBar isSearching={searchingMaps || resolvingDetails} />

              {/* Selected Image Card */}
              {placeImage && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Selected Photo:</div>
                  <div style={{ position: 'relative', width: '100%', height: '140px', borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <img src={placeImage} referrerPolicy="no-referrer" alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={() => setPlaceImage(null)} />
                    <button 
                      type="button" 
                      onClick={() => setPlaceImage(null)}
                      style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        background: 'rgba(0,0,0,0.6)',
                        border: 'none',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer'
                      }}
                    >
                      <X size={10} />
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </ModalWrapper>
      <ConfirmModal
        isOpen={!!confirmAction}
        message={confirmAction?.message}
        onConfirm={confirmAction?.onConfirm}
        onCancel={() => setConfirmAction(null)}
      />
    </>
  );
}

// ── EDIT EVENT MODAL ──────────────────────────────────────────
export function EditEventModal({ isOpen, onClose, schedule }) {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [place, setPlace] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [assignmentTask, setAssignmentTask] = useState('');
  const [assignmentLink, setAssignmentLink] = useState('');
  const [assignmentDue, setAssignmentDue] = useState('');
  const [reviewLearned, setReviewLearned] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');
  const [placeImage, setPlaceImage] = useState(null);
  const [searchingMaps, setSearchingMaps] = useState(false);
  const [mapQuery, setMapQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  
  const [placeSummary, setPlaceSummary] = useState('');
  const [placeRating, setPlaceRating] = useState('');
  const [placeCategory, setPlaceCategory] = useState('');
  const [placeWebsite, setPlaceWebsite] = useState('');
  const [placePhone, setPlacePhone] = useState('');

  const [coords, setCoords] = useState(null);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [resolvingDetails, setResolvingDetails] = useState(false);

  const resolveFullPlaceDetails = async (res) => {
    setResolvingDetails(true);
    try {
      const response = await fetch('/api/places/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: `${res.title} ${res.address}`,
          lat: coords?.lat,
          lng: coords?.lng
        })
      });
      const data = await response.json();
      if (data.results && data.results.length > 0) {
        const fullRes = data.results[0];
        setPlace(fullRes.title);
        setLocation(fullRes.address);
        setPlaceImage(fullRes.image);
        setPlaceSummary(fullRes.summary || '');
        setPlaceRating(fullRes.rating || '');
        setPlaceCategory(fullRes.category || '');
        setPlaceWebsite(fullRes.website || '');
        setPlacePhone(fullRes.phone || '');
        showMessage('Full place details resolved!', 'success');
      } else {
        setPlace(res.title);
        setLocation(res.address);
        setPlaceImage(res.image);
        setPlaceSummary(res.summary || '');
        setPlaceRating(res.rating || '');
        setPlaceCategory(res.category || '');
        setPlaceWebsite(res.website || '');
        setPlacePhone(res.phone || '');
        showMessage('Location selected.', 'success');
      }
    } catch (err) {
      console.error(err);
      setPlace(res.title);
      setLocation(res.address);
      setPlaceImage(res.image);
      setPlaceSummary(res.summary || '');
      setPlaceRating(res.rating || '');
      setPlaceCategory(res.category || '');
      setPlaceWebsite(res.website || '');
      setPlacePhone(res.phone || '');
      showMessage('Location selected.', 'success');
    } finally {
      setResolvingDetails(false);
    }
  };

  const requestLocation = () => {
    if (!navigator.geolocation) {
      showMessage('Geolocation is not supported by your client.', 'info');
      return;
    }
    setLoadingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setLoadingLocation(false);
        showMessage('Current location acquired!', 'success');
      },
      (error) => {
        setLoadingLocation(false);
        console.warn("Geolocation permission error:", error);
        showMessage('Could not access location. Defaulting to HCMC center.', 'info');
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    if (isOpen) {
      requestLocation();
    }
  }, [isOpen]);

  useEffect(() => {
    if (schedule) {
      const d = schedule.date ? (schedule.date.toDate ? schedule.date.toDate() : new Date(schedule.date)) : new Date();
      const dateStr = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
      const timeStr = d.toTimeString().slice(0, 5);

      setDate(dateStr);
      setTime(timeStr);
      if (schedule.endDate) {
        const ed = schedule.endDate.toDate ? schedule.endDate.toDate() : new Date(schedule.endDate);
        setEndTime(ed.toTimeString().slice(0, 5));
      } else {
        setEndTime('');
      }
      setPlace(schedule.place || '');
      const loc = schedule.location || '';
      setLocation(loc.includes('google.com/calendar/event') ? '' : loc);
      setNotes(schedule.notes || '');
      setAssignmentTask(schedule.assignmentTask || '');
      setAssignmentLink(schedule.assignmentLink || '');
      setAssignmentDue(schedule.assignmentDue || '');
      setReviewLearned(schedule.reviewLearned || '');
      setReviewNotes(schedule.reviewNotes || '');
      setPlaceImage(schedule.placeImage || null);
      setMapQuery('');
      setSearchResults([]);
      setPlaceSummary(schedule.placeSummary || '');
      setPlaceRating(schedule.placeRating || '');
      setPlaceCategory(schedule.placeCategory || '');
      setPlaceWebsite(schedule.placeWebsite || '');
      setPlacePhone(schedule.placePhone || '');
    }
  }, [schedule, isOpen]);

  if (!schedule) return null;

  const handleMapSearch = async () => {
    if (!mapQuery.trim()) return;
    setSearchingMaps(true);
    setSearchResults([]);
    try {
      const response = await fetch('/api/places/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: mapQuery,
          lat: coords?.lat,
          lng: coords?.lng
        })
      });
      const data = await response.json();
      if (data.error) {
        showMessage(data.message || data.error, 'error');
      } else {
        const results = data.results || [];
        setSearchResults(results);
        if (results.length === 1) {
          const item = results[0];
          setPlace(item.title);
          setLocation(item.address);
          setPlaceImage(item.image);
          setPlaceSummary(item.summary || '');
          setPlaceRating(item.rating || '');
          setPlaceCategory(item.category || '');
          setPlaceWebsite(item.website || '');
          setPlacePhone(item.phone || '');
          showMessage('Location loaded!', 'success');
        } else if (results.length > 1) {
          showMessage(`Found ${results.length} matches! Choose one from the list.`, 'success');
        } else {
          showMessage('No matches found on Google Maps.', 'info');
        }
      }
    } catch (err) {
      showMessage('Failed to connect to Google Maps: ' + err.message, 'error');
    } finally {
      setSearchingMaps(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const dateTime = new Date(`${date}T${time}`);
      const endDateTime = endTime ? new Date(`${date}T${endTime}`) : null;
      const update = {
        place,
        location,
        notes,
        placeImage: placeImage || null,
        placeSummary: placeSummary || null,
        placeRating: placeRating || null,
        placeCategory: placeCategory || null,
        placeWebsite: placeWebsite || null,
        placePhone: placePhone || null,
        date: Timestamp.fromDate(dateTime),
        endDate: endDateTime ? Timestamp.fromDate(endDateTime) : null,
        assignmentTask: assignmentTask || null,
        assignmentLink: assignmentLink || null,
        assignmentDue: assignmentDue || null,
        reviewLearned: reviewLearned || null,
        reviewNotes: reviewNotes || null
      };

      await updateDoc(doc(db, 'schedules', schedule.id), update);
      syncGcalBackground({ ...schedule, ...update }, schedule.id, 'sync');
      showMessage('Event updated successfully!', 'success');
      onClose();
    } catch (err) {
      showMessage('Error saving changes: ' + err.message, 'error');
    }
  };

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} maxWidth="1050px">
        <div className="modal-header">
          <h3>Edit Event</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body" style={{ padding: '24px' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
            
            {/* Column 1: Details */}
            <div style={{ flex: '1.2', minWidth: '260px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="section-title" style={{ marginBottom: '4px', fontSize: '13px', color: 'var(--brand-primary)', fontWeight: 600 }}>Event Details</div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Date</label>
                  <DatePicker required value={date} onChange={setDate} />
                </div>
                <div className="form-group" style={{ width: '110px' }}>
                  <label>Start</label>
                  <input type="time" required value={time} onChange={e => setTime(e.target.value)} />
                </div>
                <div className="form-group" style={{ width: '110px' }}>
                  <label>End</label>
                  <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
                </div>
              </div>
              <div className="form-group">
                <label>Event Name</label>
                <input type="text" placeholder="Event name" required value={place} onChange={e => setPlace(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Location</label>
                <input type="text" placeholder="Location or URL" value={location} onChange={e => setLocation(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Notes</label>
                <textarea rows="3" placeholder="Notes..." value={notes} onChange={e => setNotes(e.target.value)} style={{ resize: 'none' }}></textarea>
              </div>
            </div>

            {/* Column 2: Google Maps Search */}
            <div style={{ flex: '1', minWidth: '260px', display: 'flex', flexDirection: 'column', gap: '14px', borderLeft: '1px solid rgba(255,255,255,0.06)', borderRight: '1px solid rgba(255,255,255,0.06)', paddingLeft: '24px', paddingRight: '24px' }}>
              <div className="section-title" style={{ marginBottom: '4px', fontSize: '13px', color: 'var(--brand-primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Search size={14} /> Google Maps
              </div>

              {/* Map search input */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 1, display: 'flex' }}>
                  <input 
                    type="text" 
                    placeholder="Search place name..." 
                    value={mapQuery}
                    onChange={e => setMapQuery(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleMapSearch(); } }}
                    style={{ flex: 1, paddingRight: '36px' }}
                  />
                  <button
                    type="button"
                    onClick={requestLocation}
                    disabled={loadingLocation}
                    title={coords ? "Location active - Click to refresh" : "Request location permission"}
                    style={{
                      position: 'absolute',
                      right: '8px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: coords ? 'var(--color-success)' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: loadingLocation ? 0.5 : 1,
                      transition: 'color 0.2s'
                    }}
                  >
                    <MapPin size={16} fill={coords ? 'rgba(16, 185, 129, 0.2)' : 'none'} style={{ animation: loadingLocation ? 'spin 1s linear infinite' : 'none' }} />
                  </button>
                </div>
                <button 
                  type="button" 
                  onClick={handleMapSearch}
                  disabled={searchingMaps}
                  style={{
                    padding: '0 12px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '8px',
                    color: 'white',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {searchingMaps ? '...' : 'Search'}
                </button>
              </div>

               {/* Search Results list */}
               {searchResults.length > 0 && !resolvingDetails && (
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto', paddingRight: '4px' }}>
                   {searchResults.map((res, idx) => (
                     <div 
                       key={idx}
                       onClick={() => resolveFullPlaceDetails(res)}
                       style={{
                         padding: '10px',
                         background: 'rgba(255,255,255,0.02)',
                         border: '1px solid rgba(255,255,255,0.04)',
                         borderRadius: '8px',
                         cursor: 'pointer',
                         transition: 'all 0.2s',
                         display: 'flex',
                         gap: '10px',
                         alignItems: 'center'
                       }}
                       onMouseEnter={e => {
                         e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                         e.currentTarget.style.borderColor = 'var(--brand-primary)';
                       }}
                       onMouseLeave={e => {
                         e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                         e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)';
                       }}
                     >
                       {res.image && (
                         <img src={res.image} style={{ width: '35px', height: '35px', borderRadius: '4px', objectFit: 'cover' }} alt="" />
                       )}
                       <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, minWidth: 0 }}>
                         <div style={{ fontSize: '12px', fontWeight: 600, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{res.title}</div>
                         <div style={{ fontSize: '10px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{res.address}</div>
                       </div>
                     </div>
                   ))}
                 </div>
               )}
 
               <ScrapeProgressBar isSearching={searchingMaps || resolvingDetails} />

              {/* Selected Image Card */}
              {placeImage && (
                <div style={{ position: 'relative', width: '100%', height: '120px', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <img src={placeImage} referrerPolicy="no-referrer" alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={() => setPlaceImage(null)} />
                  <button 
                    type="button" 
                    onClick={() => setPlaceImage(null)}
                    style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      background: 'rgba(0,0,0,0.6)',
                      border: 'none',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    <X size={10} />
                  </button>
                </div>
              )}
            </div>

            {/* Column 3: Tasks & Review */}
            <div style={{ flex: '1', minWidth: '260px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="section-title" style={{ marginBottom: '4px', fontSize: '13px', color: 'var(--color-warning)', fontWeight: 600 }}>Tasks & Review</div>
              <div className="form-group">
                <label>Assignment</label>
                <input type="text" placeholder="Task description" value={assignmentTask} onChange={e => setAssignmentTask(e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <input type="text" placeholder="Resource link" value={assignmentLink} onChange={e => setAssignmentLink(e.target.value)} />
                </div>
                <div className="form-group" style={{ width: assignmentDue ? '130px' : '40px', transition: 'width 200ms ease', flexShrink: 0 }}>
                  <DatePicker title="Due date" value={assignmentDue} onChange={setAssignmentDue} align="right" placeholder="" />
                </div>
              </div>
              <div style={{ borderTop: '1px solid var(--border-default)', paddingTop: '12px' }}>
                <div className="form-group">
                  <label style={{ color: 'var(--color-success)', marginBottom: '4px' }}>Review</label>
                  <textarea rows="2" placeholder="What was learned?" value={reviewLearned} onChange={e => setReviewLearned(e.target.value)}></textarea>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <textarea rows="2" placeholder="Additional review notes" value={reviewNotes} onChange={e => setReviewNotes(e.target.value)}></textarea>
                </div>
              </div>
            </div>

            <AsyncButton actionFn={async () => {
              if(!date || !time || !place) throw new Error('Missing fields');
              await handleSubmit({preventDefault: () => {}});
            }} className="btn btn-primary btn-full" style={{ width: '100%', marginTop: '12px' }}>Save Changes</AsyncButton>
          </form>
        </div>
      </ModalWrapper>
  );
}

// ── SHARE MODAL ───────────────────────────────────────────────
export function ShareModal({ isOpen, onClose, schedule, currentUser }) {
  const [emailInput, setEmailInput] = useState('');
  const [access, setAccess] = useState('restricted');
  const [expiration, setExpiration] = useState('');
  const [allowedEmails, setAllowedEmails] = useState([]);

  useEffect(() => {
    if (schedule && schedule.shareConfig) {
      const config = schedule.shareConfig;
      setAccess(config.isPublic ? 'public' : 'restricted');
      setAllowedEmails(config.allowedEmails || []);
      if (config.expiresAt) {
        const d = config.expiresAt.toDate ? config.expiresAt.toDate() : new Date(config.expiresAt);
        setExpiration(new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().slice(0, 16));
      } else {
        setExpiration('');
      }
    } else {
      setAccess('restricted');
      setAllowedEmails([]);
      setExpiration('');
    }
  }, [schedule, isOpen]);

  if (!schedule) return null;

  const saveConfig = async (updatedConfig) => {
    try {
      const newConfig = {
        isPublic: access === 'public',
        allowedEmails,
        expiresAt: expiration ? Timestamp.fromDate(new Date(expiration)) : null,
        ...updatedConfig
      };
      await updateDoc(doc(db, 'schedules', schedule.id), { shareConfig: newConfig });
      schedule.shareConfig = newConfig;
    } catch (err) {
      showMessage('Error saving share settings: ' + err.message, 'error');
    }
  };

  const handleAccessChange = async (val) => {
    setAccess(val);
    await saveConfig({ isPublic: val === 'public' });
  };

  const handleExpirationChange = async (val) => {
    setExpiration(val);
    const ts = val ? Timestamp.fromDate(new Date(val)) : null;
    await saveConfig({ expiresAt: ts });
  };

  const handleAddEmail = async () => {
    const email = emailInput.trim().toLowerCase();
    if (!email) return;
    if (allowedEmails.includes(email)) {
      setEmailInput('');
      return;
    }
    const newList = [...allowedEmails, email];
    setAllowedEmails(newList);
    setEmailInput('');
    await saveConfig({ allowedEmails: newList });
  };

  const handleRemoveEmail = async (email) => {
    const newList = allowedEmails.filter(e => e !== email);
    setAllowedEmails(newList);
    await saveConfig({ allowedEmails: newList });
  };

  const handleCopyLink = () => {
    const link = `${getWebDomain()}/share/${schedule.id}`;
    navigator.clipboard.writeText(link);
    showMessage('Sharing link copied to clipboard!', 'success');
  };

  const isPublic = access === 'public';
  const owner = schedule.userEmail || 'System';

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} maxWidth="480px">
        <div className="modal-header">
          <h3>Share "{schedule.place}"</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
            <input type="text" placeholder="Add people by email" value={emailInput} onChange={e => setEmailInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddEmail()} />
            <button className="btn btn-primary" onClick={handleAddEmail}>Invite</button>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <div className="form-group"><label>People with access</label></div>
            <div className="share-people-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '180px', overflowY: 'auto' }}>
              <div className="share-person" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div className="share-person-avatar" style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700 }}>
                  {owner[0].toUpperCase()}
                </div>
                <div className="share-person-name" style={{ fontSize: '13px' }}>
                  {owner} <span style={{ opacity: 0.5, fontSize: '11px' }}>(Owner)</span>
                </div>
              </div>

              {allowedEmails.map(email => (
                <div key={email} className="share-person" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div className="share-person-avatar" style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700 }}>
                      {email[0].toUpperCase()}
                    </div>
                    <div className="share-person-name" style={{ fontSize: '13px' }}>{email}</div>
                  </div>
                  <button className="btn-icon" onClick={() => handleRemoveEmail(email)} style={{ width: '24px', height: '24px' }}>
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <div className="form-group"><label>General Access</label></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className="share-person-avatar" style={{ width: '32px', height: '32px', borderRadius: '50%', background: isPublic ? 'var(--color-success-light)' : 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>
                {isPublic ? <Globe size={18} /> : <Lock size={18} />}
              </div>
              <div style={{ flex: 1 }}>
                <select value={access} onChange={e => handleAccessChange(e.target.value)} style={{ padding: '6px 12px' }}>
                  <option value="restricted">Restricted</option>
                  <option value="public">Anyone with the link</option>
                </select>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  {isPublic ? 'Anyone with the link can view this event details' : 'Only specific allowed emails can open this event link'}
                </div>
              </div>
            </div>
          </div>

          {isPublic && (
            <div style={{ marginBottom: '16px' }}>
              <div className="form-group">
                <label>Link Expiration</label>
                <input type="datetime-local" value={expiration} onChange={e => handleExpirationChange(e.target.value)} />
              </div>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={handleCopyLink}>Copy link</button>
          <button className="btn btn-primary" onClick={onClose}>Done</button>
        </div>
      </ModalWrapper>
  );
}

// ── GOOGLE SYNC PROMPT MODAL ──────────────────────────────────
export function GoogleSyncPromptModal({ isOpen, onClose, event, schedules }) {
  const [place, setPlace] = useState('');
  const [location, setLocation] = useState('');
  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => {
    if (event) {
      setPlace(event.place || '');
      const loc = event.location || '';
      setLocation(loc.includes('google.com/calendar/event') ? '' : loc);

      // Get autofill suggestions from other events in the same classroom
      const uniqueSuggestions = [];
      const seen = new Set();

      schedules.forEach((s) => {
        if (
          s.classId === event.classId &&
          s.place &&
          s.location &&
          !s.location.includes('google.com/calendar/event') &&
          s.id !== event.id
        ) {
          const key = `${s.place.trim()}-${s.location.trim()}`;
          if (!seen.has(key)) {
            seen.add(key);
            uniqueSuggestions.push({
              place: s.place.trim(),
              location: s.location.trim()
            });
          }
        }
      });

      setSuggestions(uniqueSuggestions);
    }
  }, [event, schedules, isOpen]);

  if (!event) return null;

  const date = event.date ? (event.date.toDate ? event.date.toDate() : new Date(event.date)) : null;

  const handleSave = async () => {
    try {
      await updateDoc(doc(db, 'schedules', event.id), {
        place: place.trim(),
        location: location.trim()
      });
      localStorage.setItem(`gcal_prompt_dismissed_${event.id}`, 'true');
      showMessage('Schedule updated successfully!', 'success');
      onClose();
    } catch (err) {
      showMessage('Error saving schedule: ' + err.message, 'error');
    }
  };

  const handleSkip = () => {
    localStorage.setItem(`gcal_prompt_dismissed_${event.id}`, 'true');
    onClose();
  };

  const selectSuggestion = (sug) => {
    setPlace(sug.place);
    setLocation(sug.location);
  };

  return (
    <ModalWrapper isOpen={isOpen} onClose={handleSkip} maxWidth="500px">
      <div className="modal-header">
        <h3>Google Sync - Specify Location</h3>
        <button className="modal-close" onClick={handleSkip}>×</button>
      </div>
      <div className="modal-body">
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: '1.4' }}>
          We detected an upcoming Google Calendar synced event: <strong>{event.place}</strong> on {date ? date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'unknown date'}.
        </p>

        <div className="form-group" style={{ marginBottom: '16px' }}>
          <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Event Name / Topic</label>
          <input 
            type="text" 
            placeholder="e.g. Mathematics 101" 
            value={place} 
            onChange={(e) => setPlace(e.target.value)} 
            style={{ width: '100%', marginTop: '4px' }}
          />
        </div>

        <div className="form-group" style={{ marginBottom: '16px' }}>
          <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Location / Map Link</label>
          <input 
            type="text" 
            placeholder="e.g. Room 101, Zoom link, or Google Maps URL" 
            value={location} 
            onChange={(e) => setLocation(e.target.value)} 
            style={{ width: '100%', marginTop: '4px' }}
          />
        </div>

        {suggestions.length > 0 && (
          <div style={{ marginTop: '20px', borderTop: '1px solid var(--border-default)', paddingTop: '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--brand-primary)', textTransform: 'uppercase', marginBottom: '8px' }}>
              Quick Fill from Classroom History
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '150px', overflowY: 'auto' }}>
              {suggestions.map((sug, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => selectSuggestion(sug)}
                  style={{
                    textAlign: 'left',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--border-default)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    cursor: 'pointer',
                    color: 'var(--text-primary)',
                    fontSize: '12px',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                    e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                    e.currentTarget.style.borderColor = 'var(--border-default)';
                  }}
                >
                  <div style={{ fontWeight: 600 }}>{sug.place}</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '11px', marginTop: '2px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    {sug.location}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="modal-footer" style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', padding: '16px 24px' }}>
        <button 
          className="btn btn-secondary" 
          onClick={handleSkip}
          style={{ minWidth: '80px' }}
        >
          Skip
        </button>
        <button 
          className="btn btn-primary" 
          onClick={handleSave}
          style={{ minWidth: '120px' }}
        >
          Save & Continue
        </button>
      </div>
    </ModalWrapper>
  );
}

export function SyncGCalModal({ isOpen, onClose, onConfirm, isSyncing }) {
  if (!isOpen) return null;
  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} maxWidth="400px">
      <div className="modal-header">
        <h3>Sync to Google Calendar</h3>
        <button className="modal-close" onClick={onClose} disabled={isSyncing}>×</button>
      </div>
      <div className="modal-body" style={{ padding: '24px 20px' }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.5, marginBottom: '24px' }}>
          You can sync all your internal class events directly to your Google Calendar, or you can completely remove all previously synced events.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button 
            className="btn btn-primary" 
            style={{ width: '100%', padding: '12px', justifyContent: 'center' }}
            onClick={() => onConfirm('sync')}
            disabled={isSyncing}
          >
            {isSyncing ? 'Processing...' : 'Sync Events to GCal'}
          </button>
          <button 
            className="btn btn-ghost" 
            style={{ width: '100%', padding: '12px', justifyContent: 'center', color: 'var(--color-error)' }}
            onClick={() => onConfirm('remove')}
            disabled={isSyncing}
          >
            Remove Synced Events
          </button>
          <button 
            className="btn btn-ghost" 
            style={{ width: '100%', padding: '12px', justifyContent: 'center' }}
            onClick={onClose}
            disabled={isSyncing}
          >
            Cancel
          </button>
        </div>
      </div>
    </ModalWrapper>
  );
}

