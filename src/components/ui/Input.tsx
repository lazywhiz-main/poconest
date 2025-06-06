import React from 'react';

interface InputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  type?: string;
  error?: string;
  style?: React.CSSProperties;
  className?: string;
  disabled?: boolean;
  maxLength?: number;
}

const Input: React.FC<InputProps> = ({ value, onChange, placeholder, type = 'text', error, style, className, disabled, maxLength }) => {
  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    if (!error) {
      e.target.style.borderColor = '#00ff88';
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (!error) {
      e.target.style.borderColor = '#313244';
    }
  };

  return (
    <div style={{ width: '100%' }}>
      <input
        type={type}
        value={value}
        onChange={onChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        className={className}
        disabled={disabled}
        maxLength={maxLength}
        style={{
          width: '100%',
          background: '#0f0f23',
          border: `1px solid ${error ? '#ff6b6b' : '#313244'}`,
          borderRadius: 2,
          padding: '12px 16px',
          color: '#e2e8f0',
          fontSize: 13,
          fontFamily: 'inherit',
          outline: 'none',
          transition: 'all 0.2s',
          ...(error ? { borderColor: '#ff6b6b' } : {}),
          ...style,
        }}
      />
      {error && <div style={{ color: '#ff6b6b', fontSize: 12, marginTop: 4 }}>{error}</div>}
    </div>
  );
};

export default Input; 