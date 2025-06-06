import React from 'react';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  style?: React.CSSProperties;
}

const EmptyState: React.FC<EmptyStateProps> = ({ title, description, icon, style }) => {
  return (
    <div style={{ textAlign: 'center', padding: '48px 0', color: '#757575', ...style }}>
      {icon && <div style={{ fontSize: 40, marginBottom: 16 }}>{icon}</div>}
      <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>{title}</div>
      {description && <div style={{ fontSize: 14, color: '#9e9e9e' }}>{description}</div>}
    </div>
  );
};

export default EmptyState; 