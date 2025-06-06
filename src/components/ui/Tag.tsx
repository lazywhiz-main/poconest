import React from 'react';

interface TagProps {
  children: React.ReactNode;
  color?: string;
  variant?: 'primary' | 'secondary' | 'normal';
  style?: React.CSSProperties;
}

const Tag: React.FC<TagProps> = ({ children, color, variant = 'normal', style }) => {
  let bg = '#333366', fg = '#a6adc8';
  if (variant === 'primary') { bg = '#00ff88'; fg = '#0f0f23'; }
  if (variant === 'secondary') { bg = '#ff6b6b'; fg = '#fff'; }
  if (color) { bg = color; }
  return (
    <span style={{
      background: bg,
      color: fg,
      padding: '2px 6px',
      borderRadius: 2,
      fontSize: 10,
      fontWeight: 500,
      textTransform: 'uppercase',
      marginRight: 4,
      ...style,
    }}>{children}</span>
  );
};

export default Tag; 