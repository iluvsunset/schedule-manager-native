import React from 'react';

export default function StatsRow({ schedules }) {
  const now = new Date();
  
  const total = schedules.length;
  const live = schedules.filter(s => s.status === 'ongoing').length;
  const completed = schedules.filter(s => s.status === 'completed').length;
  const upcoming = schedules.filter(s => 
    s.status !== 'completed' && 
    s.status !== 'ongoing' && 
    s.date?.toDate() > now
  ).length;

  return (
    <div className="stats-row">
      <div className="stat-card">
        <div className="stat-label">Total Events</div>
        <div className="stat-value">{total}</div>
      </div>
      <div className="stat-card">
        <div className="stat-label">Live Now</div>
        <div className="stat-value" style={{color: 'var(--color-live)'}}>{live}</div>
      </div>
      <div className="stat-card">
        <div className="stat-label">Upcoming</div>
        <div className="stat-value" style={{color: 'var(--brand-primary)'}}>{upcoming}</div>
      </div>
      <div className="stat-card">
        <div className="stat-label">Completed</div>
        <div className="stat-value" style={{color: 'var(--color-success)'}}>{completed}</div>
      </div>
    </div>
  );
}
