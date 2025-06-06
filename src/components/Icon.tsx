import React from 'react';

interface IconProps {
  name: string;
  size?: number;
  color?: string;
  style?: React.CSSProperties;
}

export const Icon: React.FC<IconProps> = ({ name, size = 24, color = 'currentColor', style = {} }) => {
  const getIconPath = (name: string) => {
    switch (name) {
      case 'dashboard':
        return (
          <path d="M3 12h18M3 6h18M3 18h18" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        );
      case 'nest':
        return (
          <path d="M12 2L2 7v10c0 5.55 3.84 9.74 9 11 5.16-1.26 9-5.45 9-11V7l-10-5z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        );
      case 'settings':
        return (
          <path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 6a6 6 0 1 1 0 12 6 6 0 0 1 0-12z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        );
      case 'plus':
        return (
          <g>
            <line x1="12" y1="5" x2="12" y2="19" strokeWidth="2" strokeLinecap="round" />
            <line x1="5" y1="12" x2="19" y2="12" strokeWidth="2" strokeLinecap="round" />
          </g>
        );
      default:
        return null;
    }
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      style={style}
      className="svg-icon"
    >
      {getIconPath(name)}
    </svg>
  );
}; 