import React from 'react';

interface SpinnerProps {
  size?: number; // px
  strokeWidth?: number;
  colorBg?: string;
  colorFg?: string;
  speed?: number; // 秒
  style?: React.CSSProperties;
}

/**
 * デザインシステム準拠の紫＋緑スピナー
 */
const Spinner: React.FC<SpinnerProps> = ({
  size = 40,
  strokeWidth = 5,
  colorBg = '#39396a',
  colorFg = '#00ff88',
  speed = 1.2,
  style = {},
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  return (
    <svg
      width={size}
      height={size}
      style={{ display: 'block', ...style }}
      viewBox={`0 0 ${size} ${size}`}
    >
      {/* 背景円 */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={colorBg}
        strokeWidth={strokeWidth}
        fill="none"
      />
      {/* 前景円（アニメーション） */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={colorFg}
        strokeWidth={strokeWidth}
        fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * 0.75}
        strokeLinecap="round"
        style={{
          transformOrigin: '50% 50%',
          animation: `spinner-rotate ${speed}s linear infinite`,
        }}
      />
      <style>{`
        @keyframes spinner-rotate {
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </svg>
  );
};

export default Spinner; 