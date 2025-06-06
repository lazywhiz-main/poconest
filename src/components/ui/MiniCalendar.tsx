import React, { useState } from 'react';

interface MiniCalendarProps {
  value: Date;
  onChange: (date: Date) => void;
  minDate?: Date;
  maxDate?: Date;
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getMonthMatrix(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const matrix: (Date | null)[][] = [];
  let week: (Date | null)[] = [];
  let dayOfWeek = (firstDay.getDay() + 6) % 7; // Monday=0
  for (let i = 0; i < dayOfWeek; i++) week.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) {
    week.push(new Date(year, month, d));
    if (week.length === 7) {
      matrix.push(week);
      week = [];
    }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null);
    matrix.push(week);
  }
  return matrix;
}

const MiniCalendar: React.FC<MiniCalendarProps> = ({ value, onChange, minDate, maxDate }) => {
  const [viewDate, setViewDate] = useState(new Date(value.getFullYear(), value.getMonth(), 1));
  const today = new Date();
  const matrix = getMonthMatrix(viewDate.getFullYear(), viewDate.getMonth());

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  const canSelect = (date: Date) => {
    if (minDate && date < minDate) return false;
    if (maxDate && date > maxDate) return false;
    return true;
  };

  return (
    <div style={{
      background: '#0f0f23',
      border: '1px solid #333366',
      borderRadius: 6,
      padding: 16,
      width: 280,
      minWidth: 280,
      maxWidth: 280,
      fontFamily: 'JetBrains Mono, monospace',
      color: '#e2e8f0',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingBottom: 8, borderBottom: '1px solid #333366' }}>
        <span style={{ color: '#00ff88', fontSize: 14, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>{viewDate.getFullYear()}.{String(viewDate.getMonth() + 1).padStart(2, '0')}</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={{ background: '#333366', border: '1px solid #45475a', borderRadius: 3, color: '#a6adc8', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 10 }} onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))}>‹</button>
          <button style={{ background: '#333366', border: '1px solid #45475a', borderRadius: 3, color: '#a6adc8', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 10 }} onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))}>›</button>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, width: '100%' }}>
        {WEEKDAYS.map((wd) => (
          <div key={wd} style={{ textAlign: 'center', fontSize: 10, color: '#6c7086', textTransform: 'uppercase', letterSpacing: 0.5, padding: 2, fontWeight: 600, background: '#1a1a2e', borderRadius: 2 }}>{wd}</div>
        ))}
        {matrix.flat().map((date, i) => {
          if (!date) return <div key={i} style={{ background: '#1a1a2e', borderRadius: 2 }} />;
          const isToday = isSameDay(date, today);
          const isSelected = isSameDay(date, value);
          const isOtherMonth = date.getMonth() !== viewDate.getMonth();
          return (
            <div
              key={i}
              style={{
                aspectRatio: '1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontWeight: 500,
                borderRadius: 2,
                cursor: canSelect(date) ? 'pointer' : 'not-allowed',
                background: isSelected ? '#64b5f6' : isToday ? '#00ff88' : '#1a1a2e',
                color: isSelected || isToday ? '#0f0f23' : isOtherMonth ? '#6c7086' : '#e2e8f0',
                opacity: isOtherMonth ? 0.5 : 1,
                border: isSelected ? '2px solid #00ff88' : 'none',
                transition: 'all 0.15s',
                minHeight: 32,
              }}
              onClick={() => canSelect(date) && onChange(date)}
            >
              {date.getDate()}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MiniCalendar; 