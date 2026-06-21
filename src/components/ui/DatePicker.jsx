import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function DatePicker({ value, onChange, required, title, align = 'left' }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Parse value (YYYY-MM-DD) or use current date
  const initialDate = value ? new Date(value + 'T12:00:00') : new Date();
  const [currentMonth, setCurrentMonth] = useState(initialDate);

  useEffect(() => {
    if (value) {
      setCurrentMonth(new Date(value + 'T12:00:00'));
    }
  }, [value]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();

  const handlePrevMonth = (e) => {
    e.preventDefault();
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = (e) => {
    e.preventDefault();
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleSelectDate = (day) => {
    const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    // Format to YYYY-MM-DD
    const yyyy = newDate.getFullYear();
    const mm = String(newDate.getMonth() + 1).padStart(2, '0');
    const dd = String(newDate.getDate()).padStart(2, '0');
    onChange(`${yyyy}-${mm}-${dd}`);
    setIsOpen(false);
  };

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const dayNames = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  // Generate calendar grid
  const days = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(<div key={`empty-${i}`} className="cal-day empty"></div>);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    const isSelected = value && new Date(value + 'T12:00:00').getDate() === i && new Date(value + 'T12:00:00').getMonth() === currentMonth.getMonth() && new Date(value + 'T12:00:00').getFullYear() === currentMonth.getFullYear();
    const isToday = new Date().getDate() === i && new Date().getMonth() === currentMonth.getMonth() && new Date().getFullYear() === currentMonth.getFullYear();
    
    days.push(
      <button 
        key={`day-${i}`} 
        className={`cal-day ${isSelected ? 'selected' : ''} ${isToday && !isSelected ? 'today' : ''}`}
        onClick={(e) => { e.preventDefault(); handleSelectDate(i); }}
      >
        {i}
      </button>
    );
  }

  // Display format
  const displayValue = value ? new Date(value + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';

  return (
    <div className="custom-datepicker" ref={containerRef}>
      <div 
        className={`datepicker-input ${isOpen ? 'active' : ''}`} 
        onClick={() => setIsOpen(!isOpen)}
        title={title}
      >
        <Calendar size={18} className="dp-icon" />
        <span className={displayValue ? 'dp-value' : 'dp-placeholder'}>
          {displayValue || 'Select date...'}
        </span>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            className={`datepicker-popover ${align === 'right' ? 'align-right' : ''}`}
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
          >
            <div className="cal-header">
              <button className="cal-nav" onClick={handlePrevMonth}><ChevronLeft size={16} /></button>
              <div className="cal-title">{monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}</div>
              <button className="cal-nav" onClick={handleNextMonth}><ChevronRight size={16} /></button>
            </div>
            
            <div className="cal-grid">
              {dayNames.map(d => <div key={d} className="cal-day-name">{d}</div>)}
              {days}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
