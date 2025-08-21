import React, { useState, useRef, useEffect } from 'react';
import Icon from './Icon';

interface CustomDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  disabled?: boolean;
  style?: React.CSSProperties;
}

const CustomDropdown: React.FC<CustomDropdownProps> = ({
  value,
  onChange,
  options,
  placeholder = '選択してください',
  disabled = false,
  style = {}
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 外部クリックでドロップダウンを閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const selectedOption = options.find(option => option.value === value);

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <div 
      ref={dropdownRef}
      style={{
        position: 'relative',
        display: 'inline-block',
        ...style
      }}
    >
      <div
        onClick={handleToggle}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: disabled ? '#2a2a3e' : '#1a1a2e',
          color: disabled ? '#6c7086' : '#e2e8f0',
          border: '1px solid #333366',
          borderRadius: 4,
          padding: '8px 12px',
          fontSize: 12,
          cursor: disabled ? 'not-allowed' : 'pointer',
          minWidth: 120,
          transition: 'all 0.2s ease',
          opacity: disabled ? 0.6 : 1,
          ...(isOpen && !disabled && {
            borderColor: '#00ff88',
            boxShadow: '0 0 0 1px #00ff88'
          })
        }}
      >
        <span style={{ flex: 1 }}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <Icon 
          name="chevron-down" 
          size={12} 
          color={disabled ? '#6c7086' : '#e2e8f0'}
          style={{
            marginLeft: 8,
            transition: 'transform 0.2s ease',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)'
          }}
        />
      </div>

      {isOpen && !disabled && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            background: '#1a1a2e',
            border: '1px solid #333366',
            borderTop: 'none',
            borderRadius: '0 0 4px 4px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            zIndex: 1000,
            maxHeight: 200,
            overflowY: 'auto'
          }}
        >
          {options.map((option) => (
            <div
              key={option.value}
              onClick={() => handleSelect(option.value)}
              style={{
                padding: '10px 12px',
                cursor: 'pointer',
                fontSize: 12,
                color: option.value === value ? '#00ff88' : '#e2e8f0',
                background: option.value === value ? '#00ff8815' : 'transparent',
                borderBottom: '1px solid #333366',
                transition: 'all 0.15s ease',
                ...(option.value === value && {
                  fontWeight: 600
                })
              }}
              onMouseEnter={(e) => {
                if (option.value !== value) {
                  e.currentTarget.style.background = '#333366';
                }
              }}
              onMouseLeave={(e) => {
                if (option.value !== value) {
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              {option.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomDropdown;
