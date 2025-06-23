import React from 'react';
import Icon from './Icon';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  type?: 'info' | 'warning' | 'danger';
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  open,
  title,
  message,
  confirmText = '実行',
  cancelText = 'キャンセル',
  onConfirm,
  onCancel,
  type = 'info'
}) => {
  if (!open) return null;

  const getTypeIcon = () => {
    switch (type) {
      case 'warning':
        return 'bell';
      case 'danger':
        return 'close';
      default:
        return 'settings';
    }
  };

  const getTypeColor = () => {
    switch (type) {
      case 'warning':
        return '#f59e0b';
      case 'danger':
        return '#ef4444';
      default:
        return '#00ff88';
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(15, 15, 35, 0.85)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      fontFamily: 'JetBrains Mono, monospace',
    }}>
      <div style={{
        background: '#1a1a2e',
        border: '1px solid #333366',
        borderRadius: '8px',
        width: '90%',
        maxWidth: '500px',
        overflow: 'hidden',
        animation: 'modalSlideIn 0.3s ease-out',
      }}>
        {/* ヘッダー */}
        <div style={{
          background: '#333366',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          borderBottom: '1px solid #45475a',
        }}>
          <div style={{
            color: getTypeColor(),
            marginRight: '12px',
            display: 'flex',
            alignItems: 'center',
          }}>
            <Icon name={getTypeIcon()} size={20} color={getTypeColor()} />
          </div>
          <span style={{
            fontSize: '14px',
            fontWeight: '600',
            color: '#e2e8f0',
            textTransform: 'uppercase',
            letterSpacing: '1px',
          }}>
            {title}
          </span>
        </div>

        {/* 本体 */}
        <div style={{
          padding: '24px 20px',
          background: '#1a1a2e',
        }}>
          <div style={{
            fontSize: '13px',
            color: '#a6adc8',
            lineHeight: '1.6',
            marginBottom: '24px',
            whiteSpace: 'pre-line',
          }}>
            {message}
          </div>

          <div style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end',
          }}>
            <button
              style={{
                background: '#0f0f23',
                border: '1px solid #333366',
                borderRadius: '4px',
                color: '#a6adc8',
                padding: '10px 20px',
                fontSize: '12px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                fontFamily: 'JetBrains Mono, monospace',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
              onClick={onCancel}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#333366';
                e.currentTarget.style.color = '#e2e8f0';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#0f0f23';
                e.currentTarget.style.color = '#a6adc8';
              }}
            >
              {cancelText}
            </button>

            <button
              style={{
                background: getTypeColor(),
                border: `1px solid ${getTypeColor()}`,
                borderRadius: '4px',
                color: '#0f0f23',
                padding: '10px 20px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                fontFamily: 'JetBrains Mono, monospace',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
              onClick={onConfirm}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.filter = 'brightness(1.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.filter = 'brightness(1)';
              }}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: translateY(-20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
};

export default ConfirmModal; 