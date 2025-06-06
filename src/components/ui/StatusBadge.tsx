import React from 'react';

interface StatusBadgeProps {
  children: React.ReactNode;
  status?: 'active' | 'warning' | 'error' | 'inactive';
  style?: React.CSSProperties;
}

const statusColors = {
  active: { background: '#00ff88', color: '#0f0f23' },
  warning: { background: '#ffa500', color: '#0f0f23' },
  error: { background: '#ff6b6b', color: '#fff' },
  inactive: { background: '#6c7086', color: '#fff' },
};

const StatusBadge: React.FC<StatusBadgeProps> = ({ children, status = 'inactive', style }) => {
  const colorStyle = statusColors[status] || statusColors.inactive;
  return (
    <span style={{
      padding: '2px 8px',
      borderRadius: 2,
      fontSize: 10,
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      ...colorStyle,
      ...style,
    }}>{children}</span>
  );
};

export default StatusBadge; 